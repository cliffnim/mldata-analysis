import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { ColumnDef, ExtractedRow } from '../types';
import { DataInterpreterView } from './DataInterpreterView';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const columns: ColumnDef[] = [
  { key: 'region', label: 'Region', type: 'string', description: '' },
  { key: 'revenue', label: 'Revenue', type: 'currency', description: '' },
];

const rows: ExtractedRow[] = [{
  id: 'row-1',
  fileId: 'file-1',
  fileName: 'sales.csv',
  relativePath: 'sales.csv',
  data: { region: 'North', revenue: 42 },
  overallConfidence: 100,
  fieldConfidence: {},
  sourceExcerpts: {},
  anomalies: [],
  summary: '',
  extractedAt: '2026-01-01T00:00:00.000Z',
}];

function renderInterpreter() {
  return render(
    <DataInterpreterView
      spreadsheetTitle="Sales"
      columns={columns}
      rows={rows}
      files={[]}
      interpretation={null}
      onRunInterpretation={() => {}}
      isInterpreting={false}
    />
  );
}

describe('DataInterpreterView Python workbench', () => {
  it('shows loading and posts the active dataset for Python profiling', async () => {
    let resolveFetch!: (response: Response) => void;
    let requestBody = '';
    const pending = new Promise<Response>((resolve) => { resolveFetch = resolve; });
    const fetchMock = vi.fn((_input: RequestInfo | URL, init?: RequestInit) => {
      requestBody = String(init?.body || '');
      return pending;
    });
    vi.stubGlobal('fetch', fetchMock);
    renderInterpreter();

    fireEvent.click(screen.getByRole('button', { name: 'Generate Python profile' }));
    expect(screen.getByRole('status').textContent).toContain('Processing 1 rows');
    expect(fetchMock).toHaveBeenCalledOnce();
    const request = JSON.parse(requestBody);
    expect(request).toMatchObject({
      mode: 'profile',
      rows: [{ region: 'North', revenue: 42 }],
      columns,
    });

    resolveFetch({
      ok: true,
      status: 200,
      json: async () => ({ mode: 'profile', title: 'Python dataset profile', rowCount: 1, columnCount: 2, missingCells: 0, duplicateRows: 0, columns: [] }),
    } as Response);
    expect(await screen.findByText('Python dataset profile')).toBeTruthy();
  }, 15_000);

  it('sends the selected target to the supervised model endpoint', async () => {
    let requestBody = '';
    const fetchMock = vi.fn((_input: RequestInfo | URL, init?: RequestInit) => {
      requestBody = String(init?.body || '');
      return Promise.resolve({
      ok: true,
      status: 200,
      json: async () => ({ mode: 'train', title: 'Random Forest regression model', task: 'regression', metrics: { meanAbsoluteError: 2.1 }, featureImportance: [] }),
      } as Response);
    });
    vi.stubGlobal('fetch', fetchMock);
    renderInterpreter();

    fireEvent.click(screen.getByRole('button', { name: 'Train model' }));
    fireEvent.change(screen.getByLabelText('Predict target column'), { target: { value: 'revenue' } });
    fireEvent.click(screen.getByRole('button', { name: 'Train and evaluate' }));

    expect(await screen.findByText('Random Forest regression model')).toBeTruthy();
    const request = JSON.parse(requestBody);
    expect(request).toMatchObject({ mode: 'train', target: 'revenue' });
  }, 15_000);

  it('shows a helpful message when the Python worker is not available', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
      json: async () => ({ error: 'Python analysis dependencies are missing. Install them with python3 -m pip install -r python/requirements.txt.' }),
    }));
    renderInterpreter();

    fireEvent.click(screen.getByRole('button', { name: 'Generate Python profile' }));

    expect((await screen.findByRole('alert')).textContent).toContain('Python analysis dependencies are missing');
  }, 15_000);

  it('explains that static hosting cannot run the Python worker', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    renderInterpreter();

    fireEvent.click(screen.getByRole('button', { name: 'Generate Python profile' }));

    expect((await screen.findByRole('alert')).textContent).toContain('static hosting alone cannot run the Python worker');
  }, 15_000);
});