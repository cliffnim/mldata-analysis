import dns from 'node:dns/promises';
import http from 'node:http';
import https from 'node:https';
import net from 'node:net';
import type { IncomingHttpHeaders, IncomingMessage } from 'node:http';

const MAX_RESPONSE_BYTES = 2 * 1024 * 1024;
const MAX_REDIRECTS = 5;
const REQUEST_TIMEOUT_MS = 15_000;

export class UrlFetchError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.name = 'UrlFetchError';
    this.statusCode = statusCode;
  }
}

type ResolvedAddress = { address: string; family: number };
type PageResponse = {
  statusCode: number;
  headers: IncomingHttpHeaders;
  body: AsyncIterable<Uint8Array>;
  destroy: () => void;
};

export type UrlFetchDependencies = {
  resolve: (hostname: string) => Promise<ResolvedAddress[]>;
  request: (url: URL, address: ResolvedAddress, signal: AbortSignal) => Promise<PageResponse>;
  timeoutMs?: number;
};

const inIpv4Range = (address: string, first: number, second: number, secondMask: number) => {
  const parts = address.split('.').map(Number);
  return parts[0] === first && (parts[1] & secondMask) === second;
};

export function isPrivateIp(ip: string): boolean {
  const family = net.isIP(ip);
  if (family === 4) {
    const parts = ip.split('.').map(Number);
    return parts[0] === 0 || parts[0] === 10 || parts[0] === 127 ||
      (parts[0] === 169 && parts[1] === 254) ||
      (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) ||
      (parts[0] === 192 && parts[1] === 168) ||
      inIpv4Range(ip, 100, 64, 192) ||
      (parts[0] === 192 && parts[1] === 0 && parts[2] === 0) ||
      (parts[0] === 192 && parts[1] === 0 && parts[2] === 2) ||
      (parts[0] === 192 && parts[1] === 88 && parts[2] === 99) ||
      (parts[0] === 198 && (parts[1] === 18 || parts[1] === 19)) ||
      (parts[0] === 198 && parts[1] === 51 && parts[2] === 100) ||
      (parts[0] === 203 && parts[1] === 0 && parts[2] === 113) ||
      parts[0] >= 224;
  }

  if (family !== 6) return true;
  const lower = ip.toLowerCase();
  const mappedIpv4 = lower.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mappedIpv4) return isPrivateIp(mappedIpv4[1]);

  const mappedHex = lower.match(/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/);
  if (mappedHex) {
    const high = parseInt(mappedHex[1], 16);
    const low = parseInt(mappedHex[2], 16);
    return isPrivateIp(`${high >> 8}.${high & 255}.${low >> 8}.${low & 255}`);
  }

  const firstGroup = parseInt(lower.split(':')[0] || '0', 16);
  const secondGroup = parseInt(lower.split(':')[1] || '0', 16);
  return lower === '::' || lower === '::1' ||
    (firstGroup & 0xfe00) === 0xfc00 ||
    (firstGroup & 0xffc0) === 0xfe80 ||
    (firstGroup & 0xff00) === 0xff00 ||
    (firstGroup & 0xe000) !== 0x2000 ||
    (firstGroup === 0x2001 && secondGroup <= 0x01ff) ||
    (firstGroup === 0x2001 && secondGroup === 0x0db8);
}

function hostnameForLookup(url: URL): string {
  return url.hostname.replace(/^\[|\]$/g, '');
}

async function resolvePublicUrl(rawUrl: string, resolve: UrlFetchDependencies['resolve']) {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new UrlFetchError('Enter a valid URL.');
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new UrlFetchError('Only HTTP and HTTPS URLs are supported.');
  }
  if (url.username || url.password) {
    throw new UrlFetchError('URLs containing a username or password are not allowed.');
  }

  const hostname = hostnameForLookup(url);
  if (!hostname || hostname.toLowerCase() === 'localhost') {
    throw new UrlFetchError('Localhost is not allowed.');
  }

  const literalFamily = net.isIP(hostname);
  let addresses: ResolvedAddress[];
  try {
    addresses = literalFamily
      ? [{ address: hostname, family: literalFamily }]
      : await resolve(hostname);
  } catch {
    throw new UrlFetchError('The website host could not be resolved.');
  }
  if (!addresses.length) throw new UrlFetchError('The website host could not be resolved.');
  if (addresses.some(({ address }) => isPrivateIp(address))) {
    throw new UrlFetchError('Private or local network destinations are not allowed.');
  }

  return { url, address: addresses[0] };
}

