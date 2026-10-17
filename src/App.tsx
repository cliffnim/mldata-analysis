import React, { useState, useRef } from 'react';
import { Navbar } from './components/Navbar';
import { SpreadsheetView } from './components/SpreadsheetView';
import { FilesExplorerView } from './components/FilesExplorerView';
import { CombineWorkbooksView } from './components/CombineWorkbooksView';
import { DataInterpreterView } from './components/DataInterpreterView';
import { DataCleanerView } from './components/DataCleanerView';
import { StatisticalAnalysisView } from './components/StatisticalAnalysisView';
import { FullAnalysisReportView } from './components/FullAnalysisReportView';
import { FolderUploaderModal } from './components/FolderUploaderModal';
import { SchemaEditorModal } from './components/SchemaEditorModal';
import { AddColumnModal } from './components/AddColumnModal';
import { DocumentInspectorDrawer } from './components/DocumentInspectorDrawer';
import { BatchProgressModal } from './components/BatchProgressModal';
import {
  CleanHistoryItem,
  ColumnDef,
  ColumnType,
  DataInterpretation,
  DatasetSchema,
  ExtractedRow,
  FolderFile,
  FullAnalysisReport,
  ViewTab,
} from './types';
import { exportToExcel, exportToCSV, copyForGoogleSheets } from './utils/exporter';
import {
  generateClientDataInterpretation,
  generateClientFullReport,
  computeClientDataAudit,
} from './utils/clientAnalysisEngine';
import {
  FolderUp,
  FileSpreadsheet,
  Layers,
  Sparkles,
  Upload,
  CheckCircle2,
  FolderOpen,
  Wand2,
  BarChart3,
  FileText,
} from 'lucide-react';

