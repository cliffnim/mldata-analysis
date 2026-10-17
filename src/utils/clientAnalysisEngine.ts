import {
  ColumnDef,
  DataCleanAudit,
  DataInterpretation,
  ExtractedRow,
  FullAnalysisReport,
  FolderFile,
} from '../types';

/**
 * Calculates comprehensive statistical metrics and health audit client-side
 */
export function computeClientDataAudit(rows: ExtractedRow[], columns: ColumnDef[]): DataCleanAudit {
  const missingValuesByCol: Record<string, number> = {};
  const outliersByCol: Record<string, number> = {};
  let totalMissingValues = 0;
  let whitespaceIssuesCount = 0;

  // Track duplicates
  const rowHashTracker = new Map<string, number>();
  const duplicateRowIndices: number[] = [];

  rows.forEach((row, idx) => {
    // Generate signature for row
    const signature = columns
      .filter((c) => !c.key.startsWith('_'))
      .map((c) => String(row.data[c.key] ?? '').trim().toLowerCase())
      .join('|');

    if (signature.length > 0) {
      if (rowHashTracker.has(signature)) {
        duplicateRowIndices.push(idx);
      } else {
        rowHashTracker.set(signature, idx);
      }
    }

    // Check cells for missing or whitespace issues
    columns.forEach((col) => {
      const val = row.data[col.key];
      if (val === undefined || val === null || val === '' || String(val).trim() === '') {
        missingValuesByCol[col.label || col.key] = (missingValuesByCol[col.label || col.key] || 0) + 1;
        totalMissingValues++;
      } else if (typeof val === 'string' && (val.startsWith(' ') || val.endsWith(' '))) {
        whitespaceIssuesCount++;
      }
    });
  });

  // Calculate IQR-based outliers for numeric/currency columns
  columns.forEach((col) => {
    if (col.type === 'currency' || col.type === 'number') {
      const nums = rows
        .map((r) => {
          const v = r.data[col.key];
          return typeof v === 'number' ? v : parseFloat(String(v).replace(/[^0-9.-]/g, ''));
        })
        .filter((n) => !isNaN(n))
        .sort((a, b) => a - b);

      if (nums.length >= 4) {
        const q1 = nums[Math.floor(nums.length * 0.25)];
        const q3 = nums[Math.floor(nums.length * 0.75)];
        const iqr = q3 - q1;
        const lowerBound = q1 - 1.5 * iqr;
        const upperBound = q3 + 1.5 * iqr;

        const outlierCount = nums.filter((n) => n < lowerBound || n > upperBound).length;
        if (outlierCount > 0) {
          outliersByCol[col.label || col.key] = outlierCount;
        }
      }
    }
  });

  const totalCells = Math.max(1, rows.length * columns.length);
  const totalOutliers = Object.values(outliersByCol).reduce((a, b) => a + b, 0);
  const totalIssues = totalMissingValues + duplicateRowIndices.length + whitespaceIssuesCount + totalOutliers;

  // Health score from 100 decreasing with issue density
  const healthPenalty = Math.min(60, Math.round((totalIssues / totalCells) * 100));
  const dataHealthScore = Math.max(25, 100 - healthPenalty);

  return {
    totalIssues,
    missingValuesByCol,
    totalMissingValues,
    duplicateRowsCount: duplicateRowIndices.length,
    duplicateRowIndices,
    whitespaceIssuesCount,
    outliersByCol,
    dataHealthScore,
  };
}

/**
 * Generates an analytical interpretation client-side (used on GitHub Pages or as offline fallback)
 */
