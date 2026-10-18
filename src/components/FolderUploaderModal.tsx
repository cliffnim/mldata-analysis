import React, { useRef, useState } from 'react';
import {
  X,
  Upload,
  FolderUp,
  FileUp,
  Sparkles,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Folder,
  Layers,
} from 'lucide-react';
import { FolderFile, UrlFetchRequest, UrlFetchResponse } from '../types';
import { readFileAsync, getFilesFromEntry } from '../utils/fileReader';
import { SAMPLE_FOLDERS } from '../data/sampleFolders';

interface FolderUploaderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFilesLoaded: (folderName: string, files: FolderFile[]) => void;
  onSelectPreset?: (presetId: string) => void;
}

export const FolderUploaderModal: React.FC<FolderUploaderModalProps> = ({
  isOpen,
  onClose,
  onFilesLoaded,
  onSelectPreset,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [url, setUrl] = useState('');
  const [isFetchingUrl, setIsFetchingUrl] = useState(false);
  const [fetchedPage, setFetchedPage] = useState<UrlFetchResponse | null>(null);
  const [showPresets, setShowPresets] = useState(false);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const filesInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    setError(null);
    setLoading(true);

    try {
      const items = e.dataTransfer.items;
      const fileListWithPaths: { file: File; path: string }[] = [];

      if (items && items.length > 0) {
        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          const entry = (item as any).webkitGetAsEntry ? (item as any).webkitGetAsEntry() : null;
          if (entry) {
            const extracted = await getFilesFromEntry(entry);
            fileListWithPaths.push(...extracted);
          } else {
            const f = item.getAsFile();
            if (f) fileListWithPaths.push({ file: f, path: f.name });
          }
        }
      } else if (e.dataTransfer.files) {
        for (let i = 0; i < e.dataTransfer.files.length; i++) {
          const f = e.dataTransfer.files[i];
          fileListWithPaths.push({ file: f, path: f.name });
        }
      }

      if (fileListWithPaths.length === 0) {
        setError('No supported files found in dropped items.');
        setLoading(false);
        return;
      }

      const parsedFiles = await Promise.all(
        fileListWithPaths.map((item) => readFileAsync(item.file, item.path))
      );

      const samplePath = fileListWithPaths[0]?.path || '';
      const topFolder = samplePath.includes('/') ? samplePath.split('/')[0] : 'Uploaded Workbooks';

      onFilesLoaded(topFolder, parsedFiles);
      onClose();
    } catch (err: any) {
      console.error(err);
      setError('Failed to process dropped folder: ' + (err.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const handleFetchUrl = async () => {
    const trimmed = url.trim();
    if (!trimmed) {
      setError('Enter a public web-page URL.');
      setFetchedPage(null);
      return;
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(trimmed);
    } catch {
      setError('Enter a valid URL starting with http:// or https://.');
      setFetchedPage(null);
      return;
    }
    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
      setError('Only public HTTP and HTTPS web pages are supported.');
      setFetchedPage(null);
      return;
    }

    setError(null);
    setFetchedPage(null);
    setIsFetchingUrl(true);
    try {
      const request: UrlFetchRequest = { url: trimmed };
      const res = await fetch('/api/fetch-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      });
      const data = await res.json().catch(() => ({})) as Partial<UrlFetchResponse> & { error?: string };
      if (!res.ok) {
        const message = data.error || (res.status === 413
          ? 'The page response is larger than the 2 MB limit.'
          : res.status === 504
            ? 'The page request timed out. Try again later.'
            : res.status >= 500
              ? 'The page could not be fetched because the website returned an error.'
              : 'The URL was rejected. Check that it is a public HTTP or HTTPS page.');
        throw new Error(message);
      }
      if (typeof data.url !== 'string' || typeof data.text !== 'string') {
        throw new Error('The server returned an invalid page response.');
      }
      setFetchedPage({
        url: data.url,
        contentType: typeof data.contentType === 'string' ? data.contentType : '',
        text: data.text.trim(),
        truncated: data.truncated === true,
      });
    } catch (err: unknown) {
      console.warn('URL extraction failed:', err);
      setError(err instanceof Error ? err.message : 'The page could not be fetched.');
    } finally {
      setIsFetchingUrl(false);
    }
  };

  const handleUseFetchedPage = () => {
    if (!fetchedPage) return;
    const text = fetchedPage.text;
    let hostname = fetchedPage.url;
    try {
      hostname = new URL(fetchedPage.url).hostname;
    } catch {
      // The endpoint supplies the final validated URL; keep it as the display name if parsing fails.
    }
      const file: FolderFile = {
        id: 'file_' + Math.random().toString(36).substring(2, 9),
        name: hostname || fetchedPage.url,
        relativePath: fetchedPage.url,
        size: text.length,
        mimeType: 'text/html',
        fileCategory: 'document',
        content: text,
        status: 'idle',
      };
      onFilesLoaded('Web Page', [file]);
      setUrl('');
      setFetchedPage(null);
      onClose();
  };

  const handleDirectoryChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawFiles = e.target.files;
    if (!rawFiles || rawFiles.length === 0) return;
    setLoading(true);
    setError(null);

    try {
      const fileArray = Array.from(rawFiles).filter((f) => !f.name.startsWith('.') && f.name !== 'Thumbs.db');
      const parsedFiles = await Promise.all(
        fileArray.map((file) => readFileAsync(file, (file as any).webkitRelativePath || file.name))
      );

      const firstRelative = (fileArray[0] as any)?.webkitRelativePath || '';
      const folderName = firstRelative.includes('/') ? firstRelative.split('/')[0] : 'Uploaded Folder';

      onFilesLoaded(folderName, parsedFiles);
      onClose();
    } catch (err: any) {
      setError('Failed to read folder: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFilesChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawFiles = e.target.files;
    if (!rawFiles || rawFiles.length === 0) return;
    setLoading(true);
    setError(null);

    try {
      const fileArray = Array.from(rawFiles);
      const parsedFiles = await Promise.all(fileArray.map((file) => readFileAsync(file, file.name)));
      onFilesLoaded('Selected Workbooks', parsedFiles);
      onClose();
    } catch (err: any) {
      setError('Failed to read files: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
              <FolderUp className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">Upload Your Folder / Excel Workbooks</h2>
              <p className="text-xs text-slate-400">Select a directory to combine workbooks and extract structured data</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {error && (
            <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-800 text-rose-300 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form
            onSubmit={(event) => {
              event.preventDefault();
              if (!isFetchingUrl) void handleFetchUrl();
            }}
            className="space-y-3"
          >
            <label htmlFor="web-page-url" className="block text-xs font-semibold text-slate-200">
              Import a public web page
            </label>
            <div className="flex gap-2">
              <input
                id="web-page-url"
                type="url"
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value);
                  setError(null);
                  setFetchedPage(null);
                }}
                placeholder="https://example.com/page"
                className="flex-1 rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-gray-100"
                disabled={isFetchingUrl}
                aria-describedby="web-page-url-help"
              />
              <button
                type="submit"
                disabled={isFetchingUrl || !url.trim()}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white disabled:opacity-50"
              >
                {isFetchingUrl ? 'Fetching...' : 'Fetch URL'}
              </button>
            </div>
            <p id="web-page-url-help" className="text-[11px] text-slate-400">
              Only public HTTP and HTTPS pages are fetched. Private network addresses are blocked.
            </p>
            {isFetchingUrl && (
              <p role="status" className="text-xs text-teal-300">Fetching the page and extracting readable text...</p>
            )}
            {error && (
              <div role="alert" className="rounded-lg border border-rose-800 bg-rose-950/40 px-3 py-2 text-xs text-rose-200">
                {error}
              </div>
            )}
            {fetchedPage && (
              <div role="status" className="space-y-2 rounded-lg border border-emerald-800 bg-emerald-950/30 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-xs font-semibold text-emerald-200">Page text extracted</p>
                    <p className="text-[11px] text-slate-400">{fetchedPage.url}{fetchedPage.contentType ? ` • ${fetchedPage.contentType}` : ''}</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleUseFetchedPage}
                    className="rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-600"
                  >
                    Continue to analysis
                  </button>
                </div>
                {!fetchedPage.text && (
                  <p className="text-xs text-amber-200">The page returned little or no extractable text. Analysis may not be able to infer a useful dataset.</p>
                )}
                {fetchedPage.truncated && (
                  <p className="text-[11px] text-amber-200">The extracted preview is truncated to the first 200,000 characters.</p>
                )}
                <pre className="max-h-40 overflow-auto whitespace-pre-wrap break-words rounded bg-slate-950/70 p-2 text-[11px] leading-relaxed text-slate-300">
                  {fetchedPage.text || 'No extractable text found on this page.'}
                </pre>
              </div>
            )}
          </form>

          {/* Drag & Drop Zone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${
              isDragging
                ? 'border-teal-400 bg-teal-500/10 scale-[1.01]'
                : 'border-slate-700 hover:border-slate-600 bg-slate-800/40'
            }`}
          >
            <div className="w-14 h-14 mx-auto rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-teal-400 mb-3 shadow-inner">
              <Upload className="w-6 h-6" />
            </div>

            <h3 className="text-sm font-medium text-white mb-1">
              Drag & Drop your Folder or Excel Files here
            </h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto mb-5 leading-relaxed">
              Supports Excel/CSV, PDF, DOCX, text files, and photos (JPG, PNG, WEBP, HEIC). Multi-sheet workbooks are combined.
            </p>
            <p className="mb-4 text-[11px] leading-relaxed text-slate-500">
              Selectable PDF and DOCX text is extracted in your browser. Scanned pages and photos use the configured AI vision provider; local OCR is not installed, and small or rotated text may be missed.
            </p>

            {loading ? (
              <div className="flex items-center justify-center space-x-2 text-teal-400 text-xs py-2">
                <div className="w-4 h-4 border-2 border-teal-400 border-t-transparent rounded-full animate-spin" />
                <span>Reading directory files and parsing sheets...</span>
              </div>
            ) : (
              <div className="flex flex-wrap items-center justify-center gap-3">
                {/* Hidden Inputs */}
                <input
                  type="file"
                  ref={folderInputRef}
                  onChange={handleDirectoryChange}
                  // @ts-ignore
                  webkitdirectory=""
                  directory=""
                  multiple
                  className="hidden"
                />
                <input
                  type="file"
                  ref={filesInputRef}
                  onChange={handleFilesChange}
                  multiple
                  accept=".xlsx,.xls,.xlsm,.xlsb,.csv,.tsv,.txt,.json,.md,.pdf,.docx,.png,.jpg,.jpeg,.webp,.heic,.heif"
                  className="hidden"
                />

                <button
                  type="button"
                  onClick={() => folderInputRef.current?.click()}
                  className="px-5 py-2.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold flex items-center space-x-2 shadow-sm transition-colors"
                >
                  <FolderUp className="w-4 h-4" />
                  <span>Upload Entire Folder</span>
                </button>

                <button
                  type="button"
                  onClick={() => filesInputRef.current?.click()}
                  className="px-5 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center space-x-2 transition-colors"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                  <span>Choose Workbooks / Files</span>
                </button>
              </div>
            )}
          </div>

          {/* Capabilities Highlights */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-800 text-left">
              <span className="text-teal-400 text-xs font-semibold flex items-center space-x-1 mb-1">
                <Layers className="w-3.5 h-3.5" />
                <span>Combine Workbooks</span>
              </span>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Consolidates multi-sheet Excel files into one master dataset with origin tracking.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-800 text-left">
              <span className="text-indigo-400 text-xs font-semibold flex items-center space-x-1 mb-1">
                <Sparkles className="w-3.5 h-3.5" />
                <span>AI Data Interpreter</span>
              </span>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Interprets trends, sums, averages, and answers custom questions on your combined data.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-800 text-left">
              <span className="text-emerald-400 text-xs font-semibold flex items-center space-x-1 mb-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Export Any Time</span>
              </span>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Download consolidated result as Excel (.xlsx), CSV, or 1-click copy for Google Sheets.
              </p>
            </div>
          </div>

          {/* Optional Sample Datasets Accordion for reference */}
          {onSelectPreset && (
            <div className="pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowPresets(!showPresets)}
                className="text-[11px] text-slate-400 hover:text-slate-300 flex items-center space-x-1 transition-colors"
              >
                <span>{showPresets ? 'Hide sample datasets' : 'Need an example? View optional sample folders'}</span>
              </button>

              {showPresets && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
                  {SAMPLE_FOLDERS.slice(0, 2).map((preset) => (
                    <button
                      key={preset.id}
                      onClick={() => {
                        onSelectPreset(preset.id);
                        onClose();
                      }}
                      className="p-2.5 rounded-lg bg-slate-800/60 hover:bg-slate-800 border border-slate-700 text-left transition-colors"
                    >
                      <span className="text-xs font-medium text-slate-200 block truncate">{preset.name}</span>
                      <span className="text-[10px] text-slate-400 block truncate">{preset.description}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-950/60 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center space-x-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Folder hierarchy and all sheet names are preserved</span>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
