import {
  Document,
  Packer,
  Paragraph,
  Table,
  TableRow,
  TableCell,
  TextRun,
  HeadingLevel,
  AlignmentType,
  WidthType,
  BorderStyle,
} from 'docx';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas-pro';
import { ColumnDef, ExtractedRow, FullAnalysisReport } from '../types';

/**
 * Generate and download a formatted Microsoft Word (.docx) document
 * with executive narrative, statistical tables, and distribution breakdowns.
 */
export async function downloadReportAsDocx(
  report: FullAnalysisReport,
  columns: ColumnDef[],
  rows: ExtractedRow[],
  datasetTitle: string
) {
  // Compute numeric stats for tables
  const numericStats: {
    label: string;
    count: number;
    mean: number;
    stdDev: number;
    min: number;
    median: number;
    max: number;
    sum: number;
  }[] = [];

  columns
    .filter((c) => c.type === 'number' || c.type === 'currency')
    .forEach((col) => {
      const nums = rows
        .map((r) => parseFloat(r.data[col.key]))
        .filter((n) => !isNaN(n))
        .sort((a, b) => a - b);

      if (nums.length > 0) {
        const sum = nums.reduce((a, b) => a + b, 0);
        const mean = Math.round((sum / nums.length) * 100) / 100;
        const median = nums[Math.floor(nums.length / 2)];
        const min = nums[0];
        const max = nums[nums.length - 1];
        const variance = nums.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / nums.length;
        const stdDev = Math.round(Math.sqrt(variance) * 100) / 100;

        numericStats.push({
          label: col.label,
          count: nums.length,
          mean,
          stdDev,
          min,
          median,
          max,
          sum,
        });
      }
    });

  // Helper for creating table cells
  const createCell = (text: string, isHeader = false, widthPercent = 20) => {
    return new TableCell({
      width: { size: widthPercent, type: WidthType.PERCENTAGE },
      shading: isHeader ? { fill: '1E293B' } : { fill: 'FFFFFF' },
      children: [
        new Paragraph({
          children: [
            new TextRun({
              text,
              bold: isHeader,
              color: isHeader ? 'FFFFFF' : '0F172A',
              size: isHeader ? 19 : 18,
              font: 'Calibri',
            }),
          ],
        }),
      ],
    });
  };

  // Build Numeric Stats Table
  const statsTableRows: TableRow[] = [
    new TableRow({
      children: [
        createCell('Attribute / Metric', true, 25),
        createCell('Count', true, 12),
        createCell('Mean (μ)', true, 15),
        createCell('Std Dev (σ)', true, 15),
        createCell('Min / Max', true, 18),
        createCell('Total Sum', true, 15),
      ],
    }),
  ];

  numericStats.forEach((s) => {
    statsTableRows.push(
      new TableRow({
        children: [
          createCell(s.label, false, 25),
          createCell(s.count.toString(), false, 12),
          createCell(s.mean.toLocaleString(), false, 15),
          createCell(`±${s.stdDev.toLocaleString()}`, false, 15),
          createCell(`${s.min.toLocaleString()} / ${s.max.toLocaleString()}`, false, 18),
          createCell(s.sum.toLocaleString(), false, 15),
        ],
      })
    );
  });

  const statsTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: statsTableRows,
  });

  // Build Column Deep Dives Table
  const deepDiveTableRows: TableRow[] = [
    new TableRow({
      children: [
        createCell('Column Name', true, 22),
        createCell('Data Type', true, 15),
        createCell('Summary Profile', true, 30),
        createCell('Observed Pattern', true, 33),
      ],
    }),
  ];

  report.columnDeepDives.forEach((cd) => {
    deepDiveTableRows.push(
      new TableRow({
        children: [
          createCell(cd.columnLabel, false, 22),
          createCell(cd.type, false, 15),
          createCell(cd.summary, false, 30),
          createCell(cd.patternObservation, false, 33),
        ],
      })
    );
  });

  const deepDivesTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: deepDiveTableRows,
  });

  // Build Strategic Recommendations Table
  const recsTableRows: TableRow[] = [
    new TableRow({
      children: [
        createCell('#', true, 8),
        createCell('Priority', true, 15),
        createCell('Category', true, 22),
        createCell('Strategic Recommendation', true, 55),
      ],
    }),
  ];

  report.actionableRecommendations.forEach((rec, idx) => {
    recsTableRows.push(
      new TableRow({
        children: [
          createCell((idx + 1).toString(), false, 8),
          createCell(rec.priority.toUpperCase(), false, 15),
          createCell(rec.category.replace('_', ' ').toUpperCase(), false, 22),
          createCell(rec.recommendation, false, 55),
        ],
      })
    );
  });

  const recsTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: recsTableRows,
  });

  // Construct Document
  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          // Title
          new Paragraph({
            text: report.reportTitle,
            heading: HeadingLevel.HEADING_1,
            spacing: { after: 120 },
          }),

          // Metadata block
          new Paragraph({
            children: [
              new TextRun({
                text: `Dataset: ${datasetTitle}  |  Generated: ${new Date(report.generatedAt).toLocaleString()}\n`,
                color: '64748B',
                size: 19,
              }),
              new TextRun({
                text: `Records Analyzed: ${report.datasetSummary.totalRows}  |  Columns: ${report.datasetSummary.totalColumns}  |  Data Health Score: ${report.datasetSummary.healthScore}%  |  Domain: ${report.datasetSummary.domain}\n`,
                bold: true,
                color: '0F172A',
                size: 20,
              }),
            ],
            spacing: { after: 280 },
          }),

          // Section 1: Executive Summary
          new Paragraph({
            text: '1. Executive Summary',
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 240, after: 120 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: report.executiveSummary,
                size: 21,
                font: 'Calibri',
              }),
            ],
            spacing: { after: 240 },
          }),

          // Section 2: Strategic Insights
          new Paragraph({
            text: '2. Strategic Insights & Observed Patterns',
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 240, after: 120 },
          }),
          ...report.strategicInsights.flatMap((ins, i) => [
            new Paragraph({
              children: [
                new TextRun({
                  text: `${i + 1}. ${ins.title} [${ins.impact.toUpperCase()} IMPACT]`,
                  bold: true,
                  size: 21,
                  color: '0F766E',
                }),
              ],
              spacing: { before: 100, after: 60 },
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: ins.description,
                  size: 20,
                }),
              ],
              spacing: { after: 140 },
            }),
          ]),

          // Section 3: Descriptive Statistics & Data Tables
          new Paragraph({
            text: '3. Statistical Profile & Data Tables',
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 240, after: 120 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: report.statisticalNarrative,
                size: 20,
              }),
            ],
            spacing: { after: 180 },
          }),

          // Insert Table
          statsTable,

          // Section 4: Attribute Deep Dives
          new Paragraph({
            text: '4. Variable Deep Dives',
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 320, after: 120 },
          }),
          deepDivesTable,

          // Section 5: Risk Factors & Anomalies
          new Paragraph({
            text: '5. Risk Factors & Data Anomalies',
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 320, after: 120 },
          }),
          ...report.riskAndAnomalies.flatMap((risk, idx) => [
            new Paragraph({
              children: [
                new TextRun({
                  text: `Risk #${idx + 1}: ${risk.issue} (Severity: ${risk.severity.toUpperCase()})`,
                  bold: true,
                  color: 'B45309',
                  size: 21,
                }),
              ],
              spacing: { before: 100, after: 60 },
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: `Affected Columns: ${risk.affectedColumns.join(', ') || 'Dataset'}\nRecommendation: ${risk.recommendation}`,
                  size: 20,
                }),
              ],
              spacing: { after: 140 },
            }),
          ]),

          // Section 6: Actionable Strategic Recommendations
          new Paragraph({
            text: '6. Prioritized Strategic & Operational Recommendations',
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 320, after: 120 },
          }),
          recsTable,

          // Section 7: Conclusion
          new Paragraph({
            text: '7. Strategic Conclusion & Roadmap',
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 320, after: 120 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: report.conclusion,
                size: 21,
              }),
            ],
            spacing: { after: 200 },
          }),
        ],
      },
    ],
  });

  // Pack and trigger download
  const blob = await Packer.toBlob(doc);
  const cleanFilename = `${(datasetTitle || 'Analysis_Report').toLowerCase().replace(/[^a-z0-9_-]/g, '_')}_full_report.docx`;
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = cleanFilename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Capture report container element (including styled charts, visual bars, and tables)
 * and generate a multi-page PDF download.
 */
