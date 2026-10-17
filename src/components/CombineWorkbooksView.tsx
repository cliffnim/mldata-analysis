import React, { useState } from 'react';
import {
  FileSpreadsheet,
  Layers,
  ArrowRight,
  CheckCircle2,
  FolderOpen,
  Sparkles,
  Download,
  Copy,
  Table,
  Check,
  RefreshCw,
  FolderUp,
} from 'lucide-react';
import { ColumnDef, ExtractedRow, FolderFile } from '../types';

interface CombineWorkbooksViewProps {
  files: FolderFile[];
  columns: ColumnDef[];
  rows: ExtractedRow[];
  onCombineAllWorkbooks: (harmonizeWithAI: boolean) => void;
  isCombining: boolean;
  onOpenUpload: () => void;
  onExportExcel: () => void;
}

export const CombineWorkbooksView: React.FC<CombineWorkbooksViewProps> = ({
  files,
  columns,
  rows,
  onCombineAllWorkbooks,
  isCombining,
  onOpenUpload,
  onExportExcel,
}) => {
  const [harmonizeWithAI, setHarmonizeWithAI] = useState(true);

  const excelFiles = files.filter((f) => f.workbookData || f.fileCategory === 'excel');
  const otherFiles = files.filter((f) => !f.workbookData && f.fileCategory !== 'excel');

  const totalWorkbookRows = excelFiles.reduce(
    (acc, f) => acc + (f.workbookData?.totalRows || 0),
    0
  );
  const totalSheets = excelFiles.reduce(
    (acc, f) => acc + (f.workbookData?.sheets.length || 0),
    0
  );

  return (
    <div className="space-y-6">
      {/* Action Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-teal-950/40 to-slate-900 border border-teal-800/50 rounded-2xl p-6 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-teal-500/20 text-teal-300 border border-teal-500/30">
              Workbook Consolidator
            </span>
            <span className="text-xs text-slate-400">
              {excelFiles.length} Excel file(s) • {totalSheets} worksheet(s) • {totalWorkbookRows} rows detected
            </span>
          </div>
          <h2 className="text-lg font-bold text-white tracking-tight">
            Combine All Folder Workbooks & Sheets
          </h2>
          <p className="text-xs text-slate-300 max-w-2xl leading-relaxed mt-0.5">
            Extract tabular data from every Excel workbook (`.xlsx`, `.xls`, `.csv`) in your uploaded directory and merge them into a single, unified master spreadsheet.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <label className="hidden sm:flex items-center space-x-2 text-xs text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={harmonizeWithAI}
              onChange={(e) => setHarmonizeWithAI(e.target.checked)}
              className="rounded border-slate-700 text-teal-600 focus:ring-teal-500"
            />
            <span>AI Column Harmonizer</span>
          </label>

          <button
            onClick={() => onCombineAllWorkbooks(harmonizeWithAI)}
            disabled={isCombining || (excelFiles.length === 0 && files.length === 0)}
            className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold flex items-center space-x-2 shadow-lg shadow-teal-500/20 transition-all disabled:opacity-50"
          >
            <Layers className={`w-4 h-4 ${isCombining ? 'animate-spin' : ''}`} />
            <span>{isCombining ? 'Combining Workbooks...' : 'Combine All into Master Sheet'}</span>
          </button>
        </div>
      </div>

      {/* Detected Workbooks Cards */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
            Detected Workbooks in Folder ({excelFiles.length})
          </h3>
          <button
            onClick={onOpenUpload}
            className="text-xs text-teal-400 hover:text-teal-300 font-medium flex items-center space-x-1"
          >
            <FolderUp className="w-3.5 h-3.5" />
            <span>Upload More Workbooks / Folder</span>
          </button>
        </div>

        {excelFiles.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center text-slate-400 text-xs">
            No Excel workbooks (`.xlsx`, `.xls`, `.csv`) detected in current folder yet.
            <div className="mt-3">
              <button
                onClick={onOpenUpload}
                className="px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-xs font-medium inline-flex items-center space-x-1.5"
              >
                <FolderOpen className="w-4 h-4" />
                <span>Upload Excel Folder Now</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {excelFiles.map((file) => {
              const wb = file.workbookData;
              return (
                <div
                  key={file.id}
                  className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl p-4 transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                        <FileSpreadsheet className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-semibold text-white truncate" title={file.name}>
                          {file.name}
                        </h4>
                        <span className="text-[10px] text-slate-400 block truncate" title={file.relativePath}>
                          📁 {file.relativePath}
                        </span>
                      </div>
                    </div>

                    <span className="text-[11px] font-mono text-teal-400 bg-teal-950/60 border border-teal-800 px-2 py-0.5 rounded">
                      {wb ? `${wb.totalRows} rows` : `${(file.size / 1024).toFixed(1)} KB`}
                    </span>
                  </div>

                  {/* Sheets Breakdown */}
                  {wb?.sheets && (
                    <div className="mt-3 pt-3 border-t border-slate-800/80 space-y-2">
                      <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider block">
                        Worksheets ({wb.sheets.length}):
                      </span>
                      <div className="space-y-1.5">
                        {wb.sheets.map((sheet, sIdx) => (
                          <div
                            key={sIdx}
                            className="flex items-center justify-between text-xs p-2 rounded-lg bg-slate-800/50"
                          >
                            <span className="text-slate-200 font-medium truncate max-w-[200px]">
                              📑 {sheet.sheetName}
                            </span>
                            <div className="flex items-center space-x-2 text-[10px] text-slate-400">
                              <span>{sheet.columnCount} cols</span>
                              <span>•</span>
                              <span className="text-emerald-400 font-mono">{sheet.rowCount} rows</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Combined Summary Preview if rows exist */}
      {rows.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <h3 className="text-xs font-semibold text-white uppercase tracking-wider">
                Current Combined Master Spreadsheet ({rows.length} rows, {columns.length} columns)
              </h3>
            </div>
            <button
              onClick={onExportExcel}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-600 hover:bg-emerald-500 text-white flex items-center space-x-1.5 shadow-sm transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Combined Excel (.xlsx)</span>
            </button>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">
            All workbook rows have been unified into a single tabular schema with preserved source paths, sheet names, and standardized data types. You can inspect and edit individual cells in the <strong>Spreadsheet Grid</strong> tab or generate deep analysis in the <strong>Data Interpreter</strong> tab.
          </p>
        </div>
      )}
    </div>
  );
};
