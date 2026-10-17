import React, { useMemo } from 'react';
import {
  Sparkles,
  ShieldCheck,
  AlertTriangle,
  Folder,
  BarChart3,
  PieChart,
  CheckCircle2,
  FileSpreadsheet,
  Download,
} from 'lucide-react';
import { ColumnDef, ExtractedRow, FolderFile } from '../types';

interface InsightsAnalyticsViewProps {
  columns: ColumnDef[];
  rows: ExtractedRow[];
  files: FolderFile[];
  spreadsheetTitle: string;
  onExportExcel: () => void;
}

export const InsightsAnalyticsView: React.FC<InsightsAnalyticsViewProps> = ({
  columns,
  rows,
  files,
  spreadsheetTitle,
  onExportExcel,
}) => {
  const analytics = useMemo(() => {
    if (rows.length === 0) return null;

    // Quality distributions
    let highConf = 0;
    let medConf = 0;
    let lowConf = 0;
    rows.forEach((r) => {
      if (r.overallConfidence >= 90) highConf++;
      else if (r.overallConfidence >= 75) medConf++;
      else lowConf++;
    });

    // Subfolder breakdown
    const subfolderMap: Record<string, number> = {};
    rows.forEach((r) => {
      const parts = r.relativePath.split('/');
      const folderKey = parts.length > 1 ? parts.slice(0, -1).join('/') : 'Root Folder';
      subfolderMap[folderKey] = (subfolderMap[folderKey] || 0) + 1;
    });

    // Completeness per column
    const columnCompleteness: { key: string; label: string; filled: number; percent: number }[] =
      columns.map((col) => {
        const filledCount = rows.filter((r) => {
          const val = r.data[col.key];
          return val !== undefined && val !== null && val !== '';
        }).length;
        return {
          key: col.key,
          label: col.label,
          filled: filledCount,
          percent: Math.round((filledCount / rows.length) * 100),
        };
      });

    // All Anomalies aggregated
    const allAnomalies: { note: string; count: number }[] = [];
    const anomalyFreq: Record<string, number> = {};
    rows.forEach((r) => {
      (r.anomalies || []).forEach((a) => {
        anomalyFreq[a] = (anomalyFreq[a] || 0) + 1;
      });
    });
    Object.entries(anomalyFreq).forEach(([note, count]) => {
      allAnomalies.push({ note, count });
    });

    return {
      highConf,
      medConf,
      lowConf,
      subfolderMap,
      columnCompleteness,
      allAnomalies,
    };
  }, [rows, columns]);

  if (!analytics || rows.length === 0) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center">
        <BarChart3 className="w-12 h-12 text-slate-400 mx-auto mb-3" />
        <h3 className="text-base font-semibold text-white mb-1">No Extraction Analytics Available</h3>
        <p className="text-xs text-slate-400 max-w-sm mx-auto">
          Extract folder data into the spreadsheet to view model confidence distributions and directory insights.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* ML Accuracy Distribution */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Confidence Breakdown
            </span>
            <Sparkles className="w-4 h-4 text-amber-400" />
          </div>
          <div className="space-y-2.5">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-emerald-400 font-medium">High (&ge; 90%)</span>
                <span className="text-slate-300">{analytics.highConf} files ({Math.round((analytics.highConf / rows.length) * 100)}%)</span>
              </div>
              <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full"
                  style={{ width: `${(analytics.highConf / rows.length) * 100}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-amber-400 font-medium">Medium (75% - 89%)</span>
                <span className="text-slate-300">{analytics.medConf} files ({Math.round((analytics.medConf / rows.length) * 100)}%)</span>
              </div>
              <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-500 rounded-full"
                  style={{ width: `${(analytics.medConf / rows.length) * 100}%` }}
                />
              </div>
            </div>

            {analytics.lowConf > 0 && (
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-rose-400 font-medium">Review Needed (&lt; 75%)</span>
                  <span className="text-slate-300">{analytics.lowConf} files</span>
                </div>
                <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-rose-500 rounded-full"
                    style={{ width: `${(analytics.lowConf / rows.length) * 100}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Subfolder Source Distribution */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Directory Sources
            </span>
            <Folder className="w-4 h-4 text-teal-400" />
          </div>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {Object.entries(analytics.subfolderMap).map(([folder, count]) => (
              <div key={folder} className="flex items-center justify-between text-xs p-1.5 rounded-lg bg-slate-800/40">
                <span className="text-slate-300 truncate max-w-[180px]" title={folder}>
                  📁 {folder}
                </span>
                <span className="text-teal-400 font-mono font-medium">
                  {count} {count === 1 ? 'doc' : 'docs'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Validation Anomaly Summary */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Verification Status
            </span>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="space-y-2">
            <div className="flex items-center space-x-2 text-xs text-slate-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                <strong>{rows.length - analytics.allAnomalies.length}</strong> clean extractions with zero anomalies
              </span>
            </div>
            {analytics.allAnomalies.length > 0 ? (
              <div className="p-2 rounded-lg bg-amber-950/30 border border-amber-800/40 text-[11px] text-amber-300 space-y-1">
                <div className="font-semibold">{analytics.allAnomalies.length} unique flags detected:</div>
                {analytics.allAnomalies.slice(0, 3).map((anom, idx) => (
                  <div key={idx} className="truncate">• {anom.note}</div>
                ))}
              </div>
            ) : (
              <div className="text-[11px] text-slate-400">All documents strictly satisfied schema invariants.</div>
            )}
          </div>
        </div>
      </div>

      {/* Field Completeness Matrix */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
        <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-wider mb-4">
          Field Completeness & Capture Rates
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {analytics.columnCompleteness.map((col) => (
            <div key={col.key} className="p-3 rounded-lg bg-slate-800/50 border border-slate-700/60">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="font-medium text-slate-200 truncate">{col.label}</span>
                <span className="font-mono text-teal-400">{col.percent}%</span>
              </div>
              <div className="h-1.5 bg-slate-700/60 rounded-full overflow-hidden">
                <div
                  className="h-full bg-teal-500 rounded-full"
                  style={{ width: `${col.percent}%` }}
                />
              </div>
              <div className="text-[10px] text-slate-400 mt-1">
                Captured in {col.filled} of {rows.length} files
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
