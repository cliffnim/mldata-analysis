import * as XLSX from 'xlsx';
import { FolderFile, ExcelSheetInfo, WorkbookData } from '../types';

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
          status: 'error',
          errorMessage: 'Failed to read file',
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
          mimeType: file.type || 'text/plain',
          fileCategory: 'text',
          content: reader.result as string,
          status: 'idle',
        });
      };
      reader.onerror = () => {
        resolve({
          id: 'file_' + Math.random().toString(36).substring(2, 9),
          name: file.name,
          relativePath: path,
          size: file.size,
          mimeType: file.type || 'text/plain',
          content: `(Could not read file: ${file.name})`,
          status: 'error',
          errorMessage: 'Failed to read file',
        });
      };
      reader.readAsText(file);
    } else {
      // Binary / Image / PDF
      reader.onload = () => {
        const result = reader.result as string;
        const base64Data = result.includes(',') ? result.split(',')[1] : result;
        resolve({
          id: 'file_' + Math.random().toString(36).substring(2, 9),
          name: file.name,
          relativePath: path,
          size: file.size,
          mimeType: file.type || 'application/octet-stream',
          fileCategory: file.type.startsWith('image/') ? 'image' : 'document',
          base64: base64Data,
          status: 'idle',
        });
      };
      reader.onerror = () => {
        resolve({
          id: 'file_' + Math.random().toString(36).substring(2, 9),
          name: file.name,
          relativePath: path,
          size: file.size,
          mimeType: file.type || 'application/octet-stream',
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
