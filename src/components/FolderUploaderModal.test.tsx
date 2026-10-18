import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { FolderUploaderModal } from './FolderUploaderModal';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function renderUploader() {
  const onClose = vi.fn();
  const onFilesLoaded = vi.fn();
  render(<FolderUploaderModal isOpen onClose={onClose} onFilesLoaded={onFilesLoaded} />);
  return { onClose, onFilesLoaded };
}

describe('FolderUploaderModal URL import', () => {
  it('shows loading, previews extracted text, then sends it through the existing import callback', async () => {
    let resolveFetch!: (response: Response) => void;
    const pendingFetch = new Promise<Response>((resolve) => { resolveFetch = resolve; });
    vi.stubGlobal('fetch', vi.fn(() => pendingFetch));
    const { onClose, onFilesLoaded } = renderUploader();

    fireEvent.change(screen.getByLabelText('Import a public web page'), {
      target: { value: 'https://example.com/data' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Fetch URL' }));

    expect(screen.getByRole('status').textContent).toContain('Fetching the page');
    const loadingButton = screen.getByRole('button', { name: 'Fetching...' }) as HTMLButtonElement;
    expect(loadingButton.disabled).toBe(true);

    resolveFetch({
      ok: true,
      status: 200,
      json: async () => ({
        url: 'https://example.com/data',
        contentType: 'text/html',
        text: 'Revenue was 42.',
        truncated: false,
      }),
    } as Response);

    expect(await screen.findByText('Page text extracted')).toBeTruthy();
    expect(screen.getByText('Revenue was 42.')).toBeTruthy();
    expect(onFilesLoaded).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Continue to analysis' }));
    expect(onFilesLoaded).toHaveBeenCalledWith('Web Page', [expect.objectContaining({
      name: 'example.com',
      content: 'Revenue was 42.',
      relativePath: 'https://example.com/data',
    })]);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it.each([
    [400, 'Private or local network destinations are not allowed.'],
    [413, 'The page response is larger than the 2 MB limit.'],
    [504, 'The page request timed out after 15 seconds.'],
    [502, 'The website returned HTTP 502.'],
  ])('displays a clear message for HTTP %s responses', async (status, message) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status,
      json: async () => ({ error: message }),
    }));
    renderUploader();

    fireEvent.change(screen.getByLabelText('Import a public web page'), {
      target: { value: 'https://example.com/data' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Fetch URL' }));

    expect((await screen.findByRole('alert')).textContent).toContain(message);
  });

  it('warns when a successfully fetched page contains no extractable text', async () => {
    const onFilesLoaded = vi.fn();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ url: 'https://example.com/empty', contentType: 'text/html', text: '', truncated: false }),
    }));
    render(<FolderUploaderModal isOpen onClose={() => {}} onFilesLoaded={onFilesLoaded} />);

    fireEvent.change(screen.getByLabelText('Import a public web page'), {
      target: { value: 'https://example.com/empty' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Fetch URL' }));

    expect(await screen.findByText(/little or no extractable text/)).toBeTruthy();
    expect(screen.getByText('No extractable text found on this page.')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Continue to analysis' }));
    expect(onFilesLoaded).toHaveBeenCalledWith('Web Page', [expect.objectContaining({ content: '' })]);
  });

  it('rejects unsupported protocols before calling the endpoint', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    renderUploader();

    fireEvent.change(screen.getByLabelText('Import a public web page'), {
      target: { value: 'ftp://example.com/data' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Fetch URL' }));

    expect((await screen.findByRole('alert')).textContent).toContain('Only public HTTP and HTTPS web pages are supported.');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});