import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Download,
  Copy,
  Check,
  Plus,
  Eye,
  AlertTriangle,
  FileSpreadsheet,
  Trash2,
  Quote,
  Sparkles,
  RefreshCw,
  Folder,
  Layers,
  FileText,
  DollarSign,
  Calendar,
  Hash,
  Type,
  Tag,
  ToggleLeft,
} from 'lucide-react';
import { ColumnDef, ColumnType, ExtractedRow, FolderFile } from '../types';

interface SpreadsheetViewProps {
  spreadsheetTitle: string;
  columns: ColumnDef[];
  rows: ExtractedRow[];
  files: FolderFile[];
  onUpdateCell: (rowId: string, colKey: string, newValue: any) => void;
  onDeleteRow: (rowId: string) => void;
  onRemoveRows: (rowIds: string[]) => void;
  onDeleteColumn: (colKey: string) => void;
  onInspectRow: (row: ExtractedRow) => void;
  onOpenSchemaEditor: () => void;
  onOpenAddColumn: () => void;
  onExportExcel: () => void;
  onExportCSV: () => void;
  onCopyGoogleSheets: () => void;
  copied: boolean;
  onRunBatchExtract: () => void;
  isExtracting: boolean;
  extractedCount: number;
}

export const SpreadsheetView: React.FC<SpreadsheetViewProps> = ({
  spreadsheetTitle,
  columns,
  rows,
  files,
  onUpdateCell,
  onDeleteRow,
  onRemoveRows,
  onDeleteColumn,
  onInspectRow,
  onOpenSchemaEditor,
  onOpenAddColumn,
  onExportExcel,
  onExportCSV,
  onCopyGoogleSheets,
  copied,
  onRunBatchExtract,
  isExtracting,
  extractedCount,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [columnFilterKey, setColumnFilterKey] = useState('');
  const [columnFilterValue, setColumnFilterValue] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'high_conf' | 'review' | 'anomalies'>('all');
  const [folderFilter, setFolderFilter] = useState<string>('all');
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [editingCell, setEditingCell] = useState<{ rowId: string; colKey: string } | null>(null);
  const [editValue, setEditValue] = useState<string>('');

  // Extract unique subfolder paths for folder dropdown
  const uniqueSubfolders = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((r) => {
      const parts = r.relativePath.split('/');
      if (parts.length > 1) {
        set.add(parts.slice(0, -1).join('/'));
      }
    });
    return Array.from(set).sort();
  }, [rows]);

  // Aggregate Metrics & Sums
  const stats = useMemo(() => {
    if (rows.length === 0) {
      return { totalRows: 0, avgConfidence: 0, anomalyCount: 0 };
    }

    const totalConfidence = rows.reduce((sum, r) => sum + (r.overallConfidence || 0), 0);
    const avgConfidence = Math.round(totalConfidence / rows.length);
    const anomalyCount = rows.filter((r) => r.anomalies && r.anomalies.length > 0).length;

    return {
      totalRows: rows.length,
      avgConfidence,
      anomalyCount,
    };
  }, [rows, columns]);

  // Filtering and Sorting
  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      // Search across filename, relativePath, and all cell values
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesName = row.fileName.toLowerCase().includes(query);
        const matchesPath = row.relativePath.toLowerCase().includes(query);
        const matchesData = Object.values(row.data).some((val) =>
          String(val).toLowerCase().includes(query)
        );
        if (!matchesName && !matchesPath && !matchesData) return false;
      }

      if (columnFilterKey && columnFilterValue.trim()) {
        const value = String(row.data[columnFilterKey] ?? '').toLowerCase();
        if (!value.includes(columnFilterValue.trim().toLowerCase())) return false;
      }

      // Filter by confidence / anomalies
      if (filterMode === 'high_conf' && row.overallConfidence < 90) return false;
      if (filterMode === 'review' && row.overallConfidence >= 90) return false;
      if (filterMode === 'anomalies' && (!row.anomalies || row.anomalies.length === 0)) return false;

      // Filter by folder path
      if (folderFilter !== 'all') {
        if (!row.relativePath.startsWith(folderFilter)) return false;
      }

      return true;
    }).sort((a, b) => {
      if (!sortKey) return 0;

      let valA: any = sortKey === '_fileName' ? a.fileName : sortKey === '_conf' ? a.overallConfidence : a.data[sortKey];
      let valB: any = sortKey === '_fileName' ? b.fileName : sortKey === '_conf' ? b.overallConfidence : b.data[sortKey];

      if (valA === undefined || valA === null) valA = '';
      if (valB === undefined || valB === null) valB = '';

      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortDirection === 'asc' ? valA - valB : valB - valA;
      }

      return sortDirection === 'asc'
        ? String(valA).localeCompare(String(valB))
        : String(valB).localeCompare(String(valA));
    });
  }, [rows, searchQuery, columnFilterKey, columnFilterValue, filterMode, folderFilter, sortKey, sortDirection]);

  const visibleNumericTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    columns.forEach((column) => {
      if (column.type !== 'currency' && column.type !== 'number') return;
      totals[column.key] = filteredRows.reduce((sum, row) => {
        const value = row.data[column.key];
        const number = typeof value === 'number' ? value : parseFloat(String(value ?? '').replace(/[$,€£%\s]/g, ''));
        return sum + (Number.isFinite(number) ? number : 0);
      }, 0);
    });
    return totals;
  }, [filteredRows, columns]);

  const hasActiveFilter = Boolean(
    searchQuery.trim() ||
    (columnFilterKey && columnFilterValue.trim()) ||
    filterMode !== 'all' ||
    folderFilter !== 'all'
  );

  const getRowSum = (row: ExtractedRow) =>
    columns.reduce((sum, column) => {
      if (column.type !== 'number' && column.type !== 'currency') return sum;
      const value = row.data[column.key];
      const number = typeof value === 'number' ? value : parseFloat(String(value ?? '').replace(/[$,€£%\s]/g, ''));
      return sum + (Number.isFinite(number) ? number : 0);
    }, 0);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      if (sortDirection === 'asc') setSortDirection('desc');
      else {
        setSortKey(null);
        setSortDirection('asc');
      }
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  const startEditCell = (rowId: string, colKey: string, initialVal: any) => {
    setEditingCell({ rowId, colKey });
    setEditValue(initialVal === undefined || initialVal === null ? '' : String(initialVal));
  };

  const saveEditCell = () => {
    if (!editingCell) return;
    const { rowId, colKey } = editingCell;
    const colDef = columns.find((c) => c.key === colKey);

    let parsedVal: any = editValue;
    if (colDef?.type === 'number' || colDef?.type === 'currency') {
      const num = parseFloat(editValue.replace(/[^0-9.-]/g, ''));
      parsedVal = isNaN(num) ? editValue : num;
    } else if (colDef?.type === 'boolean') {
      parsedVal = editValue.toLowerCase() === 'true' || editValue === '1' || editValue.toLowerCase() === 'yes';
    }

    onUpdateCell(rowId, colKey, parsedVal);
    setEditingCell(null);
  };

  const getConfidenceBadge = (confidence: number) => {
    if (confidence >= 90) {
      return (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-950/60 text-emerald-400 border border-emerald-800">
          {confidence}%
        </span>
      );
    }
    if (confidence >= 75) {
      return (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-950/60 text-amber-400 border border-amber-800">
          {confidence}%
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-rose-950/60 text-rose-400 border border-rose-800">
        {confidence}%
      </span>
    );
  };

  const getColumnIcon = (type: ColumnType) => {
    switch (type) {
      case 'currency':
        return <DollarSign className="w-3 h-3 text-emerald-400" />;
      case 'date':
        return <Calendar className="w-3 h-3 text-blue-400" />;
      case 'number':
        return <Hash className="w-3 h-3 text-amber-400" />;
      case 'tag':
        return <Tag className="w-3 h-3 text-purple-400" />;
      case 'boolean':
        return <ToggleLeft className="w-3 h-3 text-pink-400" />;
      default:
        return <Type className="w-3 h-3 text-slate-400" />;
    }
  };

  return (
    <div className="space-y-4">
      {/* KPI Ribbon Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
        {/* Total Documents */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Extracted Records</span>
            <FileSpreadsheet className="w-4 h-4 text-teal-400" />
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-white">{rows.length}</span>
            <span className="text-xs text-slate-400">of {files.length} files</span>
          </div>
        </div>

        {/* Average AI Confidence */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Mean ML Confidence</span>
            <Sparkles className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-white">
              {stats.avgConfidence > 0 ? `${stats.avgConfidence}%` : '—'}
            </span>
            <span className="text-xs text-emerald-400 font-medium">
              {stats.avgConfidence >= 90 ? 'High Precision' : stats.avgConfidence >= 75 ? 'Reliable' : ''}
            </span>
          </div>
        </div>

        {/* Flagged Anomalies */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Validation Warnings</span>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-white">{stats.anomalyCount}</span>
            <span className="text-xs text-slate-400">documents flagged</span>
          </div>
        </div>

        {/* Dynamic Aggregated Value (e.g. Total Amount sum if present) */}
        {Object.entries(visibleNumericTotals).map(([colKey, sum]) => {
          const colDef = columns.find((c) => c.key === colKey);
          return (
            <div key={colKey} className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-medium truncate max-w-[140px]" title={colDef?.label}>
                  Sum: {colDef?.label}
                </span>
                <DollarSign className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="mt-2">
                <span className="text-xl font-bold text-emerald-400">
                  {colDef?.type === 'currency' ? `$${sum.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : sum.toLocaleString()}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Toolbar & Filters Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 shadow-sm">
        {/* Left: Search & Filter Dropdowns */}
        <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[280px]">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search values, vendors, file names..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-800/90 border border-slate-700/80 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-teal-500 transition-colors"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <select
              aria-label="Filter by column"
              value={columnFilterKey}
              onChange={(event) => setColumnFilterKey(event.target.value)}
              className="bg-slate-800 border border-slate-700 text-xs text-slate-300 rounded-lg px-2 py-1.5 focus:outline-none focus:border-teal-500"
            >
              <option value="">All columns</option>
              {columns.map((column) => <option key={column.key} value={column.key}>{column.label}</option>)}
            </select>
            <input
              type="text"
              aria-label="Filter column values"
              placeholder="Contains..."
              value={columnFilterValue}
              onChange={(event) => setColumnFilterValue(event.target.value)}
              disabled={!columnFilterKey}
              className="w-28 bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-teal-500 disabled:opacity-50"
            />
          </div>

          {/* Confidence / Quality Filter */}
          <div className="flex items-center space-x-1 bg-slate-800/90 border border-slate-700/80 rounded-lg p-0.5 text-xs">
            <button
              onClick={() => setFilterMode('all')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                filterMode === 'all' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All ({rows.length})
            </button>
            <button
              onClick={() => setFilterMode('high_conf')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                filterMode === 'high_conf' ? 'bg-emerald-900/60 text-emerald-300 shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Only rows with 90%+ ML confidence"
            >
              High Confidence
            </button>
            <button
              onClick={() => setFilterMode('anomalies')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                filterMode === 'anomalies' ? 'bg-amber-900/60 text-amber-300 shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Rows with potential data discrepancies or warnings"
            >
              Warnings ({stats.anomalyCount})
            </button>
          </div>

          {/* Subfolder Filter if present */}
          {uniqueSubfolders.length > 0 && (
            <div className="flex items-center space-x-1.5">
              <Folder className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={folderFilter}
                onChange={(e) => setFolderFilter(e.target.value)}
                className="bg-slate-800 border border-slate-700 text-xs text-slate-300 rounded-lg px-2 py-1.5 focus:outline-none focus:border-teal-500"
              >
                <option value="all">All Subfolders</option>
                {uniqueSubfolders.map((path) => (
                  <option key={path} value={path}>
                    📁 {path}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Right: Column customization & Export */}
        <div className="flex items-center space-x-2">
          {hasActiveFilter && filteredRows.length > 0 && (
            <button
              onClick={() => {
                if (window.confirm(`Remove ${filteredRows.length} matching rows from this dataset?`)) {
                  onRemoveRows(filteredRows.map((row) => row.id));
                }
              }}
              className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-rose-950/70 hover:bg-rose-900 text-rose-300 border border-rose-800 flex items-center space-x-1.5 transition-colors"
              title="Permanently remove the rows matching the current filters"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Remove {filteredRows.length} matching</span>
            </button>
          )}
          <button
            onClick={onOpenAddColumn}
            className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center space-x-1.5 transition-colors"
            title="Add a new column and let ML extract it"
          >
            <Plus className="w-3.5 h-3.5 text-teal-400" />
            <span>Add Column</span>
          </button>

          <button
            onClick={onOpenSchemaEditor}
            className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center space-x-1.5 transition-colors"
            title="Configure columns, data types, and ML prompt guidelines"
          >
            <span>Edit Schema</span>
          </button>
        </div>
      </div>

      {/* Main Spreadsheet Table Container */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        {rows.length === 0 ? (
          <div className="py-20 px-4 text-center">
            <div className="w-16 h-16 rounded-2xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400 mx-auto mb-4">
              <FileSpreadsheet className="w-8 h-8" />
            </div>
            <h3 className="text-base font-semibold text-white mb-1">
              Ready to Extract Folder Data
            </h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto mb-6 leading-relaxed">
              {files.length > 0
                ? `${files.length} documents indexed from folder. Run the machine learning pipeline to extract structured data into columns.`
                : 'No files loaded yet. Upload a local directory or pick one of the sample folders to get started.'}
            </p>

            {files.length > 0 ? (
              <button
                onClick={onRunBatchExtract}
                disabled={isExtracting}
                className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold flex items-center space-x-2 mx-auto shadow-lg shadow-teal-500/20 transition-all disabled:opacity-50"
              >
                <Sparkles className={`w-4 h-4 text-amber-300 ${isExtracting ? 'animate-spin' : ''}`} />
                <span>{isExtracting ? 'Extracting Folder Data...' : `Extract All ${files.length} Files to Spreadsheet`}</span>
              </button>
            ) : null}
          </div>
        ) : (
          <div className="overflow-x-auto max-h-[640px]">
            <table className="w-full text-left border-collapse text-xs">
              {/* Sticky Table Header */}
              <thead className="bg-slate-950/90 text-slate-300 font-semibold sticky top-0 z-20 border-b border-slate-800 select-none">
                <tr>
                  {/* Row # */}
                  <th className="py-3 px-3 w-10 text-center text-slate-400 text-[10px]">#</th>

                  {/* Source Document */}
                  <th className="py-3 px-3 min-w-[200px] border-r border-slate-800">
                    <button
                      onClick={() => handleSort('_fileName')}
                      className="flex items-center space-x-1.5 hover:text-white transition-colors"
                    >
                      <FileText className="w-3.5 h-3.5 text-teal-400" />
                      <span>Source Document</span>
                      {sortKey === '_fileName' ? (
                        sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-teal-400" /> : <ArrowDown className="w-3 h-3 text-teal-400" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-400" />
                      )}
                    </button>
                  </th>

                  {/* ML Confidence Score */}
                  <th className="py-3 px-3 w-28 border-r border-slate-800">
                    <button
                      onClick={() => handleSort('_conf')}
                      className="flex items-center space-x-1 hover:text-white transition-colors"
                    >
                      <Sparkles className="w-3 h-3 text-amber-400" />
                      <span>Accuracy</span>
                      {sortKey === '_conf' ? (
                        sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-amber-400" /> : <ArrowDown className="w-3 h-3 text-amber-400" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-400" />
                      )}
                    </button>
                  </th>

                  {/* Schema Columns */}
                  {columns.map((col) => (
                    <th
                      key={col.key}
                      className="py-3 px-3.5 min-w-[150px] border-r border-slate-800"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <button
                          onClick={() => handleSort(col.key)}
                          className="flex min-w-0 items-center space-x-1.5 hover:text-white transition-colors group"
                          title={col.description}
                        >
                          {getColumnIcon(col.type)}
                          <span className="truncate max-w-[140px]">{col.label}</span>
                          {sortKey === col.key ? (
                            sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-teal-400" /> : <ArrowDown className="w-3 h-3 text-teal-400" />
                          ) : (
                            <ArrowUpDown className="w-3 h-3 text-slate-400 group-hover:text-slate-400" />
                          )}
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm(`Remove the "${col.label}" column from this dataset and future analysis?`)) {
                              onDeleteColumn(col.key);
                            }
                          }}
                          className="p-1 text-slate-400 hover:text-rose-400 transition-colors"
                          title={`Remove ${col.label} column`}
                          aria-label={`Remove ${col.label} column`}
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </th>
                  ))}

                  <th className="py-3 px-3 min-w-[110px] text-right" title="Sum of numeric and currency cells in the row">Row sum</th>

                  {/* Action Column */}
                  <th className="py-3 px-3 w-20 text-center">Actions</th>
                </tr>
              </thead>

              {/* Table Body */}
              <tbody className="divide-y divide-slate-800/70 font-mono text-slate-200">
                {filteredRows.map((row, rowIndex) => {
                  const hasAnomalies = row.anomalies && row.anomalies.length > 0;

                  return (
                    <tr
                      key={row.id}
                      className={`hover:bg-slate-800/40 transition-colors group ${
                        hasAnomalies ? 'bg-amber-950/10' : ''
                      }`}
                    >
                      {/* Row Index */}
                      <td className="py-2.5 px-3 text-center text-[10px] text-slate-400">
                        {rowIndex + 1}
                      </td>

                      {/* Source Document + Subfolder Breadcrumb */}
                      <td className="py-2.5 px-3 border-r border-slate-800 font-sans">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => onInspectRow(row)}
                            className="text-slate-200 hover:text-teal-400 font-medium text-xs truncate max-w-[190px] text-left transition-colors"
                            title={row.fileName}
                          >
                            {row.fileName}
                          </button>
                        </div>
                        <div className="text-[10px] text-slate-400 flex items-center space-x-1 mt-0.5 truncate max-w-[210px]" title={row.relativePath}>
                          <Folder className="w-2.5 h-2.5 shrink-0 text-slate-400" />
                          <span className="truncate">{row.relativePath}</span>
                        </div>
                      </td>

                      {/* ML Confidence & Warnings badge */}
                      <td className="py-2.5 px-3 border-r border-slate-800">
                        <div className="flex items-center space-x-1.5">
                          {getConfidenceBadge(row.overallConfidence)}
                          {hasAnomalies && (
                            <span
                              className="text-amber-400 p-0.5 cursor-help"
                              title={row.anomalies.join('; ')}
                            >
                              <AlertTriangle className="w-3.5 h-3.5" />
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Dynamic Columns with In-place Editing */}
                      {columns.map((col) => {
                        const val = row.data[col.key];
                        const isEditing = editingCell?.rowId === row.id && editingCell?.colKey === col.key;
                        const excerpt = row.sourceExcerpts?.[col.key];

                        return (
                          <td
                            key={col.key}
                            onDoubleClick={() => startEditCell(row.id, col.key, val)}
                            className="py-2 px-3 border-r border-slate-800/80 relative cursor-pointer hover:bg-slate-800/60 transition-colors text-xs"
                          >
                            {isEditing ? (
                              <input
                                autoFocus
                                type="text"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onBlur={saveEditCell}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') saveEditCell();
                                  if (e.key === 'Escape') setEditingCell(null);
                                }}
                                className="w-full bg-slate-950 border border-teal-500 rounded px-1.5 py-1 text-xs text-white focus:outline-none"
                              />
                            ) : (
                              <div className="flex items-center justify-between group/cell">
                                <span className="truncate max-w-[170px]" title={String(val ?? '')}>
                                  {val === undefined || val === null || val === '' ? (
                                    <span className="text-slate-400 font-normal italic text-[11px]">
                                      —
                                    </span>
                                  ) : col.type === 'currency' ? (
                                    typeof val === 'number'
                                      ? `$${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                                      : `$${val}`
                                  ) : col.type === 'tag' ? (
                                    <span className="inline-block px-1.5 py-0.5 rounded text-[10px] bg-slate-800 border border-slate-700 text-slate-300 font-sans">
                                      {String(val)}
                                    </span>
                                  ) : col.type === 'boolean' ? (
                                    val ? (
                                      <span className="text-emerald-400 font-semibold">Yes</span>
                                    ) : (
                                      <span className="text-slate-400">No</span>
                                    )
                                  ) : (
                                    String(val)
                                  )}
                                </span>

                                {/* Source evidence quote icon on hover */}
                                {excerpt && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onInspectRow(row);
                                    }}
                                    className="opacity-0 group-hover/cell:opacity-100 text-slate-400 hover:text-teal-400 p-0.5 transition-opacity"
                                    title={`Source Excerpt: "${excerpt}"`}
                                  >
                                    <Quote className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                            )}
                          </td>
                        );
                      })}

                      <td className="py-2.5 px-3 text-right font-semibold text-teal-300" title="Sum of numeric and currency cells; verify units before using">
                        {getRowSum(row).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      </td>

                      {/* Row Action Buttons */}
                      <td className="py-2 px-2 border-slate-800 text-center">
                        <div className="flex items-center justify-center space-x-1 opacity-60 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => onInspectRow(row)}
                            className="p-1 rounded text-slate-400 hover:text-teal-400 hover:bg-slate-800 transition-colors"
                            title="Inspect Source Document & Evidence"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onDeleteRow(row.id)}
                            className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                            title="Delete Row"
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

        {/* Spreadsheet Footer Status Bar */}
        <div className="bg-slate-950/80 border-t border-slate-800 px-4 py-2.5 flex flex-wrap items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center space-x-3">
            <span>
              Showing <strong className="text-white">{filteredRows.length}</strong> of{' '}
              <strong className="text-white">{rows.length}</strong> rows
            </span>
            {searchQuery && (
              <span className="bg-slate-800 text-teal-300 px-2 py-0.5 rounded">
                Filtered by: "{searchQuery}"
              </span>
            )}
            {columnFilterKey && columnFilterValue.trim() && (
              <span className="bg-slate-800 text-teal-300 px-2 py-0.5 rounded">
                {columns.find((column) => column.key === columnFilterKey)?.label} contains "{columnFilterValue}"
              </span>
            )}
            <span className="text-slate-400 hidden sm:inline">
              Double-click any cell to edit inline
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={onCopyGoogleSheets}
              className="text-emerald-400 hover:text-emerald-300 font-medium flex items-center space-x-1 transition-colors"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span>{copied ? 'Copied to Clipboard!' : 'Copy for Sheets'}</span>
            </button>
            <span>•</span>
            <button
              onClick={onExportExcel}
              className="text-teal-400 hover:text-teal-300 font-medium flex items-center space-x-1 transition-colors"
            >
              <Download className="w-3 h-3" />
              <span>Download Excel</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
