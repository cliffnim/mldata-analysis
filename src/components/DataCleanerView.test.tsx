import React, { useRef, useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { DataCleanerView } from './DataCleanerView';
import { ColumnDef, ExtractedRow } from '../types';

afterEach(cleanup);

const columns: ColumnDef[] = [
  { key: 'name', label: 'Name', type: 'string', description: '' },
  { key: 'amount', label: 'Amount', type: 'currency', description: '' },
];

const importedRows: ExtractedRow[] = [
  {
    id: 'row-1',
    fileId: 'file-1',
    fileName: 'first.csv',
    relativePath: 'first.csv',
    data: { name: '  Ada  ', amount: '$1,200' },
    overallConfidence: 100,
    fieldConfidence: {},
    sourceExcerpts: {},
    anomalies: [],
    summary: '',
    extractedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'row-2',
    fileId: 'file-2',
    fileName: 'duplicate.csv',
    relativePath: 'duplicate.csv',
    data: { name: '  Ada  ', amount: '$1,200' },
    overallConfidence: 100,
    fieldConfidence: {},
    sourceExcerpts: {},
    anomalies: [],
    summary: '',
    extractedAt: '2026-01-01T00:00:00.000Z',
  },
];

function CleaningHarness() {
  const [rows, setRows] = useState(importedRows);
  const [history, setHistory] = useState<Parameters<typeof DataCleanerView>[0]['cleanHistory']>([]);
  const original = useRef(importedRows.map((row) => ({ ...row, data: { ...row.data } })));

  return (
    <>
      <output aria-label="Current rows">{JSON.stringify(rows.map((row) => row.data))}</output>
      <DataCleanerView
        columns={columns}
        rows={rows}
        cleanHistory={history}
        onUpdateRows={(nextRows, historyItem) => {
          setRows(nextRows);
          setHistory((previous) => [historyItem, ...previous]);
        }}
        onRevertLastClean={() => {}}
        onResetCleaning={() => {
          setRows(original.current.map((row) => ({ ...row, data: { ...row.data } })));
          setHistory([]);
        }}
        onNavigateToTab={() => {}}
      />
    </>
  );
}

describe('DataCleanerView reversible workflow', () => {
  it('previews before applying and reset restores imported values without mutating them', () => {
    const onUpdateRows = vi.fn();
    render(<DataCleanerView
      columns={columns}
      rows={[importedRows[0]]}
      cleanHistory={[]}
      onUpdateRows={onUpdateRows}
      onRevertLastClean={() => {}}
      onResetCleaning={() => {}}
      onNavigateToTab={() => {}}
    />);

    fireEvent.click(screen.getByRole('button', { name: /Trim Whitespaces/ }));
    expect(onUpdateRows).not.toHaveBeenCalled();
    expect(screen.getByRole('region', { name: 'Cleaning preview' }).textContent)
      .toContain('Current data and analysis remain unchanged');
    expect(importedRows[0].data.name).toBe('  Ada  ');

    fireEvent.click(screen.getByRole('button', { name: 'Apply Preview' }));
    expect(onUpdateRows).toHaveBeenCalledOnce();
    const appliedRows = onUpdateRows.mock.calls[0][0] as ExtractedRow[];
    expect(appliedRows[0].data.name).toBe('Ada');
    expect(importedRows[0].data.name).toBe('  Ada  ');
  }, 15_000);

  it('applies auto-clean deduplication and numeric parsing, then reset returns to imported rows', () => {
    render(<CleaningHarness />);
    const currentRows = screen.getByLabelText('Current rows');

    fireEvent.click(screen.getByRole('button', { name: '1-Click Auto-Clean All Issues' }));
    expect(currentRows.textContent).toContain('"$1,200"');
    expect(screen.getByRole('region', { name: 'Cleaning preview' }).textContent).toContain('Rows: 2 → 1');

    fireEvent.click(screen.getByRole('button', { name: 'Apply Preview' }));
    const applied = JSON.parse(currentRows.textContent || '[]');
    expect(applied).toHaveLength(1);
    expect(applied[0]).toEqual({ name: 'Ada', amount: 1200 });
    expect(importedRows[0].data).toEqual({ name: '  Ada  ', amount: '$1,200' });

    fireEvent.click(screen.getByRole('button', { name: 'Reset to Imported Data' }));
    expect(JSON.parse(currentRows.textContent || '[]')).toEqual(importedRows.map((row) => row.data));
  }, 15_000);
});