import * as XLSX from 'xlsx';
import * as mammoth from 'mammoth';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { FolderFile, ExcelSheetInfo, WorkbookData } from '../types';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

const getMimeType = (file: File): string => {
  if (file.type && file.type !== 'application/octet-stream') return file.type;

  const extension = file.name.split('.').pop()?.toLowerCase();
  const mimeTypes: Record<string, string> = {
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    pdf: 'application/pdf',
    bmp: 'image/bmp',
    gif: 'image/gif',
    heic: 'image/heic',
    heif: 'image/heif',
    jpeg: 'image/jpeg',
    jpg: 'image/jpeg',
    png: 'image/png',
    tif: 'image/tiff',
    tiff: 'image/tiff',
    webp: 'image/webp',
  };

  return mimeTypes[extension || ''] || 'application/octet-stream';
};

/**
 * Check if a file is an Excel spreadsheet or tabular workbook
 */
export function isExcelFile(fileName: string): boolean {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  return ['xlsx', 'xls', 'xlsm', 'xlsb', 'csv', 'tsv'].includes(ext);
}

/**
 * Check if a file is a text-based format
 */
export function isTextFile(file: File): boolean {
  const textMimes = [
    'text/',
    'application/json',
    'application/xml',
    'application/javascript',
    'application/typescript',
  ];
  if (textMimes.some((m) => file.type.startsWith(m))) return true;

  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  return ['txt', 'json', 'md', 'log', 'xml', 'html', 'yaml', 'yml', 'rtf'].includes(ext);
}

/**
 * Read File object into FolderFile. Handles Excel spreadsheets (.xlsx, .xls, .csv), text docs, and media.
 */