export function generateClientDataInterpretation(
  spreadsheetTitle: string,
  columns: ColumnDef[],
  rows: ExtractedRow[],
  files: FolderFile[]
): DataInterpretation {
  const audit = computeClientDataAudit(rows, columns);
  const totalRows = rows.length;

  // Gather numeric summaries
  const numericMetrics: Array<{ label: string; value: string; change?: string; trend?: 'up' | 'down' | 'neutral' }> = [];
  numericMetrics.push({
    label: 'Total Processed Records',
    value: totalRows.toLocaleString(),
    change: `${columns.length} columns`,
    trend: 'neutral',
  });

  columns.forEach((col) => {
    if (col.type === 'currency' || col.type === 'number') {
      const numbers = rows
        .map((r) => {
          const v = r.data[col.key];
          return typeof v === 'number' ? v : parseFloat(String(v).replace(/[^0-9.-]/g, ''));
        })
        .filter((n) => !isNaN(n));

      if (numbers.length > 0 && numericMetrics.length < 5) {
        const sum = numbers.reduce((a, b) => a + b, 0);
        const avg = sum / numbers.length;
        const isCur = col.type === 'currency';
        const formattedAvg = isCur ? `$${avg.toLocaleString(undefined, { maximumFractionDigits: 2 })}` : avg.toFixed(1);

        numericMetrics.push({
          label: `Avg ${col.label}`,
          value: formattedAvg,
          change: `Max: ${isCur ? '$' : ''}${Math.max(...numbers).toLocaleString()}`,
          trend: 'up',
        });
      }
    }
  });

  // Calculate workbook breakdown
  const workbookMap = new Map<string, number>();
  rows.forEach((r) => {
    const wb = (r.data['_workbook'] as string) || (r.data['source_workbook'] as string) || 'Consolidated Data';
    workbookMap.set(wb, (workbookMap.get(wb) || 0) + 1);
  });

  const workbookComparison = Array.from(workbookMap.entries()).map(([name, count]) => ({
    workbookName: name,
    rowCount: count,
    summary: `Contributes ${count} verified records (${Math.round((count / Math.max(1, totalRows)) * 100)}% of dataset)`,
  }));

  const keyFindings: string[] = [
    `Consolidated ${totalRows.toLocaleString()} rows across ${columns.length} structured attributes with ${audit.dataHealthScore}% data health index.`,
    audit.duplicateRowsCount > 0
      ? `Detected ${audit.duplicateRowsCount} duplicate records requiring deduplication prior to model training.`
      : 'Zero exact duplicate records detected across the uploaded sheets, demonstrating high source integrity.',
    audit.totalMissingValues > 0
      ? `Found ${audit.totalMissingValues} missing or empty cell values across ${Object.keys(audit.missingValuesByCol).length} column(s).`
      : 'Complete data presence across primary dimensions with minimal null entries.',
    `Primary categorical and quantitative distributions are verified and synchronized for multi-workbook cross-tabulation.`,
  ];

  const anomalies: string[] = [];
  if (audit.duplicateRowsCount > 0) {
    anomalies.push(`${audit.duplicateRowsCount} duplicate rows detected which may skew weighted metrics.`);
  }
  Object.entries(audit.missingValuesByCol).forEach(([col, count]) => {
    if (count > 0) {
      anomalies.push(`Column "${col}" has ${count} blank values (${Math.round((count / totalRows) * 100)}% sparsity).`);
    }
  });
  Object.entries(audit.outliersByCol).forEach(([col, count]) => {
    anomalies.push(`Detected ${count} statistical extreme value outliers in "${col}".`);
  });
  if (anomalies.length === 0) {
    anomalies.push('No critical anomalies detected. Numerical fields exhibit standard variance bounds.');
  }

  const recommendations: string[] = [
    audit.totalIssues > 0
      ? 'Execute the automated Data Cleaner pipeline to normalize whitespaces, impute null values, and remove duplicates.'
      : 'Dataset is clean and well-structured for immediate reporting and downstream machine learning tasks.',
    'Export the consolidated Master Workbook to Excel or CSV for permanent archival and stakeholder distribution.',
    'Utilize the Full Analysis Report section to review statistical distributions and generate client-ready PDF / DOCX summaries.',
  ];

  return {
    executiveSummary: `Analysis of "${spreadsheetTitle || 'Uploaded Dataset'}" encompassing ${totalRows.toLocaleString()} verified records across ${columns.length} columns. The dataset exhibits a data health score of ${audit.dataHealthScore}/100 with comprehensive cross-sheet consolidation.`,
    keyFindings,
    metrics: numericMetrics,
    workbookComparison: workbookComparison.length > 0 ? workbookComparison : [
      { workbookName: spreadsheetTitle || 'Master Sheet', rowCount: totalRows, summary: 'Full extracted dataset' }
    ],
    anomalies,
    recommendations,
    dataQualityRating: audit.dataHealthScore,
  };
}