export default function App() {
  // Primary Dataset State - starts clean with NO mock data
  const [folderName, setFolderName] = useState<string>('');
  const [files, setFiles] = useState<FolderFile[]>([]);
  const [schema, setSchema] = useState<DatasetSchema>({
    category: 'Uploaded Data',
    spreadsheetTitle: 'Consolidated Spreadsheet',
    domainSummary: 'Master tabular dataset extracted from uploaded directory',
    columns: [],
    extractionInstructions: 'Extract with highest precision into clean typed values.',
  });
  const [rows, setRows] = useState<ExtractedRow[]>([]);
  const [activeTab, setActiveTab] = useState<ViewTab>('spreadsheet');

  // Cleaning History State
  const [cleanHistory, setCleanHistory] = useState<CleanHistoryItem[]>([]);
  const [rowsHistory, setRowsHistory] = useState<ExtractedRow[][]>([]);

  // Modal / Drawer States
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isSchemaModalOpen, setIsSchemaModalOpen] = useState(false);
  const [isAddColumnModalOpen, setIsAddColumnModalOpen] = useState(false);
  const [inspectedRow, setInspectedRow] = useState<ExtractedRow | null>(null);

  // Interpretation & Full Report State
  const [dataInterpretation, setDataInterpretation] = useState<DataInterpretation | null>(null);
  const [isInterpreting, setIsInterpreting] = useState(false);
  const [fullReport, setFullReport] = useState<FullAnalysisReport | null>(null);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);

  // Batch Extraction State
  const [isBatchRunning, setIsBatchRunning] = useState(false);
  const [isCombining, setIsCombining] = useState(false);
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0 });
  const [currentProcessingFile, setCurrentProcessingFile] = useState<FolderFile | null>(null);
  const [batchLogs, setBatchLogs] = useState<{ fileName: string; status: 'success' | 'error'; confidence?: number }[]>([]);
  const [extractingFileId, setExtractingFileId] = useState<string | null>(null);
  const cancelBatchRef = useRef(false);

  // UI notifications
  const [copiedNotification, setCopiedNotification] = useState(false);
  const [isDetectingSchema, setIsDetectingSchema] = useState(false);

  /**
   * Handle user uploading a real folder or single/multiple workbooks
   */
  const handleFilesLoaded = async (uploadedFolderName: string, loadedFiles: FolderFile[]) => {
    setFolderName(uploadedFolderName);
    setFiles(loadedFiles);
    setRows([]);
    setRowsHistory([]);
    setCleanHistory([]);
    setDataInterpretation(null);
    setFullReport(null);

    // Check if uploaded files contain Excel spreadsheets (.xlsx, .xls, .csv)
    const excelFiles = loadedFiles.filter((f) => f.workbookData || f.fileCategory === 'excel');

    if (excelFiles.length > 0) {
      // Excel file(s) found! Automatically extract and consolidate all sheets into the master spreadsheet
      await autoCombineExcelFiles(excelFiles, uploadedFolderName);
    } else {
      // Document/Text files: run zero-shot schema detection
      setActiveTab('spreadsheet');
      setIsDetectingSchema(true);
      try {
        const res = await fetch('/api/detect-schema', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            folderName: uploadedFolderName,
            files: loadedFiles.slice(0, 5).map((f) => ({
              name: f.name,
              relativePath: f.relativePath,
              content: f.content,
            })),
          }),
        });

        if (res.ok) {
          const detected = await res.json();
          if (detected.columns && detected.columns.length > 0) {
            setSchema({
              category: detected.category || 'Uploaded Documents',
              spreadsheetTitle: detected.spreadsheetTitle || `${uploadedFolderName} Extracted Data`,
              domainSummary: detected.domainSummary || 'Structured master dataset',
              columns: detected.columns,
              extractionInstructions: detected.extractionInstructions || '',
            });
          }
        }
      } catch (err) {
        console.warn('Schema detection error:', err);
      } finally {
        setIsDetectingSchema(false);
      }
    }
  };

  /**
   * Automatically consolidate Excel files and sheets into master spreadsheet
   */
  const autoCombineExcelFiles = async (excelFiles: FolderFile[], folderTitle: string) => {
    setIsCombining(true);

    try {
      const allRows: ExtractedRow[] = [];
      const headersMap = new Map<string, string>(); // canonicalKey -> displayLabel

      // Include Workbook & Worksheet source indicators if multiple workbooks or multiple sheets
      const hasMultipleSheets = excelFiles.some((f) => (f.workbookData?.sheets.length || 0) > 1);
      const isMultiFile = excelFiles.length > 1;

      if (isMultiFile) {
        headersMap.set('_workbook', 'Source Workbook');
      }
      if (hasMultipleSheets || isMultiFile) {
        headersMap.set('_sheet', 'Worksheet');
      }

      excelFiles.forEach((file) => {
        file.workbookData?.sheets.forEach((sheet) => {
          sheet.headers.forEach((h) => {
            const cleanKey = h.trim().toLowerCase().replace(/[^a-zA-Z0-9]/g, '_') || h;
            if (!headersMap.has(cleanKey)) {
              headersMap.set(cleanKey, h.trim());
            }
          });
        });
      });

      // Build unified schema columns
      const unifiedColumns: ColumnDef[] = Array.from(headersMap.entries()).map(([key, label]) => {
        let type: ColumnType = 'string';
        const lower = label.toLowerCase();
        if (key === '_workbook' || key === '_sheet') type = 'tag';
        else if (
          lower.includes('price') ||
          lower.includes('cost') ||
          lower.includes('amount') ||
          lower.includes('total') ||
          lower.includes('revenue') ||
          lower.includes('fee') ||
          lower.includes('$')
        )
          type = 'currency';
        else if (lower.includes('date') || lower.includes('time') || lower.includes('day') || lower.includes('year') || lower.includes('dob'))
          type = 'date';
        else if (
          lower.includes('qty') ||
          lower.includes('count') ||
          lower.includes('quantity') ||
          lower.includes('number') ||
          lower.includes('rate') ||
          lower.includes('score') ||
          lower.includes('age') ||
          lower.includes('percentage')
        )
          type = 'number';

        return {
          key,
          label,
          type,
          description: `Extracted from column "${label}"`,
        };
      });

      // Flatten and combine every row from every worksheet
      excelFiles.forEach((file) => {
        file.workbookData?.sheets.forEach((sheet) => {
          sheet.allRows.forEach((rawRow, rIdx) => {
            const rowData: Record<string, any> = {};
            if (isMultiFile) rowData['_workbook'] = file.name;
            if (hasMultipleSheets || isMultiFile) rowData['_sheet'] = sheet.sheetName;

            Object.entries(rawRow).forEach(([colHeader, val]) => {
              const cleanKey = colHeader.trim().toLowerCase().replace(/[^a-zA-Z0-9]/g, '_') || colHeader;
              rowData[cleanKey] = val;
            });

            allRows.push({
              id: `row_${file.id}_${sheet.sheetName}_${rIdx}`,
              fileId: file.id,
              fileName: file.name,
              relativePath: file.relativePath,
              sheetName: sheet.sheetName,
              data: rowData,
              overallConfidence: 100,
              fieldConfidence: {},
              sourceExcerpts: {},
              anomalies: [],
              summary: `${file.name} • ${sheet.sheetName} (Row ${rIdx + 1})`,
              extractedAt: new Date().toISOString(),
            });
          });
        });
      });

      const updatedSchema: DatasetSchema = {
        category: 'Excel Dataset',
        spreadsheetTitle: `${excelFiles[0]?.name || folderTitle || 'Excel Workbook'}`,
        domainSummary: `Extracted from ${excelFiles.length} file(s) and ${allRows.length} total records`,
        columns: unifiedColumns,
        extractionInstructions: '',
      };

      setSchema(updatedSchema);
      setRows(allRows);
      setActiveTab('spreadsheet');
    } catch (err) {
      console.error('Failed to combine excel files:', err);
    } finally {
      setIsCombining(false);
    }
  };

  /**
   * Handle Cleaning Rows and track history for Undo
   */
  const handleUpdateCleanedRows = (updatedRows: ExtractedRow[], historyItem: CleanHistoryItem) => {
    setRowsHistory((prev) => [...prev, rows]);
    setCleanHistory((prev) => [historyItem, ...prev]);
    setRows(updatedRows);
  };

  /**
   * Revert / Undo Last Clean Action
   */
  const handleRevertLastClean = () => {
    if (rowsHistory.length === 0) return;
    const previous = rowsHistory[rowsHistory.length - 1];
    setRows(previous);
    setRowsHistory((prev) => prev.slice(0, prev.length - 1));
    setCleanHistory((prev) => prev.slice(1));
  };

  /**
   * Run Full AI Data Interpretation
   */
  const handleRunInterpretation = async () => {
    if (rows.length === 0) return;
    setIsInterpreting(true);

    try {
      const numericStats: Record<string, any> = {};
      schema.columns.forEach((col) => {
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

      let interpreted = false;
      try {
        const res = await fetch('/api/interpret-data', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            spreadsheetTitle: schema.spreadsheetTitle,
            columns: schema.columns,
            totalRows: rows.length,
            workbooks: files.filter((f) => f.workbookData).map((f) => ({
              name: f.name,
              rows: f.workbookData?.totalRows || 0,
              sheets: f.workbookData?.sheets.map((s) => s.sheetName) || [],
            })),
            sampleRows: rows.slice(0, 25).map((r) => r.data),
            numericStats,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          setDataInterpretation(data);
          setActiveTab('interpreter');
          interpreted = true;
        }
      } catch (err) {
        console.warn('Backend /api/interpret-data unavailable, using client analysis engine:', err);
      }

      // Offline / GitHub Pages fallback
      if (!interpreted) {
        const clientInterpretation = generateClientDataInterpretation(
          schema.spreadsheetTitle || folderName || 'Consolidated Workbooks',
          schema.columns,
          rows,
          files
        );
        setDataInterpretation(clientInterpretation);
        setActiveTab('interpreter');
      }
    } catch (err) {
      console.error('Failed to interpret data:', err);
    } finally {
      setIsInterpreting(false);
    }
  };

  /**
   * Generate Full Analysis Report
   */
  const handleGenerateFullReport = async () => {
    if (rows.length === 0) return;
    setIsGeneratingReport(true);

    try {
      // Calculate numerical descriptive stats
      const numericStats: Record<string, any> = {};
      schema.columns.forEach((col) => {
        if (col.type === 'currency' || col.type === 'number') {
          const numbers = rows
            .map((r) => {
              const v = r.data[col.key];
              return typeof v === 'number' ? v : parseFloat(v);
            })
            .filter((n) => !isNaN(n));

          if (numbers.length > 0) {
            const sum = numbers.reduce((a, b) => a + b, 0);
            numericStats[col.label || col.key] = {
              count: numbers.length,
              sum,
              avg: Math.round((sum / numbers.length) * 100) / 100,
              min: Math.min(...numbers),
              max: Math.max(...numbers),
            };
          }
        }
      });

      // Calculate categorical distributions
      const categoryDistributions: Record<string, any> = {};
      schema.columns
        .filter((c) => c.type !== 'currency' && c.type !== 'number')
        .slice(0, 6)
        .forEach((col) => {
          const freq: Record<string, number> = {};
          rows.forEach((r) => {
            const val = r.data[col.key];
            if (val) {
              const s = String(val).trim();
              freq[s] = (freq[s] || 0) + 1;
            }
          });
          categoryDistributions[col.label || col.key] = Object.entries(freq)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([val, count]) => `${val}: ${count}`);
        });

      let reportGenerated = false;
      try {
        const res = await fetch('/api/generate-full-report', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            datasetTitle: schema.spreadsheetTitle || folderName || 'Uploaded Excel Dataset',
            columns: schema.columns,
            totalRows: rows.length,
            sampleRows: rows.slice(0, 25).map((r) => r.data),
            numericStats,
            categoryDistributions,
            cleanAudit: {
              cleanHistoryLength: cleanHistory.length,
            },
          }),
        });

        if (res.ok) {
          const reportData = await res.json();
          setFullReport(reportData);
          setActiveTab('report');
          reportGenerated = true;
        }
      } catch (err) {
        console.warn('Backend /api/generate-full-report unavailable, using client analysis engine:', err);
      }

      // Offline / GitHub Pages fallback
      if (!reportGenerated) {
        const audit = computeClientDataAudit(rows, schema.columns);
        const clientReport = generateClientFullReport(
          schema.spreadsheetTitle || folderName || 'Uploaded Excel Dataset',
          schema.columns,
          rows,
          audit
        );
        setFullReport(clientReport);
        setActiveTab('report');
      }
    } catch (err) {
      console.error('Failed to generate report:', err);
    } finally {
      setIsGeneratingReport(false);
    }
  };

  /**
   * Extract Single Document (PDF/Text/Image)
   */
  const extractSingleFile = async (fileId: string): Promise<ExtractedRow | null> => {
    const file = files.find((f) => f.id === fileId);
    if (!file) return null;

    setExtractingFileId(fileId);

    try {
      const res = await fetch('/api/extract-file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          file: {
            name: file.name,
            relativePath: file.relativePath,
            mimeType: file.mimeType,
            content: file.content,
            base64: file.base64,
          },
          schema,
          customInstructions: schema.extractionInstructions,
        }),
      });

      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const extracted = await res.json();

      const rowData: Record<string, any> = {};
      schema.columns.forEach((col) => {
        const val = extracted.data?.[col.key] !== undefined ? extracted.data[col.key] : extracted[col.key];
        rowData[col.key] = val !== undefined ? val : null;
      });

      const newRow: ExtractedRow = {
        id: 'row_' + file.id,
        fileId: file.id,
        fileName: file.name,
        relativePath: file.relativePath,
        data: Object.keys(rowData).length > 0 ? rowData : (extracted.data || {}),
        overallConfidence: extracted.overallConfidence ?? 92,
        fieldConfidence: extracted.fieldConfidence || {},
        sourceExcerpts: extracted.sourceExcerpts || {},
        anomalies: extracted.anomalies || [],
        summary: extracted.summary || '',
        extractedAt: new Date().toISOString(),
      };

      setRows((prev) => {
        const filtered = prev.filter((r) => r.fileId !== file.id);
        return [...filtered, newRow];
      });

      setFiles((prev) =>
        prev.map((f) => (f.id === fileId ? { ...f, status: 'completed' } : f))
      );

      return newRow;
    } catch (err: any) {
      console.error(err);
      setFiles((prev) =>
        prev.map((f) => (f.id === fileId ? { ...f, status: 'error', errorMessage: err.message } : f))
      );
      return null;
    } finally {
      setExtractingFileId(null);
    }
  };

  /**
   * Execute batch ML extraction across all pending documents
   */
  const executeBatchExtract = async (targetFiles = files, targetSchema = schema) => {
    if (targetFiles.length === 0 || isBatchRunning) return;

    setIsBatchRunning(true);
    cancelBatchRef.current = false;
    setBatchProgress({ current: 0, total: targetFiles.length });
    setBatchLogs([]);

    for (let i = 0; i < targetFiles.length; i++) {
      if (cancelBatchRef.current) break;

      const file = targetFiles[i];
      setCurrentProcessingFile(file);

      try {
        const res = await fetch('/api/extract-file', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            file: {
              name: file.name,
              relativePath: file.relativePath,
              mimeType: file.mimeType,
              content: file.content,
              base64: file.base64,
            },
            schema: targetSchema,
            customInstructions: targetSchema.extractionInstructions,
          }),
        });

        if (!res.ok) throw new Error('Extraction failed');
        const extracted = await res.json();

        const rowData: Record<string, any> = {};
        targetSchema.columns.forEach((col) => {
          const val = extracted.data?.[col.key] !== undefined ? extracted.data[col.key] : extracted[col.key];
          rowData[col.key] = val !== undefined ? val : null;
        });

        const newRow: ExtractedRow = {
          id: 'row_' + file.id,
          fileId: file.id,
          fileName: file.name,
          relativePath: file.relativePath,
          data: Object.keys(rowData).length > 0 ? rowData : (extracted.data || {}),
          overallConfidence: extracted.overallConfidence ?? 90,
          fieldConfidence: extracted.fieldConfidence || {},
          sourceExcerpts: extracted.sourceExcerpts || {},
          anomalies: extracted.anomalies || [],
          summary: extracted.summary || '',
          extractedAt: new Date().toISOString(),
        };

        setRows((prev) => {
          const filtered = prev.filter((r) => r.fileId !== file.id);
          return [...filtered, newRow];
        });

        setFiles((prev) =>
          prev.map((f) => (f.id === file.id ? { ...f, status: 'completed' } : f))
        );

        setBatchLogs((prev) => [
          ...prev,
          { fileName: file.name, status: 'success', confidence: newRow.overallConfidence },
        ]);
      } catch (err: any) {
        setFiles((prev) =>
          prev.map((f) => (f.id === file.id ? { ...f, status: 'error', errorMessage: err.message } : f))
        );
        setBatchLogs((prev) => [...prev, { fileName: file.name, status: 'error' }]);
      }

      setBatchProgress({ current: i + 1, total: targetFiles.length });
    }

    setIsBatchRunning(false);
    setCurrentProcessingFile(null);
  };

  /**
   * Add custom column with optional backfill
   */
  const handleAddColumn = async (newCol: ColumnDef, backfillWithML: boolean) => {
    const updatedSchema = {
      ...schema,
      columns: [...schema.columns, newCol],
    };
    setSchema(updatedSchema);

    if (backfillWithML && rows.length > 0) {
      for (const row of rows) {
        const file = files.find((f) => f.id === row.fileId);
        if (!file) continue;

        try {
          const res = await fetch('/api/add-column-extract', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              column: newCol,
              file: {
                name: file.name,
                relativePath: file.relativePath,
                content: file.content,
              },
            }),
          });

          if (res.ok) {
            const result = await res.json();
            setRows((prev) =>
              prev.map((r) => {
                if (r.id !== row.id) return r;
                return {
                  ...r,
                  data: { ...r.data, [newCol.key]: result.value },
                  fieldConfidence: { ...r.fieldConfidence, [newCol.key]: result.confidence ?? 90 },
                };
              })
            );
          }
        } catch (err) {
          console.error(err);
        }
      }
    }
  };

  const handleUpdateCell = (rowId: string, colKey: string, newValue: any) => {
    setRows((prev) =>
      prev.map((r) => (r.id === rowId ? { ...r, data: { ...r.data, [colKey]: newValue } } : r))
    );
  };

  const handleDeleteRow = (rowId: string) => {
    setRows((prev) => prev.filter((r) => r.id !== rowId));
  };

  const handleDeleteFile = (fileId: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== fileId));
    setRows((prev) => prev.filter((r) => r.fileId !== fileId));
  };

  const handleExportExcel = () => {
    exportToExcel(schema.spreadsheetTitle || folderName || 'Consolidated_Workbooks', schema.columns, rows);
  };

  const handleExportCSV = () => {
    exportToCSV(schema.spreadsheetTitle || folderName || 'Consolidated_Workbooks', schema.columns, rows);
  };

  const handleCopyGoogleSheets = async () => {
    const success = await copyForGoogleSheets(schema.columns, rows);
    if (success) {
      setCopiedNotification(true);
      setTimeout(() => setCopiedNotification(false), 2500);
    }
  };

  const inspectedFile = inspectedRow ? files.find((f) => f.id === inspectedRow.fileId) || null : null;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-teal-500 selection:text-white">
      {/* Top Application Bar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        folderName={folderName || 'No File / Folder Loaded'}
        fileCount={files.length}
        extractedCount={rows.length}
        onOpenUpload={() => setIsUploadModalOpen(true)}
        onOpenPresets={() => setIsUploadModalOpen(true)}
        onOpenSchemaEditor={() => setIsSchemaModalOpen(true)}
        onExportExcel={handleExportExcel}
        onExportCSV={handleExportCSV}
        onCopyGoogleSheets={handleCopyGoogleSheets}
        copied={copiedNotification}
        isProcessing={isBatchRunning || isCombining}
        onRunBatchExtract={() => executeBatchExtract()}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* If no files loaded yet, show clear upload hero */}
        {files.length === 0 ? (
          <div className="max-w-2xl mx-auto py-12 px-4 text-center">
            <div className="w-16 h-16 rounded-2xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400 mx-auto mb-5 shadow-lg shadow-teal-500/10">
              <FolderUp className="w-8 h-8" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight mb-2">
              Upload Your Excel File (.xlsx) or Folder
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 max-w-lg mx-auto mb-8 leading-relaxed">
              Upload your Excel file to immediately clean data, compute statistical distributions, interpret trends with AI, and generate a full analysis report.
            </p>

            <div className="p-8 border-2 border-dashed border-slate-700/80 hover:border-teal-500/60 rounded-2xl bg-slate-900/50 backdrop-blur transition-all">
              <button
                onClick={() => setIsUploadModalOpen(true)}
                className="px-6 py-3 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold inline-flex items-center space-x-2 shadow-lg shadow-teal-500/20 transition-all hover:scale-[1.02]"
              >
                <FolderOpen className="w-4 h-4" />
                <span>Upload Excel File (.xlsx) or Folder</span>
              </button>
              <p className="text-[11px] text-slate-400 mt-3">
                No random or mock data. Your actual data is parsed securely in your browser session.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Quick Action Navigation Bar for Active Dataset */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 shadow-md">
              <div className="flex items-center space-x-3">
                <FileSpreadsheet className="w-5 h-5 text-teal-400 shrink-0" />
                <div>
                  <h3 className="text-xs font-semibold text-white truncate max-w-sm">
                    {schema.spreadsheetTitle}
                  </h3>
                  <span className="text-[11px] text-slate-400">
                    {rows.length} rows • {schema.columns.length} columns loaded
                  </span>
                </div>
              </div>

              {/* Quick Jump Buttons */}
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setActiveTab('cleaner')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center space-x-1.5 transition-colors ${
                    activeTab === 'cleaner'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-slate-700'
                  }`}
                >
                  <Wand2 className="w-3.5 h-3.5" />
                  <span>Clean Data</span>
                </button>

                <button
                  onClick={() => setActiveTab('analytics')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center space-x-1.5 transition-colors ${
                    activeTab === 'analytics'
                      ? 'bg-teal-600 text-white shadow-sm'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                  }`}
                >
                  <BarChart3 className="w-3.5 h-3.5 text-teal-400" />
                  <span>Analyse</span>
                </button>

                <button
                  onClick={() => setActiveTab('interpreter')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center space-x-1.5 transition-colors ${
                    activeTab === 'interpreter'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-slate-700'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  <span>Interprete</span>
                </button>

                <button
                  onClick={() => {
                    if (!fullReport) handleGenerateFullReport();
                    else setActiveTab('report');
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center space-x-1.5 transition-colors ${
                    activeTab === 'report'
                      ? 'bg-indigo-500 text-white shadow-sm'
                      : 'bg-indigo-950/80 hover:bg-indigo-900 text-indigo-200 border border-indigo-800'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5 text-teal-300" />
                  <span>Full Report</span>
                </button>
              </div>
            </div>

            {/* View Tabs */}
            {activeTab === 'spreadsheet' && (
              <SpreadsheetView
                spreadsheetTitle={schema.spreadsheetTitle}
                columns={schema.columns}
                rows={rows}
                files={files}
                onUpdateCell={handleUpdateCell}
                onDeleteRow={handleDeleteRow}
                onInspectRow={(row) => setInspectedRow(row)}
                onOpenSchemaEditor={() => setIsSchemaModalOpen(true)}
                onOpenAddColumn={() => setIsAddColumnModalOpen(true)}
                onExportExcel={handleExportExcel}
                onExportCSV={handleExportCSV}
                onCopyGoogleSheets={handleCopyGoogleSheets}
                copied={copiedNotification}
                onRunBatchExtract={() => executeBatchExtract()}
                isExtracting={isBatchRunning}
                extractedCount={rows.length}
              />
            )}

            {activeTab === 'cleaner' && (
              <DataCleanerView
                columns={schema.columns}
                rows={rows}
                onUpdateRows={handleUpdateCleanedRows}
                cleanHistory={cleanHistory}
                onRevertLastClean={handleRevertLastClean}
                onNavigateToTab={(tab) => setActiveTab(tab)}
              />
            )}

            {activeTab === 'analytics' && (
              <StatisticalAnalysisView
                columns={schema.columns}
                rows={rows}
                spreadsheetTitle={schema.spreadsheetTitle}
              />
            )}

            {activeTab === 'interpreter' && (
              <DataInterpreterView
                spreadsheetTitle={schema.spreadsheetTitle}
                columns={schema.columns}
                rows={rows}
                files={files}
                interpretation={dataInterpretation}
                onRunInterpretation={handleRunInterpretation}
                isInterpreting={isInterpreting}
              />
            )}

            {activeTab === 'report' && (
              <FullAnalysisReportView
                report={fullReport}
                onGenerateReport={handleGenerateFullReport}
                isGenerating={isGeneratingReport}
                spreadsheetTitle={schema.spreadsheetTitle}
                columns={schema.columns}
                rows={rows}
                onExportExcel={handleExportExcel}
              />
            )}

            {activeTab === 'combine' && (
              <CombineWorkbooksView
                files={files}
                columns={schema.columns}
                rows={rows}
                onCombineAllWorkbooks={() => {}}
                isCombining={isCombining}
                onOpenUpload={() => setIsUploadModalOpen(true)}
                onExportExcel={handleExportExcel}
              />
            )}

            {activeTab === 'files' && (
              <FilesExplorerView
                files={files}
                extractedRows={rows}
                onExtractSingleFile={extractSingleFile}
                onInspectFileRow={(row) => setInspectedRow(row)}
                onDeleteFile={handleDeleteFile}
                onOpenUpload={() => setIsUploadModalOpen(true)}
                isProcessing={isBatchRunning || isCombining}
                extractingFileId={extractingFileId}
              />
            )}
          </div>
        )}
      </main>

      {/* Modals & Drawers */}
      <FolderUploaderModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onFilesLoaded={handleFilesLoaded}
      />

      <SchemaEditorModal
        isOpen={isSchemaModalOpen}
        onClose={() => setIsSchemaModalOpen(false)}
        schema={schema}
        onSaveSchema={(newSchema) => setSchema(newSchema)}
        onAutoDetectSchema={() => {}}
        isDetecting={isDetectingSchema}
      />

      <AddColumnModal
        isOpen={isAddColumnModalOpen}
        onClose={() => setIsAddColumnModalOpen(false)}
        onAddColumn={handleAddColumn}
        hasExistingRows={rows.length > 0}
      />

      <DocumentInspectorDrawer
        isOpen={!!inspectedRow}
        onClose={() => setInspectedRow(null)}
        row={inspectedRow}
        file={inspectedFile}
        columns={schema.columns}
        onReExtractRow={async (fileId) => {
          const updated = await extractSingleFile(fileId);
          if (updated) setInspectedRow(updated);
        }}
        isExtracting={extractingFileId === inspectedRow?.fileId}
      />

      <BatchProgressModal
        isOpen={isBatchRunning}
        total={batchProgress.total}
        current={batchProgress.current}
        currentFile={currentProcessingFile}
        onCancel={() => {
          cancelBatchRef.current = true;
          setIsBatchRunning(false);
        }}
        logs={batchLogs}
      />
    </div>
  );
}
