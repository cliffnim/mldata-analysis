import React, { useState, useMemo } from 'react';
import {
  Sparkles,
  ShieldCheck,
  AlertTriangle,
  RotateCcw,
  Check,
  CheckCircle2,
  Trash2,
  Filter,
  Layers,
  Wand2,
  ArrowRight,
  Info,
  Calendar,
  Hash,
  Type,
  FileSpreadsheet,
} from 'lucide-react';
import { ColumnDef, DataCleanAudit, CleanHistoryItem, ExtractedRow } from '../types';

interface DataCleanerViewProps {
  columns: ColumnDef[];
  rows: ExtractedRow[];
  onUpdateRows: (updatedRows: ExtractedRow[], historyItem: CleanHistoryItem) => void;
  cleanHistory: CleanHistoryItem[];
  onRevertLastClean: () => void;
  onNavigateToTab: (tab: any) => void;
}

export const DataCleanerView: React.FC<DataCleanerViewProps> = ({
  columns,
  rows,
  onUpdateRows,
  cleanHistory,
  onRevertLastClean,
  onNavigateToTab,
}) => {
  const [selectedColumn, setSelectedColumn] = useState<string>('all');
  const [fillValueOption, setFillValueOption] = useState<'mean' | 'median' | 'mode' | 'zero' | 'na'>('mean');
  const [casingOption, setCasingOption] = useState<'title' | 'upper' | 'lower'>('title');
  const [advisorSuggestions, setAdvisorSuggestions] = useState<{ title: string; reason: string; priority: string }[]>([]);
  const [isLoadingAdvisor, setIsLoadingAdvisor] = useState(false);

  // Compute Data Health Audit in real time
  const audit: DataCleanAudit = useMemo(() => {
    if (rows.length === 0) {
      return {
        totalIssues: 0,
        missingValuesByCol: {},
        totalMissingValues: 0,
        duplicateRowsCount: 0,
        duplicateRowIndices: [],
        whitespaceIssuesCount: 0,
        outliersByCol: {},
        dataHealthScore: 100,
      };
    }

    const missingValuesByCol: Record<string, number> = {};
    let totalMissing = 0;
    let whitespaceIssues = 0;

    columns.forEach((col) => {
      let missingCount = 0;
      rows.forEach((r) => {
        const val = r.data[col.key];
        if (val === undefined || val === null || val === '' || String(val).trim().toLowerCase() === 'null' || String(val).trim().toLowerCase() === 'nan') {
          missingCount++;
        } else if (typeof val === 'string') {
          if (val !== val.trim()) {
            whitespaceIssues++;
          }
        }
      });
      missingValuesByCol[col.key] = missingCount;
      totalMissing += missingCount;
    });

    // Detect duplicate rows
    const seenSignatures = new Set<string>();
    const duplicateRowIndices: number[] = [];

    rows.forEach((r, idx) => {
      const sig = columns.map((c) => String(r.data[c.key] ?? '')).join('|');
      if (seenSignatures.has(sig)) {
        duplicateRowIndices.push(idx);
      } else {
        seenSignatures.add(sig);
      }
    });

    // Detect Outliers for numeric columns using IQR (Interquartile Range)
    const outliersByCol: Record<string, number> = {};
    columns.forEach((col) => {
      if (col.type === 'number' || col.type === 'currency') {
        const numbers = rows
          .map((r) => parseFloat(r.data[col.key]))
          .filter((n) => !isNaN(n))
          .sort((a, b) => a - b);

        if (numbers.length >= 4) {
          const q1 = numbers[Math.floor(numbers.length * 0.25)];
          const q3 = numbers[Math.floor(numbers.length * 0.75)];
          const iqr = q3 - q1;
          const lowerBound = q1 - 1.5 * iqr;
          const upperBound = q3 + 1.5 * iqr;

          const outlierCount = numbers.filter((n) => n < lowerBound || n > upperBound).length;
          if (outlierCount > 0) {
            outliersByCol[col.key] = outlierCount;
          }
        }
      }
    });

    const totalCells = rows.length * Math.max(columns.length, 1);
    const totalOutliers = Object.values(outliersByCol).reduce((a, b) => a + b, 0);
    const totalIssues = totalMissing + duplicateRowIndices.length + whitespaceIssues + totalOutliers;

    const penalty = Math.min(Math.round((totalIssues / totalCells) * 100 * 2), 65);
    const dataHealthScore = Math.max(100 - penalty, 35);

    return {
      totalIssues,
      missingValuesByCol,
      totalMissingValues: totalMissing,
      duplicateRowsCount: duplicateRowIndices.length,
      duplicateRowIndices,
      whitespaceIssuesCount: whitespaceIssues,
      outliersByCol,
      dataHealthScore,
    };
  }, [rows, columns]);

  // Request AI Cleaning Advisor
  const fetchAdvisorSuggestions = async () => {
    setIsLoadingAdvisor(true);
    let loaded = false;
    try {
      const res = await fetch('/api/clean-data-advisor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cleanAudit: audit,
          columns,
          sampleRows: rows.slice(0, 15).map((r) => r.data),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.suggestions && data.suggestions.length > 0) {
          setAdvisorSuggestions(data.suggestions);
          loaded = true;
        }
      }
    } catch (err) {
      console.warn('Backend clean advisor unavailable, using client rule advisor:', err);
    }

    if (!loaded) {
      const clientSuggestions: any[] = [];
      if (audit.duplicateRowsCount > 0) {
        clientSuggestions.push({
          title: `Deduplicate ${audit.duplicateRowsCount} Redundant Records`,
          reason: 'Identical rows distort average values, count totals, and ML feature distributions.',
          priority: 'high',
        });
      }
      if (audit.whitespaceIssuesCount > 0) {
        clientSuggestions.push({
          title: `Trim ${audit.whitespaceIssuesCount} Accidental Whitespaces`,
          reason: 'Leading/trailing whitespace produces mismatched filter queries and distinct grouping splits.',
          priority: 'high',
        });
      }
      if (audit.totalMissingValues > 0) {
        const topMissing = Object.entries(audit.missingValuesByCol)[0];
        clientSuggestions.push({
          title: `Impute Blank Cells (e.g. in "${topMissing?.[0] || 'attributes'}")`,
          reason: 'Missing numeric cells default to nulls; impute using column medians or category modes.',
          priority: 'medium',
        });
      }
      const outlierEntries = Object.entries(audit.outliersByCol);
      if (outlierEntries.length > 0) {
        clientSuggestions.push({
          title: `Cap or Audit ${outlierEntries[0][1]} Statistical Outliers in "${outlierEntries[0][0]}"`,
          reason: 'Extreme values (diverging beyond 1.5x IQR) can drastically pull sample means.',
          priority: 'medium',
        });
      }
      if (clientSuggestions.length === 0) {
        clientSuggestions.push({
          title: 'Format Standardization Confirmed',
          reason: 'All active columns pass completeness thresholds. Dataset is ready for downstream modeling.',
          priority: 'low',
        });
      }
      setAdvisorSuggestions(clientSuggestions);
    }
    setIsLoadingAdvisor(false);
  };

  // 1-Click Master Auto Clean
  const handleAutoCleanAll = () => {
    if (rows.length === 0) return;

    let changesCount = 0;
    const seenSignatures = new Set<string>();
    const cleanedRows: ExtractedRow[] = [];

    rows.forEach((r) => {
      // 1. Check for duplicates
      const sig = columns.map((c) => String(r.data[c.key] ?? '')).join('|');
      if (seenSignatures.has(sig)) {
        changesCount++;
        return; // drop duplicate
      }
      seenSignatures.add(sig);

      const updatedData: Record<string, any> = { ...r.data };

      columns.forEach((col) => {
        let val = updatedData[col.key];

        // 2. Trim strings & standard casing
        if (typeof val === 'string') {
          const trimmed = val.trim();
          if (trimmed !== val) {
            val = trimmed;
            changesCount++;
          }

          // 3. Clean numeric/currency values stored as string with $ or commas
          if (col.type === 'number' || col.type === 'currency') {
            const cleanedNum = parseFloat(val.replace(/[$,€£%\s]/g, ''));
            if (!isNaN(cleanedNum)) {
              val = cleanedNum;
              changesCount++;
            }
          }

          // 4. Standardize ISO date if valid date string
          if (col.type === 'date' && val) {
            const parsedDate = new Date(val);
            if (!isNaN(parsedDate.getTime()) && parsedDate.getFullYear() > 1970) {
              const iso = parsedDate.toISOString().slice(0, 10);
              if (iso !== val) {
                val = iso;
                changesCount++;
              }
            }
          }
        }

        // 5. Fill empty values with smart defaults
        if (val === undefined || val === null || val === '' || String(val).toLowerCase() === 'null') {
          if (col.type === 'number' || col.type === 'currency') {
            val = 0;
          } else if (col.type === 'boolean') {
            val = false;
          } else {
            val = 'N/A';
          }
          changesCount++;
        }

        updatedData[col.key] = val;
      });

      cleanedRows.push({
        ...r,
        data: updatedData,
      });
    });

    onUpdateRows(cleanedRows, {
      id: 'clean_' + Date.now(),
      action: '1-Click Master Auto-Clean',
      details: `Normalized whitespace, parsed numbers, deduplicated ${rows.length - cleanedRows.length} rows, and imputed empty cells.`,
      timestamp: new Date().toLocaleTimeString(),
      affectedCount: changesCount,
    });
  };

  // Remove Duplicates
  const handleRemoveDuplicates = () => {
    const seenSignatures = new Set<string>();
    const uniqueRows: ExtractedRow[] = [];

    rows.forEach((r) => {
      const sig = columns.map((c) => String(r.data[c.key] ?? '')).join('|');
      if (!seenSignatures.has(sig)) {
        seenSignatures.add(sig);
        uniqueRows.push(r);
      }
    });

    const removed = rows.length - uniqueRows.length;
    onUpdateRows(uniqueRows, {
      id: 'dedup_' + Date.now(),
      action: 'Remove Duplicates',
      details: `Removed ${removed} exact duplicate row(s).`,
      timestamp: new Date().toLocaleTimeString(),
      affectedCount: removed,
    });
  };

  // Trim Whitespace
  const handleTrimWhitespace = () => {
    let count = 0;
    const cleanedRows = rows.map((r) => {
      const updated = { ...r.data };
      columns.forEach((col) => {
        if (typeof updated[col.key] === 'string') {
          const trimmed = updated[col.key].trim();
          if (trimmed !== updated[col.key]) {
            updated[col.key] = trimmed;
            count++;
          }
        }
      });
      return { ...r, data: updated };
    });

    onUpdateRows(cleanedRows, {
      id: 'trim_' + Date.now(),
      action: 'Trim Whitespace',
      details: `Trimmed leading and trailing spaces across ${count} cell(s).`,
      timestamp: new Date().toLocaleTimeString(),
      affectedCount: count,
    });
  };

  // Standardize Casing
  const handleStandardizeCasing = () => {
    let count = 0;
    const cleanedRows = rows.map((r) => {
      const updated = { ...r.data };
      columns.forEach((col) => {
        if (selectedColumn !== 'all' && col.key !== selectedColumn) return;
        if (typeof updated[col.key] === 'string' && col.type !== 'date') {
          const val = updated[col.key].trim();
          let transformed = val;
          if (casingOption === 'title') {
            transformed = val.replace(/\w\S*/g, (txt: string) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
          } else if (casingOption === 'upper') {
            transformed = val.toUpperCase();
          } else if (casingOption === 'lower') {
            transformed = val.toLowerCase();
          }

          if (transformed !== updated[col.key]) {
            updated[col.key] = transformed;
            count++;
          }
        }
      });
      return { ...r, data: updated };
    });

    onUpdateRows(cleanedRows, {
      id: 'casing_' + Date.now(),
      action: `Standardize Casing (${casingOption.toUpperCase()})`,
      details: `Converted ${count} text values to ${casingOption} case.`,
      timestamp: new Date().toLocaleTimeString(),
      affectedCount: count,
    });
  };

  // Fill Missing Values
  const handleFillMissing = () => {
    const targetCols = selectedColumn === 'all' ? columns : columns.filter((c) => c.key === selectedColumn);
    let count = 0;

    // Calculate column-level mean/median/mode
    const colImputeValues: Record<string, any> = {};

    targetCols.forEach((col) => {
      if (col.type === 'number' || col.type === 'currency') {
        const nums = rows
          .map((r) => parseFloat(r.data[col.key]))
          .filter((n) => !isNaN(n))
          .sort((a, b) => a - b);

        if (fillValueOption === 'zero') {
          colImputeValues[col.key] = 0;
        } else if (nums.length > 0) {
          if (fillValueOption === 'median') {
            colImputeValues[col.key] = nums[Math.floor(nums.length / 2)];
          } else {
            // mean
            const sum = nums.reduce((a, b) => a + b, 0);
            colImputeValues[col.key] = Math.round((sum / nums.length) * 100) / 100;
          }
        } else {
          colImputeValues[col.key] = 0;
        }
      } else {
        // String / Categorical
        if (fillValueOption === 'mode') {
          const freq: Record<string, number> = {};
          rows.forEach((r) => {
            const v = r.data[col.key];
            if (v) freq[String(v)] = (freq[String(v)] || 0) + 1;
          });
          const topVal = Object.entries(freq).sort((a, b) => b[1] - a[1])[0]?.[0];
          colImputeValues[col.key] = topVal || 'Unknown';
        } else {
          colImputeValues[col.key] = 'N/A';
        }
      }
    });

    const cleanedRows = rows.map((r) => {
      const updated = { ...r.data };
      targetCols.forEach((col) => {
        const val = updated[col.key];
        if (val === undefined || val === null || val === '' || String(val).toLowerCase() === 'null') {
          updated[col.key] = colImputeValues[col.key];
          count++;
        }
      });
      return { ...r, data: updated };
    });

    onUpdateRows(cleanedRows, {
      id: 'fill_' + Date.now(),
      action: `Fill Missing Values (${fillValueOption})`,
      details: `Imputed ${count} missing cell(s) using ${fillValueOption}.`,
      timestamp: new Date().toLocaleTimeString(),
      affectedCount: count,
    });
  };

  // Drop Rows with Missing Values in Selected Column
  const handleDropRowsWithMissing = () => {
    const targetCols = selectedColumn === 'all' ? columns : columns.filter((c) => c.key === selectedColumn);
    const initialCount = rows.length;

    const filteredRows = rows.filter((r) => {
      return !targetCols.some((col) => {
        const val = r.data[col.key];
        return val === undefined || val === null || val === '' || String(val).toLowerCase() === 'null';
      });
    });

    const droppedCount = initialCount - filteredRows.length;
    onUpdateRows(filteredRows, {
      id: 'drop_' + Date.now(),
      action: 'Drop Incomplete Rows',
      details: `Dropped ${droppedCount} row(s) with missing required fields.`,
      timestamp: new Date().toLocaleTimeString(),
      affectedCount: droppedCount,
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Health Gauge & Action Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-emerald-950/30 to-slate-900 border border-emerald-900/40 rounded-2xl p-6 shadow-xl flex flex-wrap items-center justify-between gap-6">
        <div className="flex items-center space-x-5">
          {/* Health Score Gauge */}
          <div className="relative w-20 h-20 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col items-center justify-center shadow-inner">
            <span
              className={`text-2xl font-black font-mono ${
                audit.dataHealthScore >= 90
                  ? 'text-emerald-400'
                  : audit.dataHealthScore >= 75
                  ? 'text-amber-400'
                  : 'text-rose-400'
              }`}
            >
              {audit.dataHealthScore}%
            </span>
            <span className="text-[9px] uppercase tracking-wider text-slate-400 font-semibold">
              Data Health
            </span>
          </div>

          <div>
            <div className="flex items-center space-x-2 mb-1">
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Automated Hygiene Engine
              </span>
              <span className="text-xs text-slate-400">
                {rows.length} rows • {columns.length} columns inspected
              </span>
            </div>
            <h2 className="text-lg font-bold text-white tracking-tight">
              Data Cleaning & Quality Normalizer
            </h2>
            <p className="text-xs text-slate-300 max-w-xl leading-relaxed mt-0.5">
              Identifies missing values, duplicate entries, inconsistent whitespace, casing errors, and numerical outliers. Clean in one click or apply targeted transformations.
            </p>
          </div>
        </div>

        {/* Master 1-Click Clean CTA */}
        <div className="flex items-center space-x-3">
          {cleanHistory.length > 0 && (
            <button
              onClick={onRevertLastClean}
              className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-medium flex items-center space-x-1.5 transition-colors"
              title="Undo the most recent data cleaning action"
            >
              <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
              <span>Undo Last Action</span>
            </button>
          )}

          <button
            onClick={handleAutoCleanAll}
            disabled={rows.length === 0}
            className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center space-x-2 shadow-lg shadow-emerald-600/20 transition-all hover:scale-[1.02] disabled:opacity-50"
          >
            <Wand2 className="w-4 h-4 text-emerald-200" />
            <span>1-Click Auto-Clean All Issues</span>
          </button>
        </div>
      </div>

      {/* Hygiene Audit Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {/* Missing Values */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Missing Cells</span>
            <AlertTriangle className={`w-4 h-4 ${audit.totalMissingValues > 0 ? 'text-amber-400' : 'text-emerald-400'}`} />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-white">{audit.totalMissingValues}</span>
            <span className="text-xs text-slate-400">
              ({Math.round((audit.totalMissingValues / Math.max(rows.length * columns.length, 1)) * 100)}% empty)
            </span>
          </div>
        </div>

        {/* Duplicate Rows */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Duplicate Rows</span>
            <Layers className={`w-4 h-4 ${audit.duplicateRowsCount > 0 ? 'text-rose-400' : 'text-emerald-400'}`} />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-white">{audit.duplicateRowsCount}</span>
            <span className="text-xs text-slate-400">exact matches</span>
          </div>
        </div>

        {/* Whitespace & Casing */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Whitespace Issues</span>
            <Type className="w-4 h-4 text-teal-400" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-white">{audit.whitespaceIssuesCount}</span>
            <span className="text-xs text-slate-400">untrimmed cells</span>
          </div>
        </div>

        {/* Outliers */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Statistical Outliers</span>
            <Hash className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-white">
              {Object.values(audit.outliersByCol).reduce((a, b) => a + b, 0)}
            </span>
            <span className="text-xs text-slate-400">IQR &gt; 1.5x</span>
          </div>
        </div>
      </div>

      {/* Interactive Targeted Cleaning Operations */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Targeted Cleaning Controls */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-wider flex items-center space-x-2">
                <Wand2 className="w-4 h-4 text-emerald-400" />
                <span>Targeted Cleaning Tools</span>
              </h3>

              {/* Column Selector */}
              <div className="flex items-center space-x-2">
                <span className="text-[11px] text-slate-400">Apply to:</span>
                <select
                  value={selectedColumn}
                  onChange={(e) => setSelectedColumn(e.target.value)}
                  className="bg-slate-800 border border-slate-700 text-xs text-white rounded-lg px-2.5 py-1 focus:outline-none focus:border-emerald-500"
                >
                  <option value="all">All Columns</option>
                  {columns.map((c) => (
                    <option key={c.key} value={c.key}>
                      {c.label} ({c.type})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Action 1: Handle Missing Values */}
            <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-white block">
                    1. Impute or Handle Missing Data
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Fill empty cells with statistical measures or remove rows
                  </span>
                </div>
                <span className="text-[11px] font-mono text-amber-400 bg-amber-950/60 border border-amber-900 px-2 py-0.5 rounded">
                  {selectedColumn === 'all'
                    ? `${audit.totalMissingValues} missing total`
                    : `${audit.missingValuesByCol[selectedColumn] || 0} missing`}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-1">
                <select
                  value={fillValueOption}
                  onChange={(e) => setFillValueOption(e.target.value as any)}
                  className="bg-slate-800 border border-slate-700 text-xs text-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-emerald-500"
                >
                  <option value="mean">Mean (Average for numbers)</option>
                  <option value="median">Median (Middle value)</option>
                  <option value="mode">Mode (Most frequent category)</option>
                  <option value="zero">Fill with 0 (Zero)</option>
                  <option value="na">Fill with 'N/A'</option>
                </select>

                <button
                  onClick={handleFillMissing}
                  className="px-3.5 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-xs font-medium transition-colors"
                >
                  Fill Missing Values
                </button>

                <button
                  onClick={handleDropRowsWithMissing}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-rose-950 hover:text-rose-300 text-slate-300 border border-slate-700 text-xs font-medium transition-colors"
                >
                  Drop Rows with Missing
                </button>
              </div>
            </div>

            {/* Action 2: Remove Duplicates */}
            <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-white block">
                  2. Exact Duplicate Row Deduplication
                </span>
                <span className="text-[11px] text-slate-400">
                  {audit.duplicateRowsCount > 0
                    ? `Found ${audit.duplicateRowsCount} redundant identical row(s).`
                    : 'Zero duplicate rows detected.'}
                </span>
              </div>
              <button
                onClick={handleRemoveDuplicates}
                disabled={audit.duplicateRowsCount === 0}
                className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium transition-colors disabled:opacity-40"
              >
                Remove {audit.duplicateRowsCount} Duplicates
              </button>
            </div>

            {/* Action 3: Text Trimming & Casing */}
            <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-white block">
                    3. Text Normalization & Casing
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Strip trailing/leading spaces and format capitalizations consistently
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={handleTrimWhitespace}
                  className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium transition-colors"
                >
                  Trim Whitespaces ({audit.whitespaceIssuesCount})
                </button>

                <div className="flex items-center space-x-2">
                  <select
                    value={casingOption}
                    onChange={(e) => setCasingOption(e.target.value as any)}
                    className="bg-slate-800 border border-slate-700 text-xs text-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="title">Title Case (e.g. John Doe)</option>
                    <option value="upper">UPPERCASE (e.g. JOHN DOE)</option>
                    <option value="lower">lowercase (e.g. john doe)</option>
                  </select>

                  <button
                    onClick={handleStandardizeCasing}
                    className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium transition-colors"
                  >
                    Apply Casing
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Cleaning Audit Trail & Changelog */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-wider flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-teal-400" />
                <span>Cleaning Audit Trail ({cleanHistory.length} actions applied)</span>
              </h3>
              {cleanHistory.length > 0 && (
                <button
                  onClick={onRevertLastClean}
                  className="text-xs text-amber-400 hover:text-amber-300 font-medium flex items-center space-x-1"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Undo Last</span>
                </button>
              )}
            </div>

            {cleanHistory.length === 0 ? (
              <div className="text-xs text-slate-400 py-3 text-center">
                No cleaning actions performed yet. Use 1-Click Auto-Clean or the tools above.
              </div>
            ) : (
              <div className="space-y-2">
                {cleanHistory.map((item) => (
                  <div key={item.id} className="p-3 rounded-lg bg-slate-800/40 border border-slate-800 flex items-start justify-between">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-semibold text-white">{item.action}</span>
                        <span className="text-[10px] text-slate-400 font-mono">{item.timestamp}</span>
                      </div>
                      <p className="text-[11px] text-slate-300 mt-0.5">{item.details}</p>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-teal-950/60 text-teal-300 border border-teal-800">
                      {item.affectedCount} changes
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Col: AI Cleaning Advisor & Next Steps */}
        <div className="space-y-6">
          {/* AI Cleaning Advisor */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-indigo-400">
                <Sparkles className="w-4 h-4" />
                <h3 className="text-xs font-semibold uppercase tracking-wider">
                  AI Hygiene Advisor
                </h3>
              </div>
              <button
                onClick={fetchAdvisorSuggestions}
                disabled={isLoadingAdvisor}
                className="text-[11px] text-indigo-300 hover:text-white font-medium transition-colors"
              >
                {isLoadingAdvisor ? 'Analyzing...' : 'Scan Issues'}
              </button>
            </div>

            {advisorSuggestions.length > 0 ? (
              <div className="space-y-2.5">
                {advisorSuggestions.map((sug, i) => (
                  <div key={i} className="p-3 rounded-xl bg-indigo-950/20 border border-indigo-900/40 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-indigo-200">{sug.title}</span>
                      <span className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded ${sug.priority === 'high' ? 'bg-rose-950 text-rose-300 border border-rose-800' : 'bg-slate-800 text-slate-300'}`}>
                        {sug.priority}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-300 leading-relaxed">{sug.reason}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-slate-800/40 text-center space-y-2">
                <p className="text-xs text-slate-400 leading-relaxed">
                  Ask AI to analyze missing patterns, inconsistent strings, and statistical distribution anomalies.
                </p>
                <button
                  onClick={fetchAdvisorSuggestions}
                  disabled={isLoadingAdvisor}
                  className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-colors"
                >
                  {isLoadingAdvisor ? 'Inspecting...' : 'Get AI Advice'}
                </button>
              </div>
            )}
          </div>

          {/* Next Steps CTA */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-3">
            <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
              Next Steps After Cleaning
            </span>
            <div className="space-y-2">
              <button
                onClick={() => onNavigateToTab('analytics')}
                className="w-full text-left p-3 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/80 transition-all flex items-center justify-between group"
              >
                <div>
                  <span className="text-xs font-semibold text-white group-hover:text-teal-300 block">
                    Statistical Analysis & Charts →
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Explore distributions, means, medians, and correlations
                  </span>
                </div>
              </button>

              <button
                onClick={() => onNavigateToTab('report')}
                className="w-full text-left p-3 rounded-xl bg-indigo-950/30 hover:bg-indigo-950/50 border border-indigo-800/50 transition-all flex items-center justify-between group"
              >
                <div>
                  <span className="text-xs font-semibold text-indigo-300 group-hover:text-white block">
                    Generate Full Analysis Report →
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Executive summary, deep dives, risk factors, & PDF export
                  </span>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
