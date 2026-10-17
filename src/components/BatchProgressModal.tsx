import React from 'react';
import { Sparkles, FileText, CheckCircle2, AlertCircle, XCircle } from 'lucide-react';
import { FolderFile } from '../types';

interface BatchProgressModalProps {
  isOpen: boolean;
  total: number;
  current: number;
  currentFile: FolderFile | null;
  onCancel: () => void;
  logs: { fileName: string; status: 'success' | 'error'; confidence?: number }[];
}

export const BatchProgressModal: React.FC<BatchProgressModalProps> = ({
  isOpen,
  total,
  current,
  currentFile,
  onCancel,
  logs,
}) => {
  if (!isOpen) return null;

  const percentage = total > 0 ? Math.round((current / total) * 100) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden p-6 space-y-6">
        {/* Top Header */}
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400 shrink-0">
            <Sparkles className="w-5 h-5 animate-pulse text-amber-300" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Machine Learning Pipeline Running</h3>
            <p className="text-xs text-slate-400">
              Extracting structured records from directory files
            </p>
          </div>
        </div>

        {/* Progress Bar & Counter */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-300 font-medium">
              Processing {current} of {total} documents
            </span>
            <span className="font-mono text-teal-400 font-semibold">{percentage}%</span>
          </div>

          <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden border border-slate-700/60 p-0.5">
            <div
              className="h-full bg-gradient-to-r from-teal-500 to-emerald-400 rounded-full transition-all duration-300"
              style={{ width: `${percentage}%` }}
            />
          </div>

          {currentFile && (
            <div className="flex items-center space-x-2 text-[11px] text-slate-400 pt-1 truncate">
              <FileText className="w-3.5 h-3.5 text-teal-400 shrink-0" />
              <span className="truncate">Active: <strong className="text-slate-200">{currentFile.name}</strong></span>
            </div>
          )}
        </div>

        {/* Live Mini Log */}
        <div className="border border-slate-800 rounded-xl bg-slate-950/60 p-3 max-h-44 overflow-y-auto space-y-2 font-mono text-[11px]">
          {logs.length === 0 ? (
            <div className="text-slate-400 text-center py-4 text-xs font-sans">
              Initializing AI models & prompt schemas...
            </div>
          ) : (
            logs.map((log, index) => (
              <div key={index} className="flex items-center justify-between text-slate-300">
                <div className="flex items-center space-x-2 truncate pr-2">
                  {log.status === 'success' ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  ) : (
                    <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                  )}
                  <span className="truncate">{log.fileName}</span>
                </div>
                {log.confidence !== undefined && (
                  <span className="text-teal-400 shrink-0 text-[10px]">
                    {log.confidence}% match
                  </span>
                )}
              </div>
            ))
          )}
        </div>

        {/* Cancel button */}
        <div className="flex justify-end pt-2">
          <button
            onClick={onCancel}
            className="px-4 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
          >
            Stop Extraction
          </button>
        </div>
      </div>
    </div>
  );
};