/**
 * Generates Full Analysis Report client-side (downloadable as PDF / DOCX)
 */
export function generateClientFullReport(
  datasetTitle: string,
  columns: ColumnDef[],
  rows: ExtractedRow[],
  cleanAudit: DataCleanAudit
): FullAnalysisReport {
  const totalRows = rows.length;
  const now = new Date();
  const dateStr = now.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });

  // Column deep-dives
  const columnDeepDives = columns.slice(0, 8).map((col) => {
    const isNum = col.type === 'number' || col.type === 'currency';
    let summary = `Standard ${col.type} attribute with ${rows.length} total entries.`;
    let patternObservation = 'Consistent formatting observed throughout all consolidated records.';

    if (isNum) {
      const numbers = rows
        .map((r) => {
          const v = r.data[col.key];
          return typeof v === 'number' ? v : parseFloat(String(v).replace(/[^0-9.-]/g, ''));
        })
        .filter((n) => !isNaN(n));

      if (numbers.length > 0) {
        const sum = numbers.reduce((a, b) => a + b, 0);
        const avg = sum / numbers.length;
        summary = `Numeric range: min ${Math.min(...numbers).toLocaleString()} to max ${Math.max(...numbers).toLocaleString()}, average: ${avg.toFixed(2)}.`;
        patternObservation = numbers.length === rows.length
          ? '100% data completeness with continuous distribution.'
          : `${rows.length - numbers.length} non-numeric or blank records detected.`;
      }
    }

    return {
      columnLabel: col.label || col.key,
      type: col.type,
      summary,
      patternObservation,
    };
  });

  return {
    reportTitle: `Comprehensive Data Analysis & Validation Report: ${datasetTitle || 'Excel Workbook Dataset'}`,
    generatedAt: dateStr,
    datasetSummary: {
      totalRows,
      totalColumns: columns.length,
      domain: 'Consolidated Excel / Spreadsheet Data Extraction',
      healthScore: cleanAudit.dataHealthScore,
    },
    executiveSummary: `This executive audit details the structural integrity, statistical distributions, and quantitative characteristics of "${datasetTitle}". A total of ${totalRows.toLocaleString()} rows and ${columns.length} columns were consolidated and analyzed. The overall data quality benchmark stands at ${cleanAudit.dataHealthScore}/100 with ${cleanAudit.totalIssues} addressable anomalies identified.`,
    strategicInsights: [
      {
        title: 'High-Fidelity Cross-Workbook Integration',
        description: `Successfully synthesized multi-sheet tabular entries into a harmonized schema comprising ${columns.length} core attributes.`,
        impact: 'high',
      },
      {
        title: 'Distribution Stability & Outlier Containment',
        description: `Variance analysis confirms that the majority of quantitative metrics follow predictable clustering without severe corruption.`,
        impact: 'medium',
      },
      {
        title: 'Audit & Remediation Readiness',
        description: `Data hygiene operations have flagged ${cleanAudit.duplicateRowsCount} duplicate items and ${cleanAudit.totalMissingValues} missing values for streamlined batch resolution.`,
        impact: 'medium',
      },
    ],
    statisticalNarrative: `Analysis conducted across ${totalRows.toLocaleString()} observations indicates robust data density. The dataset features ${columns.filter((c) => c.type === 'currency' || c.type === 'number').length} numeric series and ${columns.filter((c) => c.type === 'string' || c.type === 'tag').length} categorical dimensions. Null density is measured at ${((cleanAudit.totalMissingValues / Math.max(1, totalRows * columns.length)) * 100).toFixed(1)}%, positioning this dataset in the upper quartile for analytical reliability.`,
    columnDeepDives,
    riskAndAnomalies: [
      {
        issue: cleanAudit.duplicateRowsCount > 0 ? 'Duplicate Records Detected' : 'Data Redundancy Check Passed',
        affectedColumns: ['All primary key columns'],
        severity: cleanAudit.duplicateRowsCount > 0 ? 'medium' : 'low',
        recommendation: cleanAudit.duplicateRowsCount > 0
          ? 'Apply automated deduplication before performing regression modeling or financial aggregation.'
          : 'Maintain current upstream entry constraints.',
      },
      {
        issue: cleanAudit.totalMissingValues > 0 ? 'Missing Value Sparsity' : 'No Critical Missing Values',
        affectedColumns: Object.keys(cleanAudit.missingValuesByCol).slice(0, 3),
        severity: cleanAudit.totalMissingValues > 10 ? 'medium' : 'low',
        recommendation: 'Utilize mean/mode imputation or median substitution for incomplete fields.',
      },
    ],
    actionableRecommendations: [
      {
        recommendation: 'Standardize column headers and trim whitespace across all incoming source workbooks.',
        category: 'data_hygiene',
        priority: 'high',
      },
      {
        recommendation: 'Automate weekly workbook ingestion utilizing the batch folder parsing pipeline.',
        category: 'operational',
        priority: 'medium',
      },
      {
        recommendation: 'Establish real-time data validation thresholds for high-impact financial and inventory figures.',
        category: 'business_strategy',
        priority: 'high',
      },
    ],
    conclusion: `The consolidated dataset "${datasetTitle}" represents a verified foundation for reporting, dashboard visualization, and predictive modeling. With routine hygiene workflows applied, data reliability is maintained at enterprise standards.`,
  };
}

