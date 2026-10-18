import { describe, expect, it } from 'vitest';
import { ColumnDef, ExtractedRow } from '../types';
import {
  computeClientDataAudit,
  generateClientDataInterpretation,
  generateClientFullReport,
} from './clientAnalysisEngine';

const columns: ColumnDef[] = [
  { key: 'customer', label: 'Customer', type: 'string', description: '' },
  { key: 'amount', label: 'Amount', type: 'currency', description: '' },
];

const rows: ExtractedRow[] = [
  {
    id: 'row-1',
    fileId: 'file-1',
    fileName: 'sales.csv',
    relativePath: 'sales.csv',
    data: { customer: 'Ada', amount: 10 },
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
    fileName: 'sales.csv',
    relativePath: 'sales.csv',
    data: { customer: 'Lin', amount: 20 },
    overallConfidence: 100,
    fieldConfidence: {},
    sourceExcerpts: {},
    anomalies: [],
    summary: '',
    extractedAt: '2026-01-01T00:00:00.000Z',
  },
];

describe('client-side analysis and report regression', () => {
  it('computes local audit and interpretation metrics deterministically', () => {
    const audit = computeClientDataAudit(rows, columns);
    const interpretation = generateClientDataInterpretation('Quarterly Sales', columns, rows, []);

    expect(audit.totalMissingValues).toBe(0);
    expect(interpretation.executiveSummary).toContain('Quarterly Sales');
    expect(interpretation.metrics.find((metric) => metric.label === 'Avg Amount')?.value).toBe('$15');
    expect(interpretation.workbookComparison?.[0].rowCount).toBe(2);
  });

  it('generates the local full report from the same dataset without an AI call', () => {
    const report = generateClientFullReport('Quarterly Sales', columns, rows, computeClientDataAudit(rows, columns));

    expect(report.reportTitle).toContain('Quarterly Sales');
    expect(report.datasetSummary).toMatchObject({ totalRows: 2, totalColumns: 2, healthScore: 100 });
    expect(report.columnDeepDives.map((column) => column.columnLabel)).toEqual(['Customer', 'Amount']);
    expect(report.actionableRecommendations.length).toBeGreaterThan(0);
  });
});