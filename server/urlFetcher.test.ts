// @vitest-environment node
import { Readable } from 'node:stream';
import { describe, expect, it, vi } from 'vitest';
import { fetchPublicPage, isPrivateIp, UrlFetchError, UrlFetchDependencies } from './urlFetcher';

const publicAddress = { address: '93.184.216.34', family: 4 };

function pageResponse(statusCode: number, body = '', headers: Record<string, string> = {}) {
  return {
    statusCode,
    headers,
    body: Readable.from([Buffer.from(body)]),
    destroy: vi.fn(),
  };
}

function dependencies(overrides: Partial<UrlFetchDependencies> = {}): UrlFetchDependencies {
  return {
    resolve: vi.fn(async () => [publicAddress]),
    request: vi.fn(async () => pageResponse(200, '<p>Hello &amp; welcome</p><script>secret()</script>', {
      'content-type': 'text/html; charset=utf-8',
    })),
    ...overrides,
  };
}

describe('fetchPublicPage', () => {
  it('extracts page text and returns the endpoint response shape', async () => {
    const result = await fetchPublicPage('https://example.com/report', dependencies());

    expect(result).toEqual({
      url: 'https://example.com/report',
      contentType: 'text/html; charset=utf-8',
      text: 'Hello & welcome',
      truncated: false,
    });
  });

  it.each(['127.0.0.1', '10.0.0.4', '169.254.169.254', '::1', '::ffff:7f00:1'])('blocks private IP %s', (address) => {
    expect(isPrivateIp(address)).toBe(true);
  });

  it('rejects a private literal before making a request', async () => {
    const deps = dependencies();

    await expect(fetchPublicPage('http://127.0.0.1/admin', deps)).rejects.toMatchObject({
      statusCode: 400,
      message: 'Private or local network destinations are not allowed.',
    });
    expect(deps.request).not.toHaveBeenCalled();
  });

  it('revalidates a redirect destination before connecting to it', async () => {
    const request = vi.fn(async () => pageResponse(302, '', { location: 'http://internal.example/admin' }));
    const resolve = vi.fn(async (hostname: string) => hostname === 'example.com'
      ? [publicAddress]
      : [{ address: '192.168.1.20', family: 4 }]);
    const deps = dependencies({ request, resolve });

    await expect(fetchPublicPage('https://example.com/start', deps)).rejects.toBeInstanceOf(UrlFetchError);
    expect(resolve).toHaveBeenCalledTimes(2);
    expect(request).toHaveBeenCalledTimes(1);
  });

  it('rejects oversized response bodies with an explicit status', async () => {
    const request = vi.fn(async () => pageResponse(200, 'x'.repeat(2 * 1024 * 1024 + 1)));

    await expect(fetchPublicPage('https://example.com/large', dependencies({ request }))).rejects.toMatchObject({
      statusCode: 413,
    });
  });

  it('times out a stalled DNS lookup', async () => {
    const resolve = vi.fn(() => new Promise<never>(() => {}));

    await expect(fetchPublicPage('https://example.com/slow-dns', dependencies({ resolve, timeoutMs: 5 })))
      .rejects.toMatchObject({ statusCode: 504 });
  });
});