function requestPinnedAddress(url: URL, address: ResolvedAddress, signal: AbortSignal): Promise<PageResponse> {
  return new Promise((resolve, reject) => {
    const hostname = hostnameForLookup(url);
    const client = url.protocol === 'https:' ? https : http;
    const request = client.request({
      protocol: url.protocol,
      hostname,
      port: url.port || undefined,
      path: `${url.pathname}${url.search}`,
      method: 'GET',
      headers: {
        'User-Agent': 'FolderML-URL-Importer/1.0',
        Accept: 'text/html,text/plain,application/xhtml+xml,*/*;q=0.5',
        'Accept-Encoding': 'identity',
      },
      lookup: (_hostname, _options, callback) => callback(null, address.address, address.family),
      servername: net.isIP(hostname) ? undefined : hostname,
      signal,
      agent: false,
    }, (response: IncomingMessage) => {
      resolve({
        statusCode: response.statusCode || 0,
        headers: response.headers,
        body: response,
        destroy: () => response.destroy(),
      });
    });
    request.once('error', reject);
    request.end();
  });
}

const defaultDependencies: UrlFetchDependencies = {
  resolve: async (hostname) => dns.lookup(hostname, { all: true, verbatim: true }),
  request: requestPinnedAddress,
};

const isRedirect = (statusCode: number) => [301, 302, 303, 307, 308].includes(statusCode);

export async function fetchPublicPage(rawUrl: string, dependencies = defaultDependencies) {
  const controller = new AbortController();
  let rejectTimeout!: (error: UrlFetchError) => void;
  const timeoutPromise = new Promise<never>((_, reject) => { rejectTimeout = reject; });
  const timer = setTimeout(() => {
    controller.abort();
    rejectTimeout(new UrlFetchError('The page request timed out after 15 seconds.', 504));
  }, dependencies.timeoutMs ?? REQUEST_TIMEOUT_MS);
  let currentUrl = rawUrl;

  try {
    for (let redirectCount = 0; redirectCount <= MAX_REDIRECTS; redirectCount++) {
      const { url, address } = await Promise.race([
        resolvePublicUrl(currentUrl, dependencies.resolve),
        timeoutPromise,
      ]);
      const response = await Promise.race([
        dependencies.request(url, address, controller.signal),
        timeoutPromise,
      ]);

      if (isRedirect(response.statusCode)) {
        const location = response.headers.location;
        response.destroy();
        if (!location) throw new UrlFetchError('The website returned a redirect without a destination.', 502);
        if (redirectCount === MAX_REDIRECTS) throw new UrlFetchError('The website redirected too many times.', 502);
        currentUrl = new URL(location, url).toString();
        continue;
      }

      if (response.statusCode < 200 || response.statusCode >= 300) {
        response.destroy();
        throw new UrlFetchError(`The website returned HTTP ${response.statusCode}.`, 502);
      }

      const chunks: Uint8Array[] = [];
      let responseBytes = 0;
      try {
        for await (const chunk of response.body) {
          responseBytes += chunk.byteLength;
          if (responseBytes > MAX_RESPONSE_BYTES) {
            response.destroy();
            throw new UrlFetchError('The page response is larger than the 2 MB limit.', 413);
          }
          chunks.push(chunk);
        }
      } catch (error) {
        if (error instanceof UrlFetchError) throw error;
        if (controller.signal.aborted) throw new UrlFetchError('The page request timed out after 15 seconds.', 504);
        throw new UrlFetchError('The website response could not be read.', 502);
      }

      const html = Buffer.concat(chunks).toString('utf8');
      const text = html
        .replace(/<script[\s\S]*?<\/script>/gi, ' ')
        .replace(/<style[\s\S]*?<\/style>/gi, ' ')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;|&#160;/gi, ' ')
        .replace(/&amp;/gi, '&')
        .replace(/&lt;/gi, '<')
        .replace(/&gt;/gi, '>')
        .replace(/&quot;/gi, '"')
        .replace(/&#39;|&apos;/gi, "'")
        .replace(/\s+/g, ' ')
        .trim();
      const contentType = Array.isArray(response.headers['content-type'])
        ? response.headers['content-type'][0]
        : response.headers['content-type'] || '';

      return {
        url: url.toString(),
        contentType,
        text: text.slice(0, 200_000),
        truncated: text.length > 200_000,
      };
    }
    throw new UrlFetchError('The website redirected too many times.', 502);
  } catch (error) {
    if (error instanceof UrlFetchError) throw error;
    if (controller.signal.aborted) throw new UrlFetchError('The page request timed out after 15 seconds.', 504);
    throw new UrlFetchError('The website could not be fetched.', 502);
  } finally {
    clearTimeout(timer);
  }
}