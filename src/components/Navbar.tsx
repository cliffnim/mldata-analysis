import React from 'react';
import {
  FolderArchive,
  Sparkles,
  FileSpreadsheet,
  Download,
  Copy,
  Check,
  RefreshCw,
  FolderOpen,
  Sliders,
} from 'lucide-react';
import { ViewTab } from '../types';

interface NavbarProps {
  activeTab: ViewTab;
  setActiveTab: (tab: ViewTab) => void;
  folderName: string;
  fileCount: number;
  extractedCount: number;
  onOpenUpload: () => void;
  onOpenPresets: () => void;
  onOpenSchemaEditor: () => void;
  onExportExcel: () => void;
  onExportCSV: () => void;
  onCopyGoogleSheets: () => void;
  copied: boolean;
  isProcessing: boolean;
  onRunBatchExtract: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  folderName,
  fileCount,
  extractedCount,
  onOpenUpload,
  onOpenPresets,
  onOpenSchemaEditor,
  onExportExcel,
  onExportCSV,
  onCopyGoogleSheets,
  copied,
  isProcessing,
  onRunBatchExtract,
}) => {
  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-30 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2.5">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 via-teal-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-teal-500/20">
                <FolderArchive className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">
                    FolderML
                  </span>
                  <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-teal-500/20 text-teal-300 border border-teal-500/30">
                    Auto-Spreadsheet
                  </span>
                </div>
                <p className="text-xs text-slate-400 hidden sm:block">
                  Folder Unstructured Data → Clean Tabular Spreadsheets
                </p>
              </div>
            </div>

            {/* Current Active Folder Pill */}
            {folderName && (
              <div className="hidden md:flex items-center space-x-2 bg-slate-800/80 border border-slate-700/60 rounded-lg px-3 py-1.5 text-xs">
                <FolderOpen className="w-3.5 h-3.5 text-teal-400" />
                <span className="text-slate-300 font-medium truncate max-w-[200px]" title={folderName}>
                  {folderName}
                </span>
                <span className="bg-slate-700 text-slate-300 px-1.5 py-0.5 rounded-full text-[10px] font-mono">
                  {extractedCount}/{fileCount} extracted
                </span>
              </div>
            )}
          </div>

          {/* Navigation Tabs */}
          <div className="hidden lg:flex items-center bg-slate-800/90 rounded-lg p-1 border border-slate-700/60">
            <button
              onClick={() => setActiveTab('spreadsheet')}
              className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all ${
                activeTab === 'spreadsheet'
                  ? 'bg-teal-500 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Spreadsheet</span>
            </button>

            <button
              onClick={() => setActiveTab('cleaner')}
              className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all ${
                activeTab === 'cleaner'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-300" />
              <span>Clean Data</span>
            </button>

            <button
              onClick={() => setActiveTab('analytics')}
              className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all ${
                activeTab === 'analytics'
                  ? 'bg-teal-500 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
              }`}
            >
              <FolderArchive className="w-3.5 h-3.5" />
              <span>Analyse</span>
            </button>

            <button
              onClick={() => setActiveTab('interpreter')}
              className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all ${
                activeTab === 'interpreter'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>Interprete</span>
            </button>

            <button
              onClick={() => setActiveTab('report')}
              className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all ${
                activeTab === 'report'
                  ? 'bg-indigo-500 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-teal-300" />
              <span>Full Report</span>
            </button>

            <button
              onClick={() => setActiveTab('files')}
              className={`flex items-center space-x-1 px-2 py-1.5 rounded-md text-xs font-medium transition-all ${
                activeTab === 'files'
                  ? 'bg-teal-500 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
              }`}
            >
              <FolderOpen className="w-3.5 h-3.5" />
              <span>Files ({fileCount})</span>
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-2">
            {/* Load / Change Folder */}
            <button
              onClick={onOpenUpload}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center space-x-1.5 transition-colors"
              title="Upload custom folder or files"
            >
              <FolderOpen className="w-3.5 h-3.5 text-teal-400" />
              <span className="hidden sm:inline">Upload Folder</span>
            </button>

            {/* Sample Presets */}
            <button
              onClick={onOpenPresets}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center space-x-1.5 transition-colors"
              title="Test with realistic pre-loaded folders"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Sample Datasets</span>
            </button>

            {/* Run / Re-run Extraction */}
            {fileCount > 0 && extractedCount < fileCount && (
              <button
                onClick={onRunBatchExtract}
                disabled={isProcessing}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-teal-600 hover:bg-teal-500 text-white flex items-center space-x-1.5 shadow-sm transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isProcessing ? 'animate-spin' : ''}`} />
                <span>{isProcessing ? 'Extracting...' : 'Run ML Extract'}</span>
              </button>
            )}

            {/* Export Dropdown / Buttons */}
            {extractedCount > 0 && (
              <div className="flex items-center space-x-1 border-l border-slate-800 pl-2">
                <button
                  onClick={onCopyGoogleSheets}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border border-emerald-800 flex items-center space-x-1 transition-colors"
                  title="Copy for Google Sheets (Paste with Ctrl+V into any Google Sheet)"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span className="hidden md:inline">{copied ? 'Copied TSV!' : 'Copy for Sheets'}</span>
                </button>

                <button
                  onClick={onExportExcel}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-emerald-600 hover:bg-emerald-500 text-white flex items-center space-x-1 shadow-sm transition-colors"
                  title="Download Microsoft Excel (.xlsx)"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">Excel (.xlsx)</span>
                </button>

                <button
                  onClick={onExportCSV}
                  className="px-2 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 flex items-center transition-colors"
                  title="Download CSV"
                >
                  CSV
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
