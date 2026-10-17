import React, { useState, useMemo } from 'react';
import {
  FileText,
  Download,
  Printer,
  Copy,
  Check,
  Sparkles,
  RefreshCw,
  ShieldCheck,
  TrendingUp,
  AlertTriangle,
  Lightbulb,
  CheckCircle2,
  Layers,
  ArrowRight,
  ExternalLink,
  BarChart3,
  PieChart,
  Hash,
  Table as TableIcon,
  FileType,
} from 'lucide-react';
import { ColumnDef, ExtractedRow, FullAnalysisReport } from '../types';
import { downloadReportAsDocx, downloadReportAsPdf } from '../utils/reportExporter';

interface FullAnalysisReportViewProps {
  report: FullAnalysisReport | null;
  onGenerateReport: () => void;
  isGenerating: boolean;
  spreadsheetTitle: string;
  columns: ColumnDef[];
  rows: ExtractedRow[];
  onExportExcel: () => void;
}

export const FullAnalysisReportView: React.FC<FullAnalysisReportViewProps> = ({
  report,
  onGenerateReport,
  isGenerating,
  spreadsheetTitle,
  columns,
  rows,
  onExportExcel,
}) => {
  const [copied, setCopied] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isExportingDocx, setIsExportingDocx] = useState(false);
  const [exportStatusText, setExportStatusText] = useState<string>('');
  const [pdfError, setPdfError] = useState<string | null>(null);

  // Compute live numeric distributions and charts data to embed directly in the full report
  const numericColumns = useMemo(
    () => columns.filter((c) => c.type === 'number' || c.type === 'currency'),
    [columns]
  );
  const categoricalColumns = useMemo(
    () => columns.filter((c) => c.type !== 'number' && c.type !== 'currency' && c.key !== '_sheet' && c.key !== '_workbook'),
    [columns]
  );

  const numericStats = useMemo(() => {
    return numericColumns.map((col) => {
      const numbers = rows
        .map((r) => {
          const v = r.data[col.key];
          return typeof v === 'number' ? v : parseFloat(v);
        })
        .filter((n) => !isNaN(n))
        .sort((a, b) => a - b);

      if (numbers.length === 0) return null;

      const sum = numbers.reduce((a, b) => a + b, 0);
      const mean = Math.round((sum / numbers.length) * 100) / 100;
      const median = numbers[Math.floor(numbers.length / 2)];
      const min = numbers[0];
      const max = numbers[numbers.length - 1];
      const q1 = numbers[Math.floor(numbers.length * 0.25)];
      const q3 = numbers[Math.floor(numbers.length * 0.75)];

      const variance = numbers.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / numbers.length;
      const stdDev = Math.round(Math.sqrt(variance) * 100) / 100;

      // 4 distribution histogram buckets
      const range = max - min;
      const bucketCount = 4;
      const bucketSize = range > 0 ? range / bucketCount : 1;
      const buckets = Array.from({ length: bucketCount }, (_, i) => {
        const start = min + i * bucketSize;
        const end = i === bucketCount - 1 ? max : start + bucketSize;
        const count = numbers.filter((n) =>
          i === bucketCount - 1 ? n >= start && n <= end : n >= start && n < end
        ).length;
        const percent = Math.round((count / numbers.length) * 100);
        return {
          range: `${Math.round(start).toLocaleString()} - ${Math.round(end).toLocaleString()}`,
          count,
          percent,
        };
      });

      return {
        key: col.key,
        label: col.label,
        type: col.type,
        count: numbers.length,
        mean,
        median,
        stdDev,
        min,
        q1,
        q3,
        max,
        sum,
        buckets,
      };
    }).filter(Boolean);
  }, [numericColumns, rows]);

  // Handle Download DOCX
  const handleDownloadDocx = async () => {
    if (!report) return;
    setIsExportingDocx(true);
    try {
      await downloadReportAsDocx(report, columns, rows, spreadsheetTitle || 'Data_Analysis_Report');
    } catch (err) {
      console.error('Failed to export DOCX:', err);
    } finally {
      setIsExportingDocx(false);
    }
  };

  // Handle Download PDF
  const handleDownloadPdf = async () => {
    if (!report) return;
    setIsExportingPdf(true);
    setPdfError(null);
    setExportStatusText('Rendering report charts and tables...');
    try {
      await downloadReportAsPdf('full-report-content-container', spreadsheetTitle || 'Data_Analysis_Report', (status) => {
        setExportStatusText(status);
      });
    } catch (err: any) {
      console.error('Failed to export PDF:', err);
      setPdfError(err?.message || 'Failed to export PDF. You can also use the Print button to save as PDF.');
    } finally {
      setIsExportingPdf(false);
      setExportStatusText('');
    }
  };

  // Generate markdown format of the report for download / copy
  const generateMarkdownReport = (): string => {
    if (!report) return '';
    return `# ${report.reportTitle}
Generated: ${new Date(report.generatedAt).toLocaleString()}
Dataset: ${spreadsheetTitle || 'Excel Dataset'} | Records: ${report.datasetSummary.totalRows} | Columns: ${report.datasetSummary.totalColumns} | Data Health: ${report.datasetSummary.healthScore}%

---

## 1. Executive Summary
${report.executiveSummary}

---

## 2. Strategic Insights & Patterns
${report.strategicInsights.map((ins, i) => `### ${i + 1}. ${ins.title} [Impact: ${ins.impact.toUpperCase()}]\n${ins.description}`).join('\n\n')}

---

## 3. Statistical Analysis & Data Distribution
${report.statisticalNarrative}

---

## 4. Key Variable Deep Dives
${report.columnDeepDives.map((cd) => `- **${cd.columnLabel}** (${cd.type}): ${cd.summary}\n  *Pattern:* ${cd.patternObservation}`).join('\n')}

---

## 5. Risk Factors & Detected Anomalies
${report.riskAndAnomalies.map((risk, i) => `### Risk ${i + 1}: ${risk.issue} [Severity: ${risk.severity.toUpperCase()}]\nAffected Columns: ${risk.affectedColumns.join(', ')}\nRecommendation: ${risk.recommendation}`).join('\n\n')}

---

## 6. Actionable Strategic Recommendations
${report.actionableRecommendations.map((rec, i) => `${i + 1}. [${rec.priority.toUpperCase()} Priority - ${rec.category}] ${rec.recommendation}`).join('\n')}

---

## 7. Strategic Conclusion
${report.conclusion}
`;
  };

  const handleDownloadMarkdown = () => {
    const md = generateMarkdownReport();
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Analysis_Report_${(spreadsheetTitle || 'dataset').toLowerCase().replace(/[^a-z0-9]/g, '_')}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleCopyReport = async () => {
    const md = generateMarkdownReport();
    await navigator.clipboard.writeText(md);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handlePrint = () => {
    window.print();
  };

  if (!report) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center max-w-2xl mx-auto shadow-xl space-y-5">
        <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mx-auto shadow-inner">
          <FileText className="w-8 h-8" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-white mb-2">
            Generate Comprehensive Analysis Report
          </h2>
          <p className="text-xs text-slate-300 leading-relaxed max-w-md mx-auto">
            Machine Learning will synthesize all <strong>{rows.length} rows</strong> and <strong>{columns.length} columns</strong> of your uploaded Excel workbook into a complete analysis report with embedded charts, tables, and downloadable DOCX and PDF formats.
          </p>
        </div>

        <button
          onClick={onGenerateReport}
          disabled={isGenerating || rows.length === 0}
          className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold inline-flex items-center space-x-2 shadow-lg shadow-indigo-600/30 transition-all hover:scale-[1.02] disabled:opacity-50"
        >
          <Sparkles className={`w-4 h-4 text-amber-300 ${isGenerating ? 'animate-spin' : ''}`} />
          <span>{isGenerating ? 'Compiling Full Analysis Report...' : 'Generate Full Analysis Report Now'}</span>
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 print:space-y-4 print:text-black">
      {/* Top Action Header (hidden on print) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-wrap items-center justify-between gap-4 print:hidden">
        <div>
          <div className="flex items-center space-x-2 mb-1">
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              Executive Intelligence Report
            </span>
            <span className="text-xs text-slate-400">
              Generated {new Date(report.generatedAt).toLocaleString()}
            </span>
          </div>
          <h2 className="text-lg font-bold text-white tracking-tight">
            {report.reportTitle}
          </h2>
        </div>

        {/* Download Buttons: DOCX, PDF, Print, Markdown */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Download Word (.docx) */}
          <button
            onClick={handleDownloadDocx}
            disabled={isExportingDocx}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white flex items-center space-x-1.5 shadow-md shadow-blue-600/20 transition-all hover:scale-[1.02] disabled:opacity-50"
            title="Download full report formatted as Microsoft Word document (.docx)"
          >
            <FileType className={`w-4 h-4 ${isExportingDocx ? 'animate-spin' : ''}`} />
            <span>{isExportingDocx ? 'Generating DOCX...' : 'Download DOCX (.docx)'}</span>
          </button>

          {/* Download PDF (.pdf) */}
          <button
            onClick={handleDownloadPdf}
            disabled={isExportingPdf}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white flex items-center space-x-1.5 shadow-md shadow-rose-600/20 transition-all hover:scale-[1.02] disabled:opacity-50"
            title="Download full report with embedded charts and tables as PDF (.pdf)"
          >
            <Download className={`w-4 h-4 ${isExportingPdf ? 'animate-bounce' : ''}`} />
            <span>{isExportingPdf ? (exportStatusText || 'Generating PDF...') : 'Download PDF (.pdf)'}</span>
          </button>

          {/* Print / Browser Native PDF */}
          <button
            onClick={handlePrint}
            className="px-3 py-2 rounded-xl text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center space-x-1.5 transition-colors"
            title="Print or Save via Browser Print Dialog"
          >
            <Printer className="w-3.5 h-3.5 text-slate-400" />
            <span className="hidden sm:inline">Print</span>
          </button>

          {/* Markdown */}
          <button
            onClick={handleDownloadMarkdown}
            className="px-3 py-2 rounded-xl text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center space-x-1.5 transition-colors"
          >
            <span>Markdown</span>
          </button>

          {/* Copy */}
          <button
            onClick={handleCopyReport}
            className="px-3 py-2 rounded-xl text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center space-x-1.5 transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>

          {/* Regenerate */}
          <button
            onClick={onGenerateReport}
            disabled={isGenerating}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-700 transition-colors"
            title="Regenerate report with AI"
          >
            <RefreshCw className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* PDF Export Alert / Fallback Banner */}
      {pdfError && (
        <div className="bg-rose-950/40 border border-rose-500/40 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3 text-xs text-rose-200">
          <div className="flex items-center space-x-2.5">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>
              <strong>PDF Export Notice:</strong> {pdfError}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold transition-colors flex items-center space-x-1"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print to PDF</span>
            </button>
            <button
              onClick={() => setPdfError(null)}
              className="p-1 rounded-lg hover:bg-rose-900/40 text-rose-400 hover:text-white"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Main Report Printable & PDF Capture Container */}
      <div
        id="full-report-content-container"
        className="bg-slate-900 border border-slate-800 rounded-2xl p-8 sm:p-10 shadow-2xl space-y-8 print:bg-white print:border-none print:p-0 print:shadow-none"
      >
        {/* Document Header */}
        <div className="border-b border-slate-800 pb-6 print:border-slate-300 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs uppercase tracking-widest text-teal-400 font-bold font-mono">
              CONFIDENTIAL • EXECUTIVE DATA ANALYSIS REPORT
            </span>
            <span className="text-xs text-slate-400">
              Date: {new Date(report.generatedAt).toLocaleDateString()}
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight print:text-black">
            {report.reportTitle}
          </h1>

          {/* Metadata badges strip */}
          <div className="flex flex-wrap items-center gap-3 pt-2 text-xs">
            <span className="px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 print:border-slate-300 print:text-black">
              Domain: <strong className="text-white print:text-black">{report.datasetSummary.domain}</strong>
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 print:border-slate-300 print:text-black">
              Total Records: <strong className="text-white print:text-black">{report.datasetSummary.totalRows}</strong>
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 print:border-slate-300 print:text-black">
              Total Dimensions: <strong className="text-white print:text-black">{report.datasetSummary.totalColumns}</strong>
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-emerald-950/60 border border-emerald-800 text-emerald-300 font-semibold print:text-emerald-800">
              Data Health: {report.datasetSummary.healthScore}%
            </span>
          </div>
        </div>

        {/* Section 1: Executive Summary */}
        <section className="space-y-3">
          <h2 className="text-sm font-bold text-teal-400 uppercase tracking-wider flex items-center space-x-2">
            <span>1. Executive Summary & Core Narrative</span>
          </h2>
          <div className="text-xs text-slate-200 leading-relaxed space-y-3 font-sans print:text-black text-justify">
            <p className="whitespace-pre-line">{report.executiveSummary}</p>
          </div>
        </section>

        {/* Section 2: Strategic Insights */}
        <section className="space-y-4">
          <h2 className="text-sm font-bold text-teal-400 uppercase tracking-wider flex items-center space-x-2">
            <span>2. Strategic Insights & Observed Patterns</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {report.strategicInsights.map((insight, idx) => (
              <div
                key={idx}
                className="p-4 rounded-xl bg-slate-800/40 border border-slate-800 space-y-2 print:border-slate-300 print:bg-slate-50"
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-xs font-bold text-white print:text-black">
                    {idx + 1}. {insight.title}
                  </h3>
                  <span
                    className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded ${
                      insight.impact === 'high'
                        ? 'bg-rose-950 text-rose-300 border border-rose-800'
                        : insight.impact === 'medium'
                        ? 'bg-amber-950 text-amber-300 border border-amber-800'
                        : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    {insight.impact} impact
                  </span>
                </div>
                <p className="text-xs text-slate-300 print:text-slate-800 leading-relaxed">
                  {insight.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Section 3: Charts & Visual Distributions */}
        {numericStats.length > 0 && (
          <section className="space-y-4">
            <h2 className="text-sm font-bold text-teal-400 uppercase tracking-wider flex items-center space-x-2">
              <BarChart3 className="w-4 h-4 text-teal-400" />
              <span>3. Visual Data Distributions & Histograms</span>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {numericStats.slice(0, 4).map((s: any) => (
                <div
                  key={s.key}
                  className="bg-slate-800/40 border border-slate-800 rounded-xl p-4 space-y-3 print:border-slate-300 print:bg-slate-50"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-white print:text-black">
                      {s.label} Distribution
                    </span>
                    <span className="text-[10px] text-teal-400 font-mono">
                      Mean: {s.type === 'currency' ? `$${s.mean.toLocaleString()}` : s.mean.toLocaleString()}
                    </span>
                  </div>

                  <div className="space-y-2 pt-1">
                    {s.buckets.map((b: any, bIdx: number) => (
                      <div key={bIdx} className="space-y-0.5">
                        <div className="flex justify-between text-[10px] text-slate-300 print:text-black font-mono">
                          <span>{b.range}</span>
                          <span className="text-teal-400 font-semibold print:text-teal-800">
                            {b.count} ({b.percent}%)
                          </span>
                        </div>
                        <div className="h-2 bg-slate-700/60 rounded-full overflow-hidden print:bg-slate-200">
                          <div
                            className="h-full bg-gradient-to-r from-teal-500 to-emerald-400 rounded-full print:bg-teal-600"
                            style={{ width: `${Math.max(b.percent, 4)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Section 4: Quantitative Descriptive Statistics Table */}
        {numericStats.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-sm font-bold text-teal-400 uppercase tracking-wider flex items-center space-x-2">
              <TableIcon className="w-4 h-4 text-teal-400" />
              <span>4. Numerical Statistics & Parametric Summary Table</span>
            </h2>
            <div className="border border-slate-800 rounded-xl overflow-hidden print:border-slate-300">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-slate-950/80 text-slate-400 text-[11px] font-semibold border-b border-slate-800 print:bg-slate-100 print:text-black">
                  <tr>
                    <th className="py-2.5 px-4">Metric Column</th>
                    <th className="py-2.5 px-3">Count</th>
                    <th className="py-2.5 px-3">Mean (&mu;)</th>
                    <th className="py-2.5 px-3">Std Dev (&sigma;)</th>
                    <th className="py-2.5 px-3">Min</th>
                    <th className="py-2.5 px-3">Median</th>
                    <th className="py-2.5 px-3">Max</th>
                    <th className="py-2.5 px-3">Total Sum</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 font-mono text-slate-200 print:text-black print:divide-slate-200">
                  {numericStats.map((s: any) => (
                    <tr key={s.key} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-2.5 px-4 font-sans font-semibold text-white print:text-black">
                        {s.label}
                      </td>
                      <td className="py-2.5 px-3 text-slate-400">{s.count}</td>
                      <td className="py-2.5 px-3 text-emerald-400 font-semibold print:text-black">
                        {s.type === 'currency' ? `$${s.mean.toLocaleString()}` : s.mean.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 text-slate-300 print:text-black">
                        &plusmn;{s.stdDev.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 text-slate-400">
                        {s.type === 'currency' ? `$${s.min.toLocaleString()}` : s.min.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 text-teal-300 font-semibold print:text-black">
                        {s.type === 'currency' ? `$${s.median.toLocaleString()}` : s.median.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 text-slate-400">
                        {s.type === 'currency' ? `$${s.max.toLocaleString()}` : s.max.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 text-emerald-400 font-bold print:text-black">
                        {s.type === 'currency' ? `$${s.sum.toLocaleString()}` : s.sum.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Section 5: Statistical Narrative */}
        <section className="space-y-3">
          <h2 className="text-sm font-bold text-teal-400 uppercase tracking-wider flex items-center space-x-2">
            <span>5. Mathematical & Dispersion Analysis</span>
          </h2>
          <div className="p-4 rounded-xl bg-slate-800/30 border border-slate-800/80 text-xs text-slate-300 leading-relaxed font-sans print:text-black print:bg-slate-50 print:border-slate-300 whitespace-pre-line text-justify">
            {report.statisticalNarrative}
          </div>
        </section>

        {/* Section 6: Column Deep Dives */}
        <section className="space-y-3">
          <h2 className="text-sm font-bold text-teal-400 uppercase tracking-wider flex items-center space-x-2">
            <span>6. Key Attribute & Variable Deep Dives</span>
          </h2>
          <div className="border border-slate-800 rounded-xl overflow-hidden print:border-slate-300">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-950/80 text-slate-400 text-[11px] font-semibold border-b border-slate-800 print:bg-slate-100 print:text-black">
                <tr>
                  <th className="py-2.5 px-4">Column</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-4">Statistical Profile</th>
                  <th className="py-2.5 px-4">Pattern Observation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-200 print:text-black print:divide-slate-200">
                {report.columnDeepDives.map((cd, idx) => (
                  <tr key={idx} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-2.5 px-4 font-semibold text-white print:text-black">
                      {cd.columnLabel}
                    </td>
                    <td className="py-2.5 px-3 text-slate-400 font-mono text-[11px]">
                      {cd.type}
                    </td>
                    <td className="py-2.5 px-4 text-slate-300 print:text-black">
                      {cd.summary}
                    </td>
                    <td className="py-2.5 px-4 text-teal-300/90 print:text-slate-800 italic">
                      {cd.patternObservation}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Section 7: Risk Factors & Anomalies */}
        <section className="space-y-3">
          <h2 className="text-sm font-bold text-amber-400 uppercase tracking-wider flex items-center space-x-2">
            <span>7. Risk Factors, Outliers & Data Anomalies</span>
          </h2>
          <div className="space-y-2.5">
            {report.riskAndAnomalies.map((risk, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-xl bg-amber-950/20 border border-amber-900/40 text-xs text-amber-200/90 space-y-1.5 print:bg-amber-50 print:border-amber-200 print:text-black"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                    <span className="font-semibold text-amber-300 print:text-black">{risk.issue}</span>
                  </div>
                  <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-amber-950 border border-amber-800 text-amber-300 print:text-black">
                    {risk.severity} severity
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 print:text-slate-700">
                  Affected: {risk.affectedColumns.join(', ') || 'General Dataset'}
                </div>
                <p className="text-slate-300 print:text-black leading-relaxed">
                  <strong>Recommendation:</strong> {risk.recommendation}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Section 8: Actionable Recommendations */}
        <section className="space-y-3">
          <h2 className="text-sm font-bold text-teal-400 uppercase tracking-wider flex items-center space-x-2">
            <span>8. Prioritized Strategic & Operational Recommendations</span>
          </h2>
          <div className="border border-slate-800 rounded-xl overflow-hidden print:border-slate-300">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-950/80 text-slate-400 text-[11px] font-semibold border-b border-slate-800 print:bg-slate-100 print:text-black">
                <tr>
                  <th className="py-2.5 px-3 w-10 text-center">#</th>
                  <th className="py-2.5 px-3 w-24">Priority</th>
                  <th className="py-2.5 px-4 w-36">Category</th>
                  <th className="py-2.5 px-4">Strategic Recommendation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-200 print:text-black print:divide-slate-200">
                {report.actionableRecommendations.map((rec, idx) => (
                  <tr key={idx} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-3 text-center font-mono text-slate-400">{idx + 1}</td>
                    <td className="py-3 px-3">
                      <span
                        className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded ${
                          rec.priority === 'high'
                            ? 'bg-rose-950 text-rose-300 border border-rose-800'
                            : rec.priority === 'medium'
                            ? 'bg-amber-950 text-amber-300 border border-amber-800'
                            : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        {rec.priority}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-300">
                      {rec.category.replace('_', ' ').toUpperCase()}
                    </td>
                    <td className="py-3 px-4 text-slate-200 print:text-black leading-relaxed">
                      {rec.recommendation}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Section 9: Strategic Conclusion */}
        <section className="space-y-3 border-t border-slate-800 pt-6 print:border-slate-300">
          <h2 className="text-sm font-bold text-teal-400 uppercase tracking-wider flex items-center space-x-2">
            <span>9. Strategic Roadmap & Conclusion</span>
          </h2>
          <p className="text-xs text-slate-300 leading-relaxed print:text-black text-justify whitespace-pre-line">
            {report.conclusion}
          </p>
        </section>

        {/* Report Footer Signoff */}
        <div className="pt-6 border-t border-slate-800 text-[11px] text-slate-400 flex flex-wrap items-center justify-between gap-2 print:border-slate-300 print:text-slate-600">
          <span>FolderML Enterprise Intelligence Engine • Certified Analysis Report</span>
          <span>Target Dataset: {spreadsheetTitle}</span>
        </div>
      </div>
    </div>
  );
};
