import * as XLSX from 'xlsx';
import { ColumnDef, ExtractedRow } from '../types';

/**
 * Clean and prepare data for export matching the schema column ordering
 */
export function formatDataForExport(columns: ColumnDef[], rows: ExtractedRow[]) {
  return rows.map((row) => {
    const item: Record<string, any> = {
      'Source File': row.fileName,
      'Folder Path': row.relativePath,
      'AI Confidence (%)': row.overallConfidence,
    };

    columns.forEach((col) => {
      let val = row.data[col.key];
      if (val === undefined || val === null) {
        val = '';
      } else if (typeof val === 'boolean') {
        val = val ? 'TRUE' : 'FALSE';
      } else if (typeof val === 'object') {
        val = JSON.stringify(val);
      }
      item[col.label] = val;
    });

    if (row.anomalies && row.anomalies.length > 0) {
      item['Extraction Notes & Flags'] = row.anomalies.join('; ');
    }

    return item;
  });
}

/**
 * Export to Excel (.xlsx) file
 */
export function exportToExcel(
  title: string,
  columns: ColumnDef[],
  rows: ExtractedRow[]
) {
  const exportData = formatDataForExport(columns, rows);
  const worksheet = XLSX.utils.json_to_sheet(exportData);

  // Set column widths dynamically
  const colKeys = Object.keys(exportData[0] || {});
  const colWidths = colKeys.map((k) => {
    const maxValLen = exportData.reduce((max, r) => {
      const str = String(r[k] || '');
      return Math.max(max, str.length);
    }, k.length);
    return { wch: Math.min(Math.max(maxValLen + 3, 12), 45) };
  });
  worksheet['!cols'] = colWidths;

  const workbook = XLSX.utils.book_new();
  const safeTitle = (title || 'Folder_Extracted_Data').substring(0, 31).replace(/[\\/?*[\]]/g, '_');
  XLSX.utils.book_append_sheet(workbook, worksheet, safeTitle);

  const cleanFilename = `${(title || 'Folder_Extracted_Data')
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '_')}_${new Date().toISOString().slice(0, 10)}.xlsx`;

  XLSX.writeFile(workbook, cleanFilename);
}

/**
 * Export to CSV (.csv) file
 */
export function exportToCSV(
  title: string,
  columns: ColumnDef[],
  rows: ExtractedRow[]
) {
  const exportData = formatDataForExport(columns, rows);
  const worksheet = XLSX.utils.json_to_sheet(exportData);
  const csvContent = XLSX.utils.sheet_to_csv(worksheet);

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute(
    'download',
    `${(title || 'Folder_Extracted_Data').toLowerCase().replace(/[^a-z0-9_-]/g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`
  );
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export to JSON (.json) file
 */
export function exportToJSON(
  title: string,
  columns: ColumnDef[],
  rows: ExtractedRow[]
) {
  const payload = {
    metadata: {
      title,
      exportedAt: new Date().toISOString(),
      rowCount: rows.length,
      columns: columns.map((c) => ({ key: c.key, label: c.label, type: c.type })),
    },
    records: rows.map((r) => ({
      file: {
        name: r.fileName,
        path: r.relativePath,
      },
      confidence: r.overallConfidence,
      data: r.data,
      sourceExcerpts: r.sourceExcerpts,
      anomalies: r.anomalies,
      summary: r.summary,
    })),
  };

  const jsonStr = JSON.stringify(payload, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute(
    'download',
    `${(title || 'Folder_Extracted_Data').toLowerCase().replace(/[^a-z0-9_-]/g, '_')}_${new Date().toISOString().slice(0, 10)}.json`
  );
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Copy TSV directly to clipboard for instant paste into Google Sheets / Excel
 */
export async function copyForGoogleSheets(
  columns: ColumnDef[],
  rows: ExtractedRow[]
): Promise<boolean> {
  try {
    const exportData = formatDataForExport(columns, rows);
    if (exportData.length === 0) return false;

    const headers = Object.keys(exportData[0]);
    const lines = [
      headers.join('\t'),
      ...exportData.map((row) =>
        headers
          .map((h) => {
            const val = String(row[h] ?? '').replace(/[\t\n\r]/g, ' ');
            return val;
          })
          .join('\t')
      ),
    ];

    const tsvString = lines.join('\n');
    await navigator.clipboard.writeText(tsvString);
    return true;
  } catch (err) {
    console.error('Failed to copy TSV to clipboard', err);
    return false;
  }
}
