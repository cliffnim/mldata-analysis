import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('pdfjs-dist', () => ({
  GlobalWorkerOptions: { workerSrc: '' },
  getDocument: vi.fn(),
}));

import * as pdfjsLib from 'pdfjs-dist';
import { readFileAsync } from './fileReader';

afterEach(() => {
  vi.restoreAllMocks();
  vi.mocked(pdfjsLib.getDocument).mockReset();
});

function pdfPage(textItems: { str: string }[] = []) {
  return {
    getTextContent: vi.fn(async () => ({ items: textItems })),
    getViewport: vi.fn(({ scale }: { scale: number }) => ({ width: 100 * scale, height: 140 * scale })),
    render: vi.fn(() => ({ promise: Promise.resolve() })),
  };
}

function setPdfPage(page: ReturnType<typeof pdfPage>) {
  vi.mocked(pdfjsLib.getDocument).mockReturnValue({
    promise: Promise.resolve({ numPages: 1, getPage: vi.fn(async () => page) }),
  } as unknown as ReturnType<typeof pdfjsLib.getDocument>);
}

const pdfFile = () => new File(['mock pdf'], 'report.pdf', { type: 'application/pdf' });

describe('PDF text and scan handling', () => {
  it('marks selectable PDF text as extracted without OCR', async () => {
    setPdfPage(pdfPage([{ str: 'Selectable document text with enough characters.' }]));

    const result = await readFileAsync(pdfFile());

    expect(result.content).toContain('Selectable document text');
    expect(result.sourceExtraction).toBe('text');
    expect(result.attachments).toEqual([]);
    expect(result.status).toBe('idle');
  });

  it('renders a scanned page for AI vision rather than claiming OCR text', async () => {
    const page = pdfPage();
    setPdfPage(page);
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({} as CanvasRenderingContext2D);
    vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue('data:image/jpeg;base64,encoded-page');

    const result = await readFileAsync(pdfFile());

    expect(result.sourceExtraction).toBe('vision');
    expect(result.content).toBe('Scanned PDF pages attached as images.');
    expect(result.attachments).toEqual([{ mimeType: 'image/jpeg', base64: 'encoded-page' }]);
    expect(page.render).toHaveBeenCalledOnce();
  });

  it('reports no text when a scan cannot be rendered into an image', async () => {
    setPdfPage(pdfPage());
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);

    const result = await readFileAsync(pdfFile());

    expect(result.sourceExtraction).toBe('empty');
    expect(result.content).toBe('');
    expect(result.attachments).toEqual([]);
  });

  it('reports PDF parsing failures without requiring OCR tools', async () => {
    vi.mocked(pdfjsLib.getDocument).mockImplementation(() => ({
      promise: Promise.reject(new Error('mock parse failure')),
    } as unknown as ReturnType<typeof pdfjsLib.getDocument>));

    const result = await readFileAsync(pdfFile());

    expect(result.sourceExtraction).toBe('failed');
    expect(result.status).toBe('error');
    expect(result.errorMessage).toContain('Could not read PDF');
  });
});

describe('workbook upload parsing', () => {
  it('continues to parse CSV uploads into workbook sheets and rows', async () => {
    const csv = new File(['Name,Amount\nAda,42'], 'sample.csv', { type: 'text/csv' });

    const result = await readFileAsync(csv);

    expect(result.fileCategory).toBe('excel');
    expect(result.workbookData?.sheets[0].headers).toEqual(['Name', 'Amount']);
    expect(result.workbookData?.sheets[0].allRows).toEqual([{ Name: 'Ada', Amount: 42 }]);
  });
});