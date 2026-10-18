import { describe, expect, it } from 'vitest';
import { FolderFile } from '../types';
import { getExtractionFailureMessage, getFileExtractionStatus } from './extractionStatus';

function file(overrides: Partial<FolderFile> = {}): FolderFile {
  return {
    id: 'file-1',
    name: 'report.pdf',
    relativePath: 'report.pdf',
    size: 100,
    mimeType: 'application/pdf',
    status: 'idle',
    ...overrides,
  };
}

describe('document extraction status', () => {
  it('identifies selectable text as successful extraction without OCR', () => {
    expect(getFileExtractionStatus(file({ sourceExtraction: 'text' }), true).label)
      .toBe('Text analyzed without OCR');
  });

  it('explains that images require AI vision while local OCR is unavailable', () => {
    const status = getFileExtractionStatus(file({ sourceExtraction: 'vision' }), false);
    expect(status.label).toBe('AI vision required; OCR unavailable');
    expect(status.detail).toContain('Local OCR is not installed');
  });

  it('does not describe successful AI vision output as OCR text', () => {
    const status = getFileExtractionStatus(file({ sourceExtraction: 'vision' }), true);
    expect(status.label).toBe('AI vision complete (not OCR)');
    expect(status.detail).toContain('not OCR text');
  });

  it('distinguishes empty extraction from processing failure', () => {
    expect(getFileExtractionStatus(file({ sourceExtraction: 'empty' }), false).label).toBe('No text found');
    expect(getFileExtractionStatus(file({ sourceExtraction: 'failed', status: 'error' }), false).state).toBe('error');
  });

  it('explains when provider credentials make image extraction unavailable', () => {
    const image = file({ sourceExtraction: 'vision' });
    const message = getExtractionFailureMessage(image, 'AI API key is not configured.');
    expect(message).toContain('AI vision is unavailable');
    expect(message).toContain('Local OCR is not installed');
    expect(getFileExtractionStatus({ ...image, status: 'error', errorMessage: message }, false).label)
      .toBe('OCR unavailable');
  });

  it('uses a concise message when AI vision cannot process an image', () => {
    const message = getExtractionFailureMessage(file({ sourceExtraction: 'vision' }), 'upstream stack trace');
    expect(message).toContain('AI vision could not process');
    expect(message).not.toContain('upstream stack trace');
  });
});