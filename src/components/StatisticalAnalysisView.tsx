import React, { useState, useMemo } from 'react';
import {
  BarChart3,
  TrendingUp,
  Hash,
  Layers,
  ArrowUpDown,
  Filter,
  PieChart,
  Table,
  CheckCircle2,
  Sliders,
  DollarSign,
  Type,
} from 'lucide-react';
import { ColumnDef, ExtractedRow } from '../types';

interface StatisticalAnalysisViewProps {
  columns: ColumnDef[];
  rows: ExtractedRow[];
  spreadsheetTitle: string;
}

export const StatisticalAnalysisView: React.FC<StatisticalAnalysisViewProps> = ({
  columns,
  rows,
  spreadsheetTitle,
}) => {
  const [selectedGroupByCol, setSelectedGroupByCol] = useState<string>('');
  const [selectedMetricCol, setSelectedMetricCol] = useState<string>('');
  const [aggregationType, setAggregationType] = useState<'sum' | 'avg' | 'count'>('sum');

  // Identify numeric vs categorical columns
  const numericColumns = useMemo(
    () => columns.filter((c) => c.type === 'number' || c.type === 'currency'),
    [columns]
  );
  const categoricalColumns = useMemo(
    () => columns.filter((c) => c.type !== 'number' && c.type !== 'currency' && c.key !== '_sheet'),
    [columns]
  );

  // Set default group by and metric if not set
  useMemo(() => {
    if (!selectedGroupByCol && categoricalColumns.length > 0) {
      setSelectedGroupByCol(categoricalColumns[0].key);
    }
    if (!selectedMetricCol && numericColumns.length > 0) {
      setSelectedMetricCol(numericColumns[0].key);
    }
  }, [categoricalColumns, numericColumns, selectedGroupByCol, selectedMetricCol]);

  // Compute Descriptive Statistics per numeric column
  const numericStats = useMemo(() => {
    const statsMap: Record<
      string,
      {
        count: number;
        mean: number;
        median: number;
        stdDev: number;
        min: number;
        q1: number;
        q3: number;
        max: number;
        iqr: number;
        sum: number;
        buckets: { range: string; count: number; percent: number }[];
      }
    > = {};

    numericColumns.forEach((col) => {
      const numbers = rows
        .map((r) => {
          const v = r.data[col.key];
          return typeof v === 'number' ? v : parseFloat(v);
        })
        .filter((n) => !isNaN(n))
        .sort((a, b) => a - b);

      if (numbers.length === 0) return;

      const sum = numbers.reduce((a, b) => a + b, 0);
      const mean = Math.round((sum / numbers.length) * 100) / 100;
      const median = numbers[Math.floor(numbers.length / 2)];
      const min = numbers[0];
      const max = numbers[numbers.length - 1];
      const q1 = numbers[Math.floor(numbers.length * 0.25)];
      const q3 = numbers[Math.floor(numbers.length * 0.75)];
      const iqr = q3 - q1;

      // Variance & StdDev
      const variance = numbers.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / numbers.length;
      const stdDev = Math.round(Math.sqrt(variance) * 100) / 100;

      // Build 5 distribution histogram buckets
      const range = max - min;
      const bucketCount = 5;
      const bucketSize = range > 0 ? range / bucketCount : 1;
      const buckets = Array.from({ length: bucketCount }, (_, i) => {
        const start = min + i * bucketSize;
        const end = i === bucketCount - 1 ? max : start + bucketSize;
        const count = numbers.filter((n) => (i === bucketCount - 1 ? n >= start && n <= end : n >= start && n < end)).length;
        const percent = Math.round((count / numbers.length) * 100);
        return {
          range: `${Math.round(start).toLocaleString()} - ${Math.round(end).toLocaleString()}`,
          count,
          percent,
        };
      });

      statsMap[col.key] = {
        count: numbers.length,
        mean,
        median,
        stdDev,
        min,
        q1,
        q3,
        max,
        iqr,
        sum,
        buckets,
      };
    });

    return statsMap;
  }, [numericColumns, rows]);

  // Compute Categorical Top Frequencies
  const categoricalStats = useMemo(() => {
    const map: Record<string, { uniqueCount: number; topValues: { value: string; count: number; percent: number }[] }> = {};

    categoricalColumns.forEach((col) => {
      const freq: Record<string, number> = {};
      let totalFilled = 0;

      rows.forEach((r) => {
        const val = r.data[col.key];
        if (val !== undefined && val !== null && val !== '') {
          const str = String(val).trim();
          freq[str] = (freq[str] || 0) + 1;
          totalFilled++;
        }
      });

      const uniqueCount = Object.keys(freq).length;
      const topValues = Object.entries(freq)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([value, count]) => ({
          value,
          count,
          percent: totalFilled > 0 ? Math.round((count / totalFilled) * 100) : 0,
        }));

      map[col.key] = { uniqueCount, topValues };
    });

    return map;
  }, [categoricalColumns, rows]);

  // Dynamic Group By & Aggregation table
  const groupAggregation = useMemo(() => {
    if (!selectedGroupByCol) return [];

    const groupMap: Record<string, { count: number; sum: number; values: number[] }> = {};

    rows.forEach((r) => {
      const groupKey = String(r.data[selectedGroupByCol] ?? 'Unspecified').trim() || 'Empty';
      if (!groupMap[groupKey]) {
        groupMap[groupKey] = { count: 0, sum: 0, values: [] };
      }
      groupMap[groupKey].count++;

      if (selectedMetricCol) {
        const val = parseFloat(r.data[selectedMetricCol]);
        if (!isNaN(val)) {
          groupMap[groupKey].sum += val;
          groupMap[groupKey].values.push(val);
        }
      }
    });

    return Object.entries(groupMap)
      .map(([group, stats]) => {
        const avg = stats.values.length > 0 ? stats.sum / stats.values.length : 0;
        return {
          group,
          count: stats.count,
          sum: Math.round(stats.sum * 100) / 100,
          avg: Math.round(avg * 100) / 100,
        };
      })
      .sort((a, b) => {
        if (aggregationType === 'sum') return b.sum - a.sum;
        if (aggregationType === 'avg') return b.avg - a.avg;
        return b.count - a.count;
      });
  }, [rows, selectedGroupByCol, selectedMetricCol, aggregationType]);

  const metricColDef = columns.find((c) => c.key === selectedMetricCol);

  return (
    <div className="space-y-6">
      {/* Overview Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/30 to-slate-900 border border-indigo-900/40 rounded-2xl p-6 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 mb-1">
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              Statistical Profiling
            </span>
            <span className="text-xs text-slate-400">
              {rows.length} rows • {numericColumns.length} numerical metrics • {categoricalColumns.length} dimensions
            </span>
          </div>
          <h2 className="text-lg font-bold text-white tracking-tight">
            Data Distribution & Statistical Analysis
          </h2>
          <p className="text-xs text-slate-300 max-w-xl leading-relaxed mt-0.5">
            Examine parametric statistics, variance, quartiles, histogram distributions, and cross-column segment aggregations.
          </p>
        </div>
      </div>

      {/* Numeric Variables Descriptive Statistics Table */}
      {numericColumns.length > 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Hash className="w-4 h-4 text-emerald-400" />
              <h3 className="text-xs font-semibold text-white uppercase tracking-wider">
                Descriptive Numerical Statistics ({numericColumns.length} metrics)
              </h3>
            </div>
            <span className="text-[11px] text-slate-400">
              Values calculated across valid non-null rows
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-950/80 text-slate-400 text-[11px] font-semibold border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-4">Metric Column</th>
                  <th className="py-2.5 px-3">Count</th>
                  <th className="py-2.5 px-3">Mean (&mu;)</th>
                  <th className="py-2.5 px-3">Std Dev (&sigma;)</th>
                  <th className="py-2.5 px-3">Min</th>
                  <th className="py-2.5 px-3">25% (Q1)</th>
                  <th className="py-2.5 px-3">Median</th>
                  <th className="py-2.5 px-3">75% (Q3)</th>
                  <th className="py-2.5 px-3">Max</th>
                  <th className="py-2.5 px-3">Sum Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 font-mono text-slate-200">
                {numericColumns.map((col) => {
                  const s = numericStats[col.key];
                  if (!s) return null;
                  const isCur = col.type === 'currency';

                  return (
                    <tr key={col.key} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4 font-sans font-medium text-white flex items-center space-x-1.5">
                        <span className="truncate">{col.label}</span>
                      </td>
                      <td className="py-3 px-3 text-slate-400">{s.count}</td>
                      <td className="py-3 px-3 text-emerald-400 font-semibold">
                        {isCur ? `$${s.mean.toLocaleString()}` : s.mean.toLocaleString()}
                      </td>
                      <td className="py-3 px-3 text-slate-300">&plusmn;{s.stdDev.toLocaleString()}</td>
                      <td className="py-3 px-3 text-slate-400">{isCur ? `$${s.min.toLocaleString()}` : s.min.toLocaleString()}</td>
                      <td className="py-3 px-3 text-slate-400">{isCur ? `$${s.q1.toLocaleString()}` : s.q1.toLocaleString()}</td>
                      <td className="py-3 px-3 text-teal-300 font-semibold">
                        {isCur ? `$${s.median.toLocaleString()}` : s.median.toLocaleString()}
                      </td>
                      <td className="py-3 px-3 text-slate-400">{isCur ? `$${s.q3.toLocaleString()}` : s.q3.toLocaleString()}</td>
                      <td className="py-3 px-3 text-slate-400">{isCur ? `$${s.max.toLocaleString()}` : s.max.toLocaleString()}</td>
                      <td className="py-3 px-3 text-emerald-400 font-bold">
                        {isCur ? `$${s.sum.toLocaleString()}` : s.sum.toLocaleString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-center text-xs text-slate-400">
          No numeric columns detected in this dataset.
        </div>
      )}

      {/* Visual Distribution Histograms */}
      {numericColumns.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {numericColumns.slice(0, 4).map((col) => {
            const s = numericStats[col.key];
            if (!s) return null;

            return (
              <div key={col.key} className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <BarChart3 className="w-4 h-4 text-teal-400" />
                    <span className="text-xs font-semibold text-white">{col.label} Distribution</span>
                  </div>
                  <span className="text-[11px] text-slate-400">Mean: {s.mean.toLocaleString()}</span>
                </div>

                {/* Histogram Bars */}
                <div className="space-y-2 pt-1">
                  {s.buckets.map((b, bIdx) => (
                    <div key={bIdx} className="space-y-1">
                      <div className="flex justify-between text-[10px] text-slate-300">
                        <span className="truncate max-w-[180px] font-mono">{b.range}</span>
                        <span className="text-teal-400 font-mono font-semibold">
                          {b.count} ({b.percent}%)
                        </span>
                      </div>
                      <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-teal-500 to-emerald-400 rounded-full transition-all duration-500"
                          style={{ width: `${Math.max(b.percent, 3)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Categorical Dimension Breakdown */}
      {categoricalColumns.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <PieChart className="w-4 h-4 text-purple-400" />
              <h3 className="text-xs font-semibold text-white uppercase tracking-wider">
                Categorical Dimensions & Top Frequencies
              </h3>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {categoricalColumns.slice(0, 6).map((col) => {
              const cStat = categoricalStats[col.key];
              if (!cStat) return null;

              return (
                <div key={col.key} className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-800 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-200 truncate">{col.label}</span>
                    <span className="text-[10px] font-mono text-purple-300 bg-purple-950/60 border border-purple-900 px-1.5 py-0.5 rounded">
                      {cStat.uniqueCount} unique
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    {cStat.topValues.map((tv, idx) => (
                      <div key={idx} className="space-y-0.5">
                        <div className="flex justify-between text-[10px] text-slate-300">
                          <span className="truncate max-w-[140px] font-medium">{tv.value || '(Empty)'}</span>
                          <span className="text-slate-400 font-mono">{tv.count} ({tv.percent}%)</span>
                        </div>
                        <div className="h-1 bg-slate-700/60 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-purple-500 rounded-full"
                            style={{ width: `${tv.percent}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Group By / Segment Aggregation Tool */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center space-x-2">
            <Sliders className="w-4 h-4 text-teal-400" />
            <h3 className="text-xs font-semibold text-white uppercase tracking-wider">
              Segment Aggregator & Cross-Tabulation
            </h3>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Group By Selector */}
            <div className="flex items-center space-x-1.5">
              <span className="text-[11px] text-slate-400">Group by:</span>
              <select
                value={selectedGroupByCol}
                onChange={(e) => setSelectedGroupByCol(e.target.value)}
                className="bg-slate-800 border border-slate-700 text-xs text-white rounded-lg px-2.5 py-1 focus:outline-none focus:border-teal-500"
              >
                {categoricalColumns.map((c) => (
                  <option key={c.key} value={c.key}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Metric Selector */}
            {numericColumns.length > 0 && (
              <div className="flex items-center space-x-1.5">
                <span className="text-[11px] text-slate-400">Metric:</span>
                <select
                  value={selectedMetricCol}
                  onChange={(e) => setSelectedMetricCol(e.target.value)}
                  className="bg-slate-800 border border-slate-700 text-xs text-white rounded-lg px-2.5 py-1 focus:outline-none focus:border-teal-500"
                >
                  {numericColumns.map((c) => (
                    <option key={c.key} value={c.key}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Aggregation Function */}
            <div className="flex items-center bg-slate-800 border border-slate-700 rounded-lg p-0.5 text-xs">
              <button
                onClick={() => setAggregationType('sum')}
                className={`px-2.5 py-0.5 rounded text-[11px] font-medium transition-all ${
                  aggregationType === 'sum' ? 'bg-teal-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Sum
              </button>
              <button
                onClick={() => setAggregationType('avg')}
                className={`px-2.5 py-0.5 rounded text-[11px] font-medium transition-all ${
                  aggregationType === 'avg' ? 'bg-teal-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Average
              </button>
              <button
                onClick={() => setAggregationType('count')}
                className={`px-2.5 py-0.5 rounded text-[11px] font-medium transition-all ${
                  aggregationType === 'count' ? 'bg-teal-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Count
              </button>
            </div>
          </div>
        </div>

        {/* Aggregated Table */}
        <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/40">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-slate-950/80 text-slate-400 text-[11px] font-semibold border-b border-slate-800">
              <tr>
                <th className="py-2.5 px-4">Segment / Category</th>
                <th className="py-2.5 px-3">Records Count</th>
                {selectedMetricCol && (
                  <>
                    <th className="py-2.5 px-3">Sum Total</th>
                    <th className="py-2.5 px-3">Average</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 font-mono text-slate-200">
              {groupAggregation.slice(0, 15).map((row, idx) => (
                <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-2.5 px-4 font-sans font-medium text-white">{row.group}</td>
                  <td className="py-2.5 px-3 text-slate-400">{row.count}</td>
                  {selectedMetricCol && (
                    <>
                      <td className="py-2.5 px-3 text-emerald-400 font-semibold">
                        {metricColDef?.type === 'currency' ? `$${row.sum.toLocaleString()}` : row.sum.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 text-teal-300">
                        {metricColDef?.type === 'currency' ? `$${row.avg.toLocaleString()}` : row.avg.toLocaleString()}
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
