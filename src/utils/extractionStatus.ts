import { FolderFile } from '../types';

export interface FileExtractionStatus {
  label: string;
  detail: string;
  state: 'success' | 'pending' | 'warning' | 'error';
}

export function getExtractionFailureMessage(file: FolderFile, serverMessage = ''): string {
  const usesVision = file.sourceExtraction === 'vision' || file.sourceExtraction === 'text-and-vision';
  const providerUnavailable = /api key is not configured|credentials are missing|unauthorized|authentication/i.test(serverMessage);

  if (usesVision && providerUnavailable) {
    return 'AI vision is unavailable because provider credentials are missing or invalid. Configure the existing Kilo Gateway or OpenAI-compatible provider. Local OCR is not installed.';
  }
  if (usesVision) {
    return 'AI vision could not process this image or scanned page. Check the configured AI provider or try a clearer supported file.';
  }
  return 'Document extraction failed. Check the configured AI provider and try again.';
}

export function getFileExtractionStatus(file: FolderFile, hasStructuredRow: boolean): FileExtractionStatus {
  if (file.status === 'error') {
    if (file.errorMessage?.startsWith('AI vision is unavailable')) {
      return {
        label: 'OCR unavailable',
        detail: 'No local OCR engine is installed, and the configured AI vision provider is unavailable.',
        state: 'warning',
      };
    }
    if (file.sourceExtraction === 'vision' || file.sourceExtraction === 'text-and-vision') {
      return {
        label: 'AI vision failed',
        detail: file.errorMessage || 'AI vision could not process this image or scanned page.',
        state: 'error',
      };
    }
    return {
      label: 'File processing failed',
      detail: file.errorMessage || 'The file could not be read.',
      state: 'error',
    };
  }

  if (file.sourceExtraction === 'empty') {
    return {
      label: 'No text found',
      detail: 'No selectable text or supported image content was extracted from this file.',
      state: 'warning',
    };
  }
  if (file.sourceExtraction === 'vision') {
    return hasStructuredRow
      ? {
          label: 'AI vision complete (not OCR)',
          detail: 'The image was processed by the configured AI vision model; this result is not OCR text.',
          state: 'success',
        }
      : {
          label: 'AI vision required; OCR unavailable',
          detail: 'Local OCR is not installed. This image or scanned page can be sent to the configured AI vision model.',
          state: 'pending',
        };
  }
  if (file.sourceExtraction === 'text-and-vision') {
    return hasStructuredRow
      ? {
          label: 'Text and AI vision analyzed',
          detail: 'Selectable text was parsed without OCR; attached page images were processed by AI vision.',
          state: 'success',
        }
      : {
          label: 'Text extracted; AI vision also available',
          detail: 'Selectable text was parsed without OCR. Attached page images may also be processed by AI vision.',
          state: 'pending',
        };
  }
  if (file.sourceExtraction === 'text') {
    return hasStructuredRow
      ? {
          label: 'Text analyzed without OCR',
          detail: 'Selectable document text was extracted and used for structured analysis; OCR was not used.',
          state: 'success',
        }
      : {
          label: 'Text extracted without OCR',
          detail: 'Selectable document text is ready for structured analysis; OCR was not used.',
          state: 'pending',
        };
  }
  return {
    label: hasStructuredRow ? 'Structured data extracted' : 'Pending extraction',
    detail: hasStructuredRow ? 'Structured fields were extracted from this file.' : 'This file is waiting for structured extraction.',
    state: hasStructuredRow ? 'success' : 'pending',
  };
}