export async function readFileAsync(file: File, relativePath?: string): Promise<FolderFile> {
  const path = relativePath || (file as any).webkitRelativePath || file.name;
  const isExcel = isExcelFile(file.name);
  const isText = isTextFile(file);
  const isDocx = file.name.toLowerCase().endsWith('.docx');
  const mimeType = getMimeType(file);
  const isPdf = mimeType === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');

  return new Promise((resolve) => {
    const reader = new FileReader();

    if (isExcel) {
      // Read Excel as ArrayBuffer using SheetJS
      reader.onload = (e) => {
        try {
          const buffer = e.target?.result as ArrayBuffer;
          const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
          const sheets: ExcelSheetInfo[] = [];
          let totalRows = 0;
          let textSummary = `=== EXCEL WORKBOOK: ${file.name} ===\nPath: ${path}\nSheets Count: ${workbook.SheetNames.length}\n`;

          workbook.SheetNames.forEach((sheetName) => {
            const worksheet = workbook.Sheets[sheetName];
            const rawMatrix = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
            const headers: string[] = (rawMatrix[0] || []).map((h) => String(h ?? '').trim()).filter(Boolean);
            const jsonRows = XLSX.utils.sheet_to_json(worksheet, { defval: null }) as Record<string, any>[];

            sheets.push({
              sheetName,
              rowCount: jsonRows.length,
              columnCount: headers.length,
              headers,
              previewRows: jsonRows.slice(0, 10),
              allRows: jsonRows,
            });

            totalRows += jsonRows.length;
            textSummary += `\n[Sheet: "${sheetName}" | ${jsonRows.length} rows | Headers: ${headers.join(', ')}]\n`;
            textSummary += `Sample Data (first 5 rows):\n${JSON.stringify(jsonRows.slice(0, 5), null, 2)}\n`;
          });

          const workbookData: WorkbookData = {
            fileName: file.name,
            relativePath: path,
            sheets,
            totalRows,
          };

          resolve({
            id: 'file_' + Math.random().toString(36).substring(2, 9),
            name: file.name,
            relativePath: path,
            size: file.size,
            mimeType: file.type || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            fileCategory: 'excel',
            sourceExtraction: 'text',
            workbookData,
            content: textSummary,
            status: 'idle',
          });
        } catch (err: any) {
          console.error('Error parsing Excel file:', err);
          resolve({
            id: 'file_' + Math.random().toString(36).substring(2, 9),
            name: file.name,
            relativePath: path,
            size: file.size,
            mimeType: file.type || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            fileCategory: 'excel',
            sourceExtraction: 'failed',
            content: `(Could not parse Excel workbook: ${file.name} - ${err.message})`,
            status: 'error',
            errorMessage: 'Corrupt or unreadable Excel file: ' + err.message,
          });
        }
      };

      reader.onerror = () => {
        resolve({
          id: 'file_' + Math.random().toString(36).substring(2, 9),
          name: file.name,
          relativePath: path,
          size: file.size,
          mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            sourceExtraction: 'failed',
          status: 'error',
          errorMessage: 'Failed to read file',
        });
      };

      reader.readAsArrayBuffer(file);
    } else if (isPdf) {
      reader.onload = async (event) => {
        try {
          const buffer = event.target?.result as ArrayBuffer;
          const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
          const pageText: string[] = [];

          for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
            const page = await pdf.getPage(pageNumber);
            const text = await page.getTextContent();
            const pageContent = text.items.map((item) => 'str' in item ? item.str : '').join(' ').trim();
            if (pageContent) pageText.push(`Page ${pageNumber}:\n${pageContent}`);
          }

          const content = pageText.join('\n\n');
          const attachments: { mimeType: string; base64: string }[] = [];

          if (content.replace(/\s/g, '').length < 20) {
            for (let pageNumber = 1; pageNumber <= Math.min(pdf.numPages, 5); pageNumber++) {
              const page = await pdf.getPage(pageNumber);
              const originalViewport = page.getViewport({ scale: 1 });
              const scale = Math.min(1.5, 1600 / originalViewport.width);
              const viewport = page.getViewport({ scale });
              const canvas = document.createElement('canvas');
              const context = canvas.getContext('2d');
              if (!context) continue;
              canvas.width = Math.ceil(viewport.width);
              canvas.height = Math.ceil(viewport.height);
              await page.render({ canvas, canvasContext: context, viewport }).promise;
              const base64 = canvas.toDataURL('image/jpeg', 0.78).split(',')[1];
              if (base64) attachments.push({ mimeType: 'image/jpeg', base64 });
            }
          }

          resolve({
            id: 'file_' + Math.random().toString(36).substring(2, 9),
            name: file.name,
            relativePath: path,
            size: file.size,
            mimeType,
            fileCategory: 'document',
            content: content || (attachments.length ? 'Scanned PDF pages attached as images.' : ''),
            attachments,
            sourceExtraction: content.trim()
              ? (attachments.length ? 'text-and-vision' : 'text')
              : (attachments.length ? 'vision' : 'empty'),
            status: 'idle',
          });
        } catch (err: any) {
          resolve({
            id: 'file_' + Math.random().toString(36).substring(2, 9),
            name: file.name,
            relativePath: path,
            size: file.size,
            mimeType,
            fileCategory: 'document',
            sourceExtraction: 'failed',
            status: 'error',
            errorMessage: `Could not read PDF: ${err.message || 'Invalid PDF file'}`,
          });
        }
      };
      reader.onerror = () => {
        resolve({
          id: 'file_' + Math.random().toString(36).substring(2, 9),
          name: file.name,
          relativePath: path,
          size: file.size,
          mimeType,
          fileCategory: 'document',
            sourceExtraction: 'failed',
          status: 'error',
          errorMessage: 'Failed to read PDF',
        });
      };
      reader.readAsArrayBuffer(file);
    } else if (isDocx) {
      reader.onload = async (event) => {
        try {
          const buffer = event.target?.result as ArrayBuffer;
          const extracted = await mammoth.extractRawText({ arrayBuffer: buffer });
          resolve({
            id: 'file_' + Math.random().toString(36).substring(2, 9),
            name: file.name,
            relativePath: path,
            size: file.size,
            mimeType,
            fileCategory: 'document',
            content: extracted.value,
            sourceExtraction: extracted.value.trim() ? 'text' : 'empty',
            status: 'idle',
          });
        } catch (err: any) {
          resolve({
            id: 'file_' + Math.random().toString(36).substring(2, 9),
            name: file.name,
            relativePath: path,
            size: file.size,
            mimeType,
            fileCategory: 'document',
            content: '',
            sourceExtraction: 'failed',
            status: 'error',
            errorMessage: `Could not read Word document: ${err.message || 'Invalid DOCX file'}`,
          });
        }
      };
      reader.onerror = () => {
        resolve({
          id: 'file_' + Math.random().toString(36).substring(2, 9),
          name: file.name,
          relativePath: path,
          size: file.size,
          mimeType,
          fileCategory: 'document',
            sourceExtraction: 'failed',
          status: 'error',
          errorMessage: 'Failed to read Word document',
        });
      };
      reader.readAsArrayBuffer(file);
    } else if (isText) {
      // Plain text, logs, JSON, markdown
      reader.onload = () => {
        resolve({
          id: 'file_' + Math.random().toString(36).substring(2, 9),
          name: file.name,
          relativePath: path,
          size: file.size,
          mimeType: mimeType || 'text/plain',
          fileCategory: 'text',
          content: reader.result as string,
            sourceExtraction: typeof reader.result === 'string' && reader.result.trim() ? 'text' : 'empty',
          status: 'idle',
        });
      };
      reader.onerror = () => {
        resolve({
          id: 'file_' + Math.random().toString(36).substring(2, 9),
          name: file.name,
          relativePath: path,
          size: file.size,
          mimeType: mimeType || 'text/plain',
          content: `(Could not read file: ${file.name})`,
            sourceExtraction: 'failed',
          status: 'error',
          errorMessage: 'Failed to read file',
        });
      };
      reader.readAsText(file);
    } else {
      // Binary / Image / PDF
      reader.onload = async () => {
        const result = reader.result as string;
        const base64Data = result.includes(',') ? result.split(',')[1] : result;

        if (mimeType.startsWith('image/')) {
          try {
            const image = await createImageBitmap(file);
            const scale = Math.min(1, 1800 / Math.max(image.width, image.height));
            const canvas = document.createElement('canvas');
            canvas.width = Math.max(1, Math.round(image.width * scale));
            canvas.height = Math.max(1, Math.round(image.height * scale));
            const context = canvas.getContext('2d');
            if (!context) throw new Error('Image conversion is unavailable in this browser.');
            context.fillStyle = '#ffffff';
            context.fillRect(0, 0, canvas.width, canvas.height);
            context.drawImage(image, 0, 0, canvas.width, canvas.height);
            image.close();
            const jpegBase64 = canvas.toDataURL('image/jpeg', 0.82).split(',')[1];
            resolve({
              id: 'file_' + Math.random().toString(36).substring(2, 9),
              name: file.name,
              relativePath: path,
              size: file.size,
              mimeType,
              fileCategory: 'image',
              attachments: [{ mimeType: 'image/jpeg', base64: jpegBase64 }],
              sourceExtraction: 'vision',
              status: 'idle',
            });
            return;
          } catch (err: any) {
            if (!['image/jpeg', 'image/png', 'image/webp'].includes(mimeType)) {
              resolve({
                id: 'file_' + Math.random().toString(36).substring(2, 9),
                name: file.name,
                relativePath: path,
                size: file.size,
                mimeType,
                fileCategory: 'image',
                sourceExtraction: 'failed',
                status: 'error',
                errorMessage: `Could not convert this photo in the browser. Try JPG, PNG, or WEBP. ${err.message || ''}`.trim(),
              });
              return;
            }
          }

          resolve({
            id: 'file_' + Math.random().toString(36).substring(2, 9),
            name: file.name,
            relativePath: path,
            size: file.size,
            mimeType,
            fileCategory: 'image',
            attachments: [{ mimeType, base64: base64Data }],
            sourceExtraction: 'vision',
            status: 'idle',
          });
          return;
        }

        resolve({
          id: 'file_' + Math.random().toString(36).substring(2, 9),
          name: file.name,
          relativePath: path,
          size: file.size,
          mimeType,
          fileCategory: 'document',
          base64: base64Data,
          sourceExtraction: 'empty',
          status: 'idle',
        });
      };
      reader.onerror = () => {
        resolve({
          id: 'file_' + Math.random().toString(36).substring(2, 9),
          name: file.name,
          relativePath: path,
          size: file.size,
          mimeType,
          sourceExtraction: 'failed',
          status: 'error',
          errorMessage: 'Failed to read media/binary file',
        });
      };
      reader.readAsDataURL(file);
    }
  });
}

/**
 * Recursively read all files from a dropped DataTransferItem entry
 */
export async function getFilesFromEntry(entry: any, currentPath = ''): Promise<{ file: File; path: string }[]> {
  if (entry.isFile) {
    return new Promise((resolve) => {
      entry.file((file: File) => {
        if (file.name.startsWith('.') || file.name === 'Thumbs.db') {
          resolve([]);
        } else {
          resolve([{ file, path: currentPath ? `${currentPath}/${file.name}` : file.name }]);
        }
      });
    });
  } else if (entry.isDirectory) {
    const dirReader = entry.createReader();
    const entries: any[] = [];

    const readEntries = async (): Promise<any[]> => {
      return new Promise((resolve) => {
        dirReader.readEntries(async (results: any[]) => {
          if (!results.length) {
            resolve(entries);
          } else {
            entries.push(...results);
            resolve(await readEntries());
          }
        });
      });
    };

    const subEntries = await readEntries();
    const newPath = currentPath ? `${currentPath}/${entry.name}` : entry.name;
    const fileLists = await Promise.all(
      subEntries.map((subEntry) => getFilesFromEntry(subEntry, newPath))
    );
    return fileLists.flat();
  }
  return [];
}