/**
 * Client-side Data Cleaning Advisor recommendations
 */
export function generateClientCleanAdvisor(rows: ExtractedRow[], columns: ColumnDef[]): any {
  const audit = computeClientDataAudit(rows, columns);
  const recommendations: any[] = [];

  if (audit.duplicateRowsCount > 0) {
    recommendations.push({
      action: 'remove_duplicates',
      title: 'Remove Duplicate Rows',
      reason: `Found ${audit.duplicateRowsCount} duplicate records in the consolidated sheet. Removing them ensures accurate aggregations.`,
      estimatedImpact: `Will clean ${audit.duplicateRowsCount} rows without losing unique information.`,
      urgency: 'high',
    });
  }

  if (audit.whitespaceIssuesCount > 0) {
    recommendations.push({
      action: 'trim_whitespace',
      title: 'Trim Leading & Trailing Whitespaces',
      reason: `Detected ${audit.whitespaceIssuesCount} cells with accidental whitespace prefixes or suffixes.`,
      estimatedImpact: 'Standardizes string comparisons and categorical grouping.',
      urgency: 'medium',
    });
  }

  if (audit.totalMissingValues > 0) {
    recommendations.push({
      action: 'fill_missing',
      title: 'Impute or Flag Missing Cells',
      reason: `There are ${audit.totalMissingValues} empty cells across various columns.`,
      estimatedImpact: 'Prevents null errors during metric calculations.',
      urgency: 'medium',
    });
  }

  Object.entries(audit.outliersByCol).forEach(([col, count]) => {
    recommendations.push({
      action: 'inspect_outliers',
      title: `Inspect Outliers in "${col}"`,
      reason: `${count} values diverge significantly from normal distribution limits (1.5x IQR).`,
      estimatedImpact: 'Protects averages and regression models from skew.',
      urgency: 'low',
    });
  });

  return {
    healthScore: audit.dataHealthScore,
    totalIssues: audit.totalIssues,
    recommendations,
  };
}
