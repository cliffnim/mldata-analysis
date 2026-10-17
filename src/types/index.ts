export type ColumnType = 'string' | 'number' | 'currency' | 'date' | 'boolean' | 'tag';

export interface ColumnDef {
  key: string;
  label: string;
  type: ColumnType;
  description: string;
  required?: boolean;
}

export interface DatasetSchema {
  category: string;
  spreadsheetTitle: string;
  domainSummary: string;
  columns: ColumnDef[];
  extractionInstructions: string;
}

export interface ExcelSheetInfo {
  sheetName: string;
  rowCount: number;
  columnCount: number;
  headers: string[];
  previewRows: Record<string, any>[];
  allRows: Record<string, any>[];
}

export interface WorkbookData {
  fileName: string;
  relativePath: string;
  sheets: ExcelSheetInfo[];
  totalRows: number;
}

export interface FolderFile {
  id: string;
  name: string;
  relativePath: string;
  size: number;
  mimeType: string;
  content?: string;
  base64?: string;
  workbookData?: WorkbookData;
  fileCategory?: 'excel' | 'document' | 'image' | 'text';
  status: 'idle' | 'extracting' | 'completed' | 'error';
  errorMessage?: string;
}

export interface ExtractedRow {
  id: string;
  fileId: string;
  fileName: string;
  relativePath: string;
  sheetName?: string;
  data: Record<string, any>;
  overallConfidence: number;
  fieldConfidence: Record<string, number>;
  sourceExcerpts: Record<string, string>;
  anomalies: string[];
  summary: string;
  extractedAt: string;
}

export interface MetricCard {
  label: string;
  value: string;
  change?: string;
  trend?: 'up' | 'down' | 'neutral';
}

export interface DataInterpretation {
  executiveSummary: string;
  keyFindings: string[];
  metrics: MetricCard[];
  workbookComparison?: { workbookName: string; rowCount: number; summary: string }[];
  anomalies: string[];
  recommendations: string[];
  dataQualityRating?: number;
}

export interface DataCleanAudit {
  totalIssues: number;
  missingValuesByCol: Record<string, number>;
  totalMissingValues: number;
  duplicateRowsCount: number;
  duplicateRowIndices: number[];
  whitespaceIssuesCount: number;
  outliersByCol: Record<string, number>;
  dataHealthScore: number;
}

export interface CleanHistoryItem {
  id: string;
  action: string;
  details: string;
  timestamp: string;
  affectedCount: number;
}

export interface StrategicInsight {
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
}

export interface RiskAnomaly {
  issue: string;
  affectedColumns: string[];
  severity: 'high' | 'medium' | 'low';
  recommendation: string;
}

export interface ActionableRecommendation {
  recommendation: string;
  category: 'operational' | 'data_hygiene' | 'business_strategy';
  priority: 'high' | 'medium' | 'low';
}

export interface ColumnDeepDive {
  columnLabel: string;
  type: string;
  summary: string;
  patternObservation: string;
}

export interface FullAnalysisReport {
  reportTitle: string;
  generatedAt: string;
  datasetSummary: {
    totalRows: number;
    totalColumns: number;
    domain: string;
    healthScore: number;
  };
  executiveSummary: string;
  strategicInsights: StrategicInsight[];
  statisticalNarrative: string;
  columnDeepDives: ColumnDeepDive[];
  riskAndAnomalies: RiskAnomaly[];
  actionableRecommendations: ActionableRecommendation[];
  conclusion: string;
}

export interface ExtractionPreset {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  files: {
    name: string;
    relativePath: string;
    mimeType: string;
    content: string;
  }[];
  defaultSchema: DatasetSchema;
}

export type ViewTab =
  | 'spreadsheet'
  | 'cleaner'
  | 'analytics'
  | 'interpreter'
  | 'report'
  | 'combine'
  | 'files'
  | 'schema';
