import React, { useState } from 'react';
import {
  Folder,
  FolderOpen,
  FileText,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Eye,
  Trash2,
  FileCode,
  FileUp,
  Search,
} from 'lucide-react';
import { ExtractedRow, FolderFile } from '../types';

interface FilesExplorerViewProps {
  files: FolderFile[];
  extractedRows: ExtractedRow[];
  onExtractSingleFile: (fileId: string) => void;
  onInspectFileRow: (row: ExtractedRow) => void;
  onDeleteFile: (fileId: string) => void;
  onOpenUpload: () => void;
  isProcessing: boolean;
  extractingFileId: string | null;
}

export const FilesExplorerView: React.FC<FilesExplorerViewProps> = ({
  files,
  extractedRows,
  onExtractSingleFile,
  onInspectFileRow,
  onDeleteFile,
  onOpenUpload,
  isProcessing,
  extractingFileId,
}) => {
  const [search, setSearch] = useState('');

  const rowByFileId = new Map(extractedRows.map((r) => [r.fileId, r]));

  const filteredFiles = files.filter((f) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return f.name.toLowerCase().includes(q) || f.relativePath.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-4">
      {/* Top action header */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
            <FolderOpen className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-semibold text-white">Indexed Directory Files</h3>
            <p className="text-[11px] text-slate-400">
              {files.length} documents registered • {extractedRows.length} extracted into spreadsheet
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search file names..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-teal-500"
            />
          </div>

          <button
            onClick={onOpenUpload}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center space-x-1.5 transition-colors"
          >
            <FileUp className="w-3.5 h-3.5 text-teal-400" />
            <span>Add More Files</span>
          </button>
        </div>
      </div>

      {/* Files List Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
        {filteredFiles.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            No matching files found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800 text-[11px] font-semibold">
                <tr>
                  <th className="py-2.5 px-4">File Name & Path</th>
                  <th className="py-2.5 px-3">Size</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3">Extraction Status</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono text-slate-300">
                {filteredFiles.map((file) => {
                  const extractedRow = rowByFileId.get(file.id);
                  const isCurExtracting = extractingFileId === file.id;

                  return (
                    <tr key={file.id} className="hover:bg-slate-800/40 transition-colors group">
                      <td className="py-3 px-4 font-sans">
                        <div className="flex items-center space-x-2.5">
                          <FileText className="w-4 h-4 text-teal-400 shrink-0" />
                          <div className="min-w-0">
                            <span className="font-medium text-white text-xs block truncate max-w-md">
                              {file.name}
                            </span>
                            <span className="text-[10px] text-slate-400 flex items-center space-x-1 mt-0.5 truncate max-w-sm">
                              <Folder className="w-2.5 h-2.5 shrink-0" />
                              <span>{file.relativePath}</span>
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-3 text-slate-400 text-xs">
                        {(file.size / 1024).toFixed(1)} KB
                      </td>

                      <td className="py-3 px-3 text-slate-400 text-[11px]">
                        <span className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300">
                          {file.mimeType.split('/')[1] || 'text'}
                        </span>
                      </td>

                      <td className="py-3 px-3">
                        {isCurExtracting ? (
                          <div className="flex items-center space-x-1.5 text-teal-400 text-xs">
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span>ML Extracting...</span>
                          </div>
                        ) : extractedRow ? (
                          <div className="flex items-center space-x-2">
                            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] bg-emerald-950/60 text-emerald-400 border border-emerald-800">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Extracted ({extractedRow.overallConfidence}%)</span>
                            </span>
                            {extractedRow.anomalies?.length > 0 && (
                              <span
                                className="text-amber-400 text-[10px] bg-amber-950/60 border border-amber-800 px-1.5 py-0.5 rounded"
                                title={extractedRow.anomalies.join('; ')}
                              >
                                {extractedRow.anomalies.length} flag(s)
                              </span>
                            )}
                          </div>
                        ) : file.status === 'error' ? (
                          <div className="flex items-center space-x-1 text-rose-400 text-xs">
                            <AlertCircle className="w-3.5 h-3.5" />
                            <span>Failed: {file.errorMessage || 'Extraction error'}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-xs">Pending extraction</span>
                        )}
                      </td>

                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          {extractedRow ? (
                            <button
                              onClick={() => onInspectFileRow(extractedRow)}
                              className="px-2 py-1 rounded text-[11px] font-medium bg-slate-800 hover:bg-slate-700 text-teal-300 border border-slate-700 flex items-center space-x-1 transition-colors"
                              title="Inspect Extracted Spreadsheet Row"
                            >
                              <Eye className="w-3 h-3" />
                              <span>Inspect</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => onExtractSingleFile(file.id)}
                              disabled={isProcessing}
                              className="px-2.5 py-1 rounded text-[11px] font-medium bg-teal-600 hover:bg-teal-500 text-white flex items-center space-x-1 transition-colors disabled:opacity-50"
                            >
                              <Sparkles className="w-3 h-3 text-amber-300" />
                              <span>Extract</span>
                            </button>
                          )}

                          <button
                            onClick={() => onDeleteFile(file.id)}
                            className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                            title="Remove File"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
