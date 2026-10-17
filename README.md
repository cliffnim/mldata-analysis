# ML Data Analysis & FolderML Workbook Consolidator

A modern, machine-learning powered web application that consolidates, cleans, interprets, and analyzes Excel workbooks and supported business documents into structured datasets, complete with statistical analytics and downloadable **PDF** and **DOCX** reports.

Live Demo on GitHub Pages: **[https://cliffnim.github.io/mldata-analysis/](https://cliffnim.github.io/mldata-analysis/)**

---

## 🌟 Key Features

- 📁 **Universal Excel Ingestion**: Upload single workbooks or entire folders containing multiple `.xlsx`, `.xls`, and `.csv` files.
- 🔗 **Automatic Multi-Workbook Consolidation**: Flattens and unifies disparate sheets into a harmonized master spreadsheet with automatic schema inference.
- 📄 **Document Ingestion**: Extract structured fields from PDF files, DOCX documents, and JPG, PNG, WEBP, HEIC, or HEIF photos. DOCX and selectable PDF text are parsed in the browser; scanned PDF pages and photos use OpenAI-compatible vision models. Document extraction produces one record per file.
- 🧹 **Automated Data Cleaner**:
  - Detects duplicate records, stray whitespaces, and missing values.
  - IQR-based statistical outlier identification.
  - 1-Click Master Auto-Clean with full undo/history log.
- 📊 **Statistical Analysis & Visualizations**:
  - Distribution histograms, quartile ranges, and numerical KPI cards.
  - Correlation matrices and categorical breakdowns.
- 🧠 **Data Interpretation & Natural Language Q&A**:
  - Executive overview, key quantitative discoveries, cross-sheet comparisons, and actionable recommendations.
  - Ask ad-hoc business questions directly against your uploaded data.
- 📑 **Comprehensive Full Analysis Report**:
  - Executive summary, strategic insights, column deep dives, risk audits, and conclusion.
  - 📥 **Download as PDF**: High-resolution multi-page PDF generation with native OKLCH Tailwind v4 support and 1-click Print-to-PDF fallback.
  - 📥 **Download as DOCX**: Microsoft Word formatted document including KPI metric tables, statistical summaries, and audit logs.

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or higher recommended)
- npm or bun

### Local Development

1. **Clone the repository:**
   ```bash
   git clone https://github.com/cliffnim/mldata-analysis.git
   cd mldata-analysis
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure an AI provider:**
   ```bash
   cp .env.example .env
   # Add a Kilo Gateway key to KILO_API_KEY
   ```
   Kilo Gateway is the default provider. For OpenAI directly, set `AI_PROVIDER=openai`, `OPENAI_API_KEY`, and `AI_MODEL=gpt-5.4-mini`. For another OpenAI-compatible provider, set `AI_BASE_URL`, `AI_API_KEY`, and `AI_MODEL`. Spreadsheet parsing and basic statistics run locally; AI schema detection, extraction, interpretation, and reports require provider credentials.

4. **Start the local server:**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🌐 GitHub Pages Deployment

This repository includes a preconfigured GitHub Actions workflow in `.github/workflows/deploy.yml` that automatically builds and deploys the app to GitHub Pages on every push to `main`.

### Enabling GitHub Pages in Your Repo:
1. Go to your repository on GitHub: `https://github.com/cliffnim/mldata-analysis`
2. Click **Settings** → **Pages** (in the left sidebar).
3. Under **Build and deployment** → **Source**, select **GitHub Actions**.
4. Push a commit to the `main` branch:
   ```bash
   git push -u origin main
   ```
5. GitHub will automatically run the build and publish your app to:
   **`https://cliffnim.github.io/mldata-analysis/`**

---

## 🛠️ Tech Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS v4, Lucide Icons, Motion
- **Data Processing**: SheetJS (`xlsx`) for client-side workbook consolidation; Mammoth for browser-side DOCX text extraction
- **Document Export**: `docx` for Word documents, `jspdf` & `html2canvas-pro` for PDF rendering
- **Backend**: Express (Node.js) with the OpenAI SDK and Kilo Gateway by default
- **Offline / Static Engine**: Built-in client statistical engine for zero-server GitHub Pages execution

---

## 📄 License
MIT License. Free to use, adapt, and distribute.
# mldata-analysis
