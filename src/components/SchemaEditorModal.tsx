import React, { useState } from 'react';
import {
  X,
  Sliders,
  Plus,
  Trash2,
  Sparkles,
  Check,
  Type,
  DollarSign,
  Calendar,
  Hash,
  Tag,
  ToggleLeft,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import { ColumnDef, ColumnType, DatasetSchema } from '../types';

interface SchemaEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  schema: DatasetSchema;
  onSaveSchema: (newSchema: DatasetSchema, shouldReExtractNewColumns?: boolean) => void;
  onAutoDetectSchema: () => void;
  isDetecting: boolean;
}

export const SchemaEditorModal: React.FC<SchemaEditorModalProps> = ({
  isOpen,
  onClose,
  schema,
  onSaveSchema,
  onAutoDetectSchema,
  isDetecting,
}) => {
  const [columns, setColumns] = useState<ColumnDef[]>(schema.columns || []);
  const [spreadsheetTitle, setSpreadsheetTitle] = useState(schema.spreadsheetTitle || '');
  const [category, setCategory] = useState(schema.category || '');
  const [instructions, setInstructions] = useState(schema.extractionInstructions || '');
  const [newColKey, setNewColKey] = useState('');
  const [newColLabel, setNewColLabel] = useState('');
  const [newColType, setNewColType] = useState<ColumnType>('string');
  const [newColDesc, setNewColDesc] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  if (!isOpen) return null;

  const handleAddColumn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newColLabel.trim()) return;

    const key =
      newColKey.trim() ||
      newColLabel
        .trim()
        .toLowerCase()
        .replace(/[^a-zA-Z0-9]+(.)/g, (_, chr) => chr.toUpperCase());

    const newCol: ColumnDef = {
      key,
      label: newColLabel.trim(),
      type: newColType,
      description: newColDesc.trim() || `Extract ${newColLabel.trim()} from the file`,
      required: false,
    };

    setColumns([...columns, newCol]);
    setNewColKey('');
    setNewColLabel('');
    setNewColType('string');
    setNewColDesc('');
    setShowAddForm(false);
  };

  const handleRemoveColumn = (index: number) => {
    setColumns(columns.filter((_, i) => i !== index));
  };

  const handleUpdateColumnType = (index: number, newType: ColumnType) => {
    const updated = [...columns];
    updated[index].type = newType;
    setColumns(updated);
  };

  const handleUpdateColumnLabel = (index: number, newLabel: string) => {
    const updated = [...columns];
    updated[index].label = newLabel;
    setColumns(updated);
  };

  const handleSave = () => {
    onSaveSchema({
      ...schema,
      spreadsheetTitle,
      category,
      columns,
      extractionInstructions: instructions,
    });
    onClose();
  };

  const getTypeIcon = (type: ColumnType) => {
    switch (type) {
      case 'currency':
        return <DollarSign className="w-3.5 h-3.5 text-emerald-400" />;
      case 'date':
        return <Calendar className="w-3.5 h-3.5 text-blue-400" />;
      case 'number':
        return <Hash className="w-3.5 h-3.5 text-amber-400" />;
      case 'tag':
        return <Tag className="w-3.5 h-3.5 text-purple-400" />;
      case 'boolean':
        return <ToggleLeft className="w-3.5 h-3.5 text-pink-400" />;
      default:
        return <Type className="w-3.5 h-3.5 text-slate-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">Spreadsheet Schema & ML Rules</h2>
              <p className="text-xs text-slate-400">Configure target columns, data types, and extraction instructions</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={onAutoDetectSchema}
              disabled={isDetecting}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 border border-indigo-500/40 flex items-center space-x-1.5 transition-colors disabled:opacity-50"
              title="Ask the configured AI provider to re-analyze sample files and regenerate optimal columns"
            >
              <Sparkles className={`w-3.5 h-3.5 text-amber-300 ${isDetecting ? 'animate-spin' : ''}`} />
              <span>{isDetecting ? 'AI Analyzing...' : 'Auto-Detect Columns'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Metadata inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Spreadsheet Title
              </label>
              <input
                type="text"
                value={spreadsheetTitle}
                onChange={(e) => setSpreadsheetTitle(e.target.value)}
                placeholder="e.g. Q1 Vendor Invoices"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Category / Domain
              </label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="e.g. Financial Invoices, Resumes, Lab Panels"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Columns Table */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Extracted Columns ({columns.length})
              </span>
              <button
                type="button"
                onClick={() => setShowAddForm(!showAddForm)}
                className="text-xs font-medium text-indigo-400 hover:text-indigo-300 flex items-center space-x-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Custom Column</span>
              </button>
            </div>

            {/* Add Column Mini-Form */}
            {showAddForm && (
              <form onSubmit={handleAddColumn} className="mb-4 p-4 rounded-xl bg-slate-800/80 border border-indigo-500/30 space-y-3">
                <div className="text-xs font-semibold text-indigo-300">Add New Column to Spreadsheet</div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Column Label</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Tax ID, PO Number"
                      value={newColLabel}
                      onChange={(e) => setNewColLabel(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Data Type</label>
                    <select
                      value={newColType}
                      onChange={(e) => setNewColType(e.target.value as ColumnType)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                    >
                      <option value="string">Text / String</option>
                      <option value="number">Number</option>
                      <option value="currency">Currency ($)</option>
                      <option value="date">Date (YYYY-MM-DD)</option>
                      <option value="tag">Category Tag</option>
                      <option value="boolean">Boolean (True/False)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Extraction Description</label>
                    <input
                      type="text"
                      placeholder="Guidance for ML model"
                      value={newColDesc}
                      onChange={(e) => setNewColDesc(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
                <div className="flex justify-end space-x-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="px-3 py-1 rounded text-xs text-slate-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-3 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium"
                  >
                    Add Column
                  </button>
                </div>
              </form>
            )}

            {/* List of current columns */}
            <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/40">
              <div className="max-h-64 overflow-y-auto divide-y divide-slate-800/80">
                {columns.map((col, index) => (
                  <div key={col.key || index} className="p-3 flex items-center justify-between space-x-3 hover:bg-slate-800/40 transition-colors">
                    <div className="flex items-center space-x-3 min-w-0 flex-1">
                      <div className="p-1.5 rounded bg-slate-800 border border-slate-700/80">
                        {getTypeIcon(col.type)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center space-x-2">
                          <input
                            type="text"
                            value={col.label}
                            onChange={(e) => handleUpdateColumnLabel(index, e.target.value)}
                            className="bg-transparent border-b border-transparent hover:border-slate-700 focus:border-indigo-500 text-xs font-medium text-white px-1 py-0.5 focus:outline-none"
                          />
                          <span className="text-[10px] font-mono text-slate-400">
                            ({col.key})
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 truncate mt-0.5">
                          {col.description}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      <select
                        value={col.type}
                        onChange={(e) => handleUpdateColumnType(index, e.target.value as ColumnType)}
                        className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-[11px] text-slate-300 focus:outline-none focus:border-indigo-500"
                      >
                        <option value="string">Text</option>
                        <option value="number">Number</option>
                        <option value="currency">Currency</option>
                        <option value="date">Date</option>
                        <option value="tag">Tag</option>
                        <option value="boolean">Boolean</option>
                      </select>

                      <button
                        onClick={() => handleRemoveColumn(index)}
                        className="p-1 text-slate-400 hover:text-rose-400 rounded transition-colors"
                        title="Remove Column"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Machine Learning Extraction Guidance */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Custom ML Prompt Guidelines & Normalization Rules
            </label>
            <textarea
              rows={3}
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="e.g. Standardize vendor names, convert all currencies to numbers, parse dates to YYYY-MM-DD format..."
              className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 leading-relaxed font-sans"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Passed directly to the configured AI model when parsing each document in the folder.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-950/60 border-t border-slate-800/80 flex items-center justify-between">
          <span className="text-[11px] text-slate-400">
            {columns.length} columns defined
          </span>
          <div className="flex items-center space-x-2">
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-1.5 rounded-lg text-xs font-medium bg-teal-600 hover:bg-teal-500 text-white flex items-center space-x-1.5 shadow-sm transition-colors"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Apply Schema Changes</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
