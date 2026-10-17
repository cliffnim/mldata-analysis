import React, { useState } from 'react';
import {
  X,
  Plus,
  Sparkles,
  Type,
  DollarSign,
  Calendar,
  Hash,
  Tag,
  ToggleLeft,
  Check,
} from 'lucide-react';
import { ColumnDef, ColumnType } from '../types';

interface AddColumnModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddColumn: (newCol: ColumnDef, backfillWithML: boolean) => void;
  hasExistingRows: boolean;
}

export const AddColumnModal: React.FC<AddColumnModalProps> = ({
  isOpen,
  onClose,
  onAddColumn,
  hasExistingRows,
}) => {
  const [label, setLabel] = useState('');
  const [type, setType] = useState<ColumnType>('string');
  const [description, setDescription] = useState('');
  const [backfillWithML, setBackfillWithML] = useState(true);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!label.trim()) return;

    const key = label
      .trim()
      .toLowerCase()
      .replace(/[^a-zA-Z0-9]+(.)/g, (_, chr) => chr.toUpperCase())
      .replace(/[^a-zA-Z0-9]/g, '');

    const newCol: ColumnDef = {
      key: key || 'col_' + Date.now().toString(36),
      label: label.trim(),
      type,
      description: description.trim() || `Extract ${label.trim()} from the file`,
      required: false,
    };

    onAddColumn(newCol, hasExistingRows && backfillWithML);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
              <Plus className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Add Spreadsheet Column</h3>
              <p className="text-[11px] text-slate-400">Define a new attribute to extract</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Column Title / Header *
            </label>
            <input
              type="text"
              required
              autoFocus
              placeholder="e.g. Payment Method, Tax ID, PO Number, SKU"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Data Type
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as ColumnType)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-teal-500"
            >
              <option value="string">Text / String</option>
              <option value="number">Number</option>
              <option value="currency">Currency ($ USD / Local)</option>
              <option value="date">Date (YYYY-MM-DD)</option>
              <option value="tag">Category Tag</option>
              <option value="boolean">Boolean (Yes / No)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Extraction Prompt Hint (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Look for credit card, wire transfer, or check details"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
            />
          </div>

          {hasExistingRows && (
            <div className="pt-2">
              <label className="flex items-start space-x-2.5 p-3 rounded-xl bg-teal-950/30 border border-teal-800/50 cursor-pointer hover:bg-teal-950/40 transition-colors">
                <input
                  type="checkbox"
                  checked={backfillWithML}
                  onChange={(e) => setBackfillWithML(e.target.checked)}
                  className="rounded border-slate-700 text-teal-600 focus:ring-teal-500 mt-0.5"
                />
                <div className="text-xs">
                  <span className="font-semibold text-teal-300 flex items-center space-x-1">
                    <Sparkles className="w-3.5 h-3.5 text-amber-300 inline" />
                    <span>Auto-extract with ML for existing files</span>
                  </span>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Machine learning will immediately inspect all existing documents in this folder and populate this new column.
                  </p>
                </div>
              </label>
            </div>
          )}

          {/* Buttons */}
          <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-lg text-xs font-medium bg-teal-600 hover:bg-teal-500 text-white flex items-center space-x-1.5 shadow-sm transition-colors"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Add to Spreadsheet</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