export async function downloadReportAsPdf(
  elementId: string,
  filename: string,
  onProgress?: (status: string) => void
) {
  const element = document.getElementById(elementId);
  if (!element) {
    throw new Error('Report container element not found');
  }

  if (onProgress) onProgress('Capturing report charts and tables...');

  // Scroll to top to ensure complete render
  window.scrollTo(0, 0);

  // Render element to high-res canvas with html2canvas-pro (native oklch support)
  const canvas = await html2canvas(element, {
    scale: 2, // High DPI for crisp text, charts, and tables
    useCORS: true,
    logging: false,
    backgroundColor: '#0f172a', // Dark theme background matching app styling
    scrollX: 0,
    scrollY: 0,
    windowWidth: element.scrollWidth || 1200,
    onclone: (_clonedDoc, clonedEl) => {
      // Ensure the cloned container is fully visible and not clipped by overflow
      clonedEl.style.overflow = 'visible';
      clonedEl.style.maxHeight = 'none';
      clonedEl.style.height = 'auto';
    },
  });

  if (onProgress) onProgress('Compiling multi-page PDF...');

  const imgData = canvas.toDataURL('image/png');
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4',
  });

  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = pdf.internal.pageSize.getHeight();

  const imgWidth = canvas.width;
  const imgHeight = canvas.height;

  const ratio = pdfWidth / imgWidth;
  const totalPdfHeight = imgHeight * ratio;

  let heightLeft = totalPdfHeight;
  let position = 0;

  // Add first page
  pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, totalPdfHeight, undefined, 'FAST');
  heightLeft -= pdfHeight;

  // Add subsequent pages if content exceeds 1 page
  while (heightLeft > 0) {
    position = heightLeft - totalPdfHeight;
    pdf.addPage();
    pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, totalPdfHeight, undefined, 'FAST');
    heightLeft -= pdfHeight;
  }

  const cleanFilename = `${(filename || 'Analysis_Report').toLowerCase().replace(/[^a-z0-9_-]/g, '_')}_full_report.pdf`;
  pdf.save(cleanFilename);
}
