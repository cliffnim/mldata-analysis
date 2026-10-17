import React from 'react';
import {
  X,
  FileText,
  Folder,
  ShieldCheck,
  AlertTriangle,
  Quote,
  CheckCircle2,
  RefreshCw,
  ExternalLink,
  Tag,
  DollarSign,
  Calendar,
  Hash,
  Type,
} from 'lucide-react';
import { ColumnDef, ExtractedRow, FolderFile } from '../types';

interface DocumentInspectorDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  row: ExtractedRow | null;
  file: FolderFile | null;
  columns: ColumnDef[];
  onReExtractRow: (fileId: string) => void;
  isExtracting: boolean;
}

export const DocumentInspectorDrawer: React.FC<DocumentInspectorDrawerProps> = ({
  isOpen,
  onClose,
  row,
  file,
  columns,
  onReExtractRow,
  isExtracting,
}) => {
  if (!isOpen || !row) return null;

  const getConfidenceColor = (score: number) => {
    if (score >= 90) return 'text-emerald-400 bg-emerald-950/60 border-emerald-800';
    if (score >= 75) return 'text-amber-400 bg-amber-950/60 border-amber-800';
    return 'text-rose-400 bg-rose-950/60 border-rose-800';
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-2xl bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col">
          {/* Header */}
          <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90 sticky top-0 z-10">
            <div className="flex items-center space-x-3 min-w-0">
              <div className="w-9 h-9 rounded-lg bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400 shrink-0">
                <FileText className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h2 className="text-sm font-semibold text-white truncate" title={row.fileName}>
                  {row.fileName}
                </h2>
                <div className="flex items-center space-x-1.5 text-xs text-slate-400">
                  <Folder className="w-3 h-3 text-slate-400" />
                  <span className="truncate max-w-sm">{row.relativePath}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2 shrink-0">
              <button
                onClick={() => onReExtractRow(row.fileId)}
                disabled={isExtracting}
                className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center space-x-1.5 transition-colors disabled:opacity-50"
                title="Re-run machine learning extraction on this file"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-teal-400 ${isExtracting ? 'animate-spin' : ''}`} />
                <span>{isExtracting ? 'Extracting...' : 'Re-extract'}</span>
              </button>
              <button
                onClick={onClose}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Drawer Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Status & Confidence Card */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/80">
                <span className="text-[11px] font-medium text-slate-400 block mb-1">
                  Overall ML Confidence
                </span>
                <div className="flex items-center space-x-2">
                  <span
                    className={`px-2 py-0.5 rounded-md text-xs font-semibold border ${getConfidenceColor(
                      row.overallConfidence
                    )}`}
                  >
                    {row.overallConfidence}%
                  </span>
                  <span className="text-xs text-slate-400">
                    {row.overallConfidence >= 90
                      ? 'High precision match'
                      : row.overallConfidence >= 75
                      ? 'Good confidence'
                      : 'Review recommended'}
                  </span>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/80">
                <span className="text-[11px] font-medium text-slate-400 block mb-1">
                  Extracted At
                </span>
                <span className="text-xs text-slate-300 font-mono">
                  {new Date(row.extractedAt).toLocaleString()}
                </span>
              </div>
            </div>

            {/* Document Executive Summary */}
            {row.summary && (
              <div className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-700/60">
                <div className="text-[11px] font-semibold text-teal-400 uppercase tracking-wider mb-1">
                  Document Synopsis
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {row.summary}
                </p>
              </div>
            )}

            {/* Anomalies / Flags Alert */}
            {row.anomalies && row.anomalies.length > 0 && (
              <div className="p-3.5 rounded-xl bg-amber-950/30 border border-amber-800/60 text-amber-200">
                <div className="flex items-center space-x-2 text-xs font-semibold text-amber-400 mb-2">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Validation Warnings & Anomalies ({row.anomalies.length})</span>
                </div>
                <ul className="space-y-1 text-xs text-amber-200/90 list-disc list-inside">
                  {row.anomalies.map((anom, idx) => (
                    <li key={idx} className="leading-relaxed">
                      {anom}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Extracted Fields Table with Proof Excerpts */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
                  Extracted Spreadsheet Values & Source Evidence
                </h3>
                <span className="text-[11px] text-slate-400">
                  {columns.length} columns mapped
                </span>
              </div>

              <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/30 divide-y divide-slate-800/70">
                {columns.map((col) => {
                  const val = row.data[col.key];
                  const fieldConf = row.fieldConfidence?.[col.key] ?? row.overallConfidence;
                  const excerpt = row.sourceExcerpts?.[col.key];

                  return (
                    <div key={col.key} className="p-3.5 space-y-1.5 hover:bg-slate-800/30 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-medium text-slate-300">
                            {col.label}
                          </span>
                          <span className="text-[10px] font-mono text-slate-400">
                            ({col.type})
                          </span>
                        </div>

                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded border ${getConfidenceColor(
                            fieldConf
                          )}`}
                          title={`Confidence: ${fieldConf}%`}
                        >
                          {fieldConf}%
                        </span>
                      </div>

                      {/* Value Display */}
                      <div className="text-sm font-semibold text-white break-words">
                        {val === undefined || val === null || val === '' ? (
                          <span className="text-slate-400 italic font-normal text-xs">
                            (Not detected / Empty)
                          </span>
                        ) : col.type === 'currency' ? (
                          typeof val === 'number' ? `$${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : `$${val}`
                        ) : typeof val === 'boolean' ? (
                          val ? (
                            <span className="text-emerald-400">Yes / True</span>
                          ) : (
                            <span className="text-slate-400">No / False</span>
                          )
                        ) : (
                          String(val)
                        )}
                      </div>

                      {/* Source Text Excerpt / Evidence */}
                      {excerpt && (
                        <div className="mt-1 flex items-start space-x-1.5 p-2 rounded-lg bg-slate-900/80 border border-slate-800 text-[11px] text-slate-400">
                          <Quote className="w-3 h-3 text-teal-400 shrink-0 mt-0.5" />
                          <div className="leading-relaxed italic text-slate-300">
                            "{excerpt}"
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Original Source Document Viewer */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Source File Content
                </h3>
                <span className="text-[10px] text-slate-400 font-mono">
                  {file?.mimeType || 'text/plain'} • {file ? (file.size / 1024).toFixed(1) : 0} KB
                </span>
              </div>

              <div className="border border-slate-800 rounded-xl bg-slate-950 p-4 font-mono text-xs text-slate-300 overflow-x-auto max-h-72 leading-relaxed whitespace-pre-wrap select-text">
                {file?.content || (file?.base64 ? '(Binary / media file preview loaded)' : '(No text available)')}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
