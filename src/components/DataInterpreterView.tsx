import React, { useState } from 'react';
import {
  Sparkles,
  TrendingUp,
  AlertTriangle,
  Lightbulb,
  Send,
  HelpCircle,
  FileSpreadsheet,
  CheckCircle2,
  RefreshCw,
  FolderOpen,
  ArrowUpRight,
  ArrowDownRight,
  ShieldCheck,
  Layers,
  BarChart2,
  MessageSquare,
} from 'lucide-react';
import { ColumnDef, DataInterpretation, ExtractedRow, FolderFile } from '../types';

interface DataInterpreterViewProps {
  spreadsheetTitle: string;
  columns: ColumnDef[];
  rows: ExtractedRow[];
  files: FolderFile[];
  interpretation: DataInterpretation | null;
  onRunInterpretation: () => void;
  isInterpreting: boolean;
}

export const DataInterpreterView: React.FC<DataInterpreterViewProps> = ({
  spreadsheetTitle,
  columns,
  rows,
  files,
  interpretation,
  onRunInterpretation,
  isInterpreting,
}) => {
  const [question, setQuestion] = useState('');
  const [isAsking, setIsAsking] = useState(false);
  const [qaHistory, setQaHistory] = useState<{ query: string; answer: string; time: string }[]>([]);

  // Calculate quick stats on client
  const numericStats: Record<string, { sum: number; avg: number; min: number; max: number }> = {};
  columns.forEach((col) => {
    if (col.type === 'currency' || col.type === 'number') {
      const numbers = rows
        .map((r) => {
          const v = r.data[col.key];
          return typeof v === 'number' ? v : parseFloat(v);
        })
        .filter((n) => !isNaN(n));

      if (numbers.length > 0) {
        const sum = numbers.reduce((a, b) => a + b, 0);
        numericStats[col.key] = {
          sum,
          avg: Math.round((sum / numbers.length) * 100) / 100,
          min: Math.min(...numbers),
          max: Math.max(...numbers),
        };
      }
    }
  });

  const handleAskQuestion = async (customQuery?: string) => {
    const q = customQuery || question;
    if (!q.trim() || isAsking) return;

    setIsAsking(true);
    try {
      const res = await fetch('/api/ask-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: q,
          columns,
          rowsSample: rows.slice(0, 40).map((r) => ({
            file: r.fileName,
            sheet: r.sheetName,
            ...r.data,
          })),
          totalRows: rows.length,
          numericStats,
          workbooks: files.filter((f) => f.workbookData).map((f) => f.name),
        }),
      });

      let answered = false;
      if (res.ok) {
        const data = await res.json();
        if (data.answer) {
          setQaHistory((prev) => [
            { query: q, answer: data.answer, time: new Date().toLocaleTimeString() },
            ...prev,
          ]);
          if (!customQuery) setQuestion('');
          answered = true;
        }
      }

      if (!answered) {
        // Fallback: client-side statistical response generator
        const lowerQ = q.toLowerCase();
        let fallbackAnswer = '';

        if (lowerQ.includes('total') || lowerQ.includes('average') || lowerQ.includes('sum') || lowerQ.includes('mean')) {
          const statsList = Object.entries(numericStats)
            .map(([col, s]: [string, any]) => `• ${col}: Total Sum = ${s.sum.toLocaleString()}, Mean/Avg = ${s.avg.toLocaleString()}, Min = ${s.min.toLocaleString()}, Max = ${s.max.toLocaleString()} (across ${s.count} values)`)
            .join('\n');
          fallbackAnswer = `Here are the quantitative summaries across the consolidated dataset:\n${statsList || 'No numeric columns detected.'}`;
        } else if (lowerQ.includes('workbook') || lowerQ.includes('sheet') || lowerQ.includes('file') || lowerQ.includes('highest')) {
          const wbCounts: Record<string, number> = {};
          rows.forEach((r) => {
            const wb = (r.data['_workbook'] as string) || r.fileName || 'Master';
            wbCounts[wb] = (wbCounts[wb] || 0) + 1;
          });
          const sorted = Object.entries(wbCounts).sort((a, b) => b[1] - a[1]);
          fallbackAnswer = `Workbook breakdown (${rows.length} total rows):\n` +
            sorted.map(([name, count]) => `• ${name}: ${count} rows (${Math.round((count / Math.max(1, rows.length)) * 100)}%)`).join('\n') +
            (sorted.length > 0 ? `\n\nTop workbook by volume: "${sorted[0][0]}" with ${sorted[0][1]} rows.` : '');
        } else if (lowerQ.includes('anomaly') || lowerQ.includes('outlier') || lowerQ.includes('missing')) {
          fallbackAnswer = interpretation?.anomalies?.length
            ? `Detected anomalies & outliers:\n${interpretation.anomalies.map((a) => `• ${a}`).join('\n')}`
            : 'No extreme anomalies detected in current active columns.';
        } else {
          fallbackAnswer = `Summary for "${q}":\nThis dataset contains ${rows.length} combined records across ${columns.length} columns. ` +
            (interpretation?.executiveSummary ? `\nExecutive Overview: ${interpretation.executiveSummary}\n` : '') +
            `\nKey Findings:\n${(interpretation?.keyFindings || []).slice(0, 3).map((f) => `• ${f}`).join('\n')}`;
        }

        setQaHistory((prev) => [
          { query: q, answer: fallbackAnswer, time: new Date().toLocaleTimeString() },
          ...prev,
        ]);
        if (!customQuery) setQuestion('');
      }
    } catch (err) {
      console.warn('Backend /api/ask-data unavailable, providing client answer:', err);
      const fallbackAnswer = `Summary for "${q}":\nConsolidated dataset has ${rows.length} rows and ${columns.length} columns.` +
        (interpretation?.executiveSummary ? `\n${interpretation.executiveSummary}` : '');
      setQaHistory((prev) => [
        { query: q, answer: fallbackAnswer, time: new Date().toLocaleTimeString() },
        ...prev,
      ]);
      if (!customQuery) setQuestion('');
    } finally {
      setIsAsking(false);
    }
  };

  const sampleQuestions = [
    'What are the key totals and averages across all combined workbooks?',
    'Which workbook or sheet has the highest recorded volume/value?',
    'Are there any anomalies, outliers, or missing values in this dataset?',
    'Compare the performance or numbers between different sheets.',
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner with Run Interpretation CTA */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-indigo-900/50 rounded-2xl p-6 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              AI Data Intelligence
            </span>
            <span className="text-xs text-slate-400">
              {rows.length} rows combined across {files.length} source file(s)
            </span>
          </div>
          <h2 className="text-lg font-bold text-white tracking-tight">
            Workbook Interpretation & Synthesis Engine
          </h2>
          <p className="text-xs text-slate-300 max-w-2xl leading-relaxed mt-0.5">
            Machine learning analyzes correlations, sums, workbook-to-workbook variances, anomalies, and operational insights from your combined Excel data.
          </p>
        </div>

        <button
          onClick={onRunInterpretation}
          disabled={isInterpreting || rows.length === 0}
          className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center space-x-2 shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-50"
        >
          <Sparkles className={`w-4 h-4 text-amber-300 ${isInterpreting ? 'animate-spin' : ''}`} />
          <span>{isInterpreting ? 'Interpreting Data...' : 'Generate Full AI Interpretation'}</span>
        </button>
      </div>

      {/* KPI Cards Strip */}
      {interpretation?.metrics && interpretation.metrics.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {interpretation.metrics.map((metric, i) => (
            <div key={i} className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <span className="text-xs text-slate-400 block mb-1 font-medium truncate">
                {metric.label}
              </span>
              <div className="flex items-baseline space-x-2">
                <span className="text-2xl font-bold text-white">{metric.value}</span>
                {metric.change && (
                  <span
                    className={`text-[10px] font-semibold flex items-center ${
                      metric.trend === 'up'
                        ? 'text-emerald-400'
                        : metric.trend === 'down'
                        ? 'text-rose-400'
                        : 'text-slate-400'
                    }`}
                  >
                    {metric.trend === 'up' && <ArrowUpRight className="w-3 h-3" />}
                    {metric.trend === 'down' && <ArrowDownRight className="w-3 h-3" />}
                    {metric.change}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Interpretation Results Layout */}
      {interpretation ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left 2 Cols: Executive Summary & Findings */}
          <div className="lg:col-span-2 space-y-6">
            {/* Executive Summary */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <FileSpreadsheet className="w-4 h-4 text-teal-400" />
                  <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
                    Executive Synopsis
                  </h3>
                </div>
                {interpretation.dataQualityRating !== undefined && (
                  <span className="text-[11px] px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-800 text-emerald-300 font-medium">
                    Data Quality: {interpretation.dataQualityRating}/100
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                {interpretation.executiveSummary}
              </p>
            </div>

            {/* Key Quantitative Findings */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-3">
              <div className="flex items-center space-x-2">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
                  Key Observations & Statistical Trends ({interpretation.keyFindings.length})
                </h3>
              </div>
              <ul className="space-y-2 text-xs text-slate-300">
                {interpretation.keyFindings.map((finding, idx) => (
                  <li key={idx} className="flex items-start space-x-2.5 p-2 rounded-lg bg-slate-800/40">
                    <span className="w-5 h-5 rounded-full bg-slate-800 flex items-center justify-center text-teal-400 font-mono text-[10px] shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <span className="leading-relaxed">{finding}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Cross-Workbook Comparison */}
            {interpretation.workbookComparison && interpretation.workbookComparison.length > 0 && (
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-3">
                <div className="flex items-center space-x-2">
                  <FolderOpen className="w-4 h-4 text-teal-400" />
                  <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
                    Workbook Contribution & Variance
                  </h3>
                </div>
                <div className="divide-y divide-slate-800">
                  {interpretation.workbookComparison.map((wb, idx) => (
                    <div key={idx} className="py-2.5 first:pt-0 last:pb-0 flex items-start justify-between space-x-4">
                      <div>
                        <span className="text-xs font-semibold text-white block">{wb.workbookName}</span>
                        <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">{wb.summary}</p>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-teal-300 border border-slate-700 shrink-0">
                        {wb.rowCount} rows
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Col: Anomalies & Recommendations */}
          <div className="space-y-6">
            {/* Anomalies Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-3">
              <div className="flex items-center space-x-2 text-amber-400">
                <AlertTriangle className="w-4 h-4" />
                <h3 className="text-xs font-semibold uppercase tracking-wider">
                  Outliers & Verification Flags
                </h3>
              </div>
              {interpretation.anomalies.length > 0 ? (
                <ul className="space-y-2 text-xs text-amber-200/90">
                  {interpretation.anomalies.map((anom, idx) => (
                    <li key={idx} className="p-2.5 rounded-lg bg-amber-950/20 border border-amber-900/40 leading-relaxed">
                      {anom}
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-xs text-slate-400 flex items-center space-x-2 p-2 rounded-lg bg-slate-800/40">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>No data anomalies detected across combined sheets.</span>
                </div>
              )}
            </div>

            {/* Recommendations */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-3">
              <div className="flex items-center space-x-2 text-indigo-400">
                <Lightbulb className="w-4 h-4" />
                <h3 className="text-xs font-semibold uppercase tracking-wider">
                  Actionable Insights
                </h3>
              </div>
              <ul className="space-y-2 text-xs text-slate-300">
                {interpretation.recommendations.map((rec, idx) => (
                  <li key={idx} className="p-2.5 rounded-lg bg-indigo-950/20 border border-indigo-900/40 leading-relaxed">
                    • {rec}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-10 text-center">
          <Sparkles className="w-10 h-10 text-indigo-400 mx-auto mb-3 opacity-80" />
          <h3 className="text-sm font-semibold text-white mb-1">
            Data Ready for Automated Interpretation
          </h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto mb-5 leading-relaxed">
            Click below to generate high-level executive summaries, cross-workbook trends, KPI aggregates, and quality audits from all your uploaded workbooks.
          </p>
          <button
            onClick={onRunInterpretation}
            disabled={isInterpreting || rows.length === 0}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold inline-flex items-center space-x-2 shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-50"
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>Generate Full AI Interpretation</span>
          </button>
        </div>
      )}

      {/* Interactive Natural Language Q&A / Ask Your Data */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Ask Anything About Your Combined Data</h3>
            <p className="text-xs text-slate-400">
              Query metrics, compare sheets, calculate sums, or search specific details across all workbooks
            </p>
          </div>
        </div>

        {/* Quick Suggestion Chips */}
        <div className="flex flex-wrap gap-2">
          {sampleQuestions.map((q, idx) => (
            <button
              key={idx}
              onClick={() => handleAskQuestion(q)}
              disabled={isAsking}
              className="text-[11px] px-3 py-1 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 hover:border-teal-500/50 transition-all disabled:opacity-50"
            >
              {q}
            </button>
          ))}
        </div>

        {/* Query Input Bar */}
        <div className="flex items-center space-x-2">
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAskQuestion();
            }}
            placeholder="e.g. What is the total sum for Q1 across all workbooks? Which file has the largest values?"
            className="flex-1 bg-slate-800/90 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-teal-500 transition-colors"
          />
          <button
            onClick={() => handleAskQuestion()}
            disabled={isAsking || !question.trim()}
            className="px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold flex items-center space-x-1.5 shadow-sm transition-colors disabled:opacity-50"
          >
            {isAsking ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            <span>{isAsking ? 'Thinking...' : 'Ask AI'}</span>
          </button>
        </div>

        {/* Q&A Results Stream */}
        {qaHistory.length > 0 && (
          <div className="space-y-4 pt-2">
            {qaHistory.map((qa, index) => (
              <div key={index} className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-teal-400 flex items-center space-x-1.5">
                    <span>Q: {qa.query}</span>
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">{qa.time}</span>
                </div>
                <div className="text-xs text-slate-200 leading-relaxed whitespace-pre-wrap font-sans pl-2 border-l-2 border-teal-500/40">
                  {qa.answer}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
