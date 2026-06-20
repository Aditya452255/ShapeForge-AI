import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { 
  ArrowLeft, Play, Image, Search, 
  Sparkles, Download, AlertCircle, CheckCircle2 
} from 'lucide-react';
import { 
  getDocuments, 
  processDocument, 
  getDocumentPages, 
  detectShapes, 
  generateSVG, 
  getExportMetadataUrl 
} from '../api/documents';
import { getDocumentShapes } from '../api/shapes';
import { ShapeGrid } from '../components/ShapeGrid';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { API_BASE_URL } from '../api/client';

export const DocumentDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const docId = id || '';

  // Pipeline Action Processing States
  const [processingPages, setProcessingPages] = useState<boolean>(false);
  const [detectingShapes, setDetectingShapes] = useState<boolean>(false);
  const [generatingSVGs, setGeneratingSVGs] = useState<boolean>(false);

  // Notifications
  const [notify, setNotify] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Queries
  const { data: docData, isLoading: loadingDoc } = useQuery({
    queryKey: ['documentDetails', docId],
    queryFn: async () => {
      const docs = await getDocuments();
      const doc = docs.find((d) => d.id === docId);
      if (!doc) throw new Error('Document not found in workspace registry.');
      return doc;
    },
  });

  const { data: pagesData, isLoading: loadingPages, refetch: refetchPages } = useQuery({
    queryKey: ['documentPages', docId],
    queryFn: () => getDocumentPages(docId),
    enabled: !!docId,
  });

  const { data: shapesData, isLoading: loadingShapes, refetch: refetchShapes } = useQuery({
    queryKey: ['documentShapes', docId],
    queryFn: () => getDocumentShapes(docId),
    enabled: !!docId,
  });

  // Actions
  const handleProcessPages = async () => {
    setProcessingPages(true);
    setNotify(null);
    try {
      const resp = await processDocument(docId);
      setNotify({
        type: 'success',
        message: `Successfully processed ${resp.pages_processed} pages from PDF diagram.`,
      });
      await refetchPages();
    } catch (err) {
      setNotify({
        type: 'error',
        message: (err as { response?: { data?: { detail?: string } } }).response?.data?.detail || 'Page extraction failed.',
      });
    } finally {
      setProcessingPages(false);
    }
  };

  const handleDetectShapes = async () => {
    setDetectingShapes(true);
    setNotify(null);
    try {
      const resp = await detectShapes(docId);
      setNotify({
        type: 'success',
        message: `Shape detection completed! Found ${resp.shapes_detected} symbols.`,
      });
      await refetchShapes();
    } catch (err) {
      setNotify({
        type: 'error',
        message: (err as { response?: { data?: { detail?: string } } }).response?.data?.detail || 'Shape detection pipeline failed.',
      });
    } finally {
      setDetectingShapes(false);
    }
  };

  const handleGenerateSVGs = async () => {
    setGeneratingSVGs(true);
    setNotify(null);
    try {
      const resp = await generateSVG(docId);
      setNotify({
        type: 'success',
        message: `Vector tracing completed! Generated ${resp.svg_generated} editable SVGs.`,
      });
      await refetchShapes();
    } catch (err) {
      setNotify({
        type: 'error',
        message: (err as { response?: { data?: { detail?: string } } }).response?.data?.detail || 'SVG vector tracing failed.',
      });
    } finally {
      setGeneratingSVGs(false);
    }
  };

  const hasPages = pagesData && pagesData.length > 0;
  const hasShapes = shapesData && shapesData.length > 0;
  const svgCount = shapesData ? shapesData.filter((s) => s.svg_path !== null).length : 0;

  // Render a visual step-by-step pipeline status tracker
  const getPipelineStatus = () => {
    if (!hasPages) return { step: 1, label: 'Page Extraction Required' };
    if (!hasShapes) return { step: 2, label: 'Shape Detection Required' };
    if (svgCount === 0) return { step: 3, label: 'Vector Generation Required' };
    return { step: 4, label: 'Vectorization Complete' };
  };

  const pipeline = getPipelineStatus();

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <Link
            to="/"
            className="inline-flex items-center gap-1 text-xs font-semibold text-gray-500 hover:text-indigo-600 transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Dashboard
          </Link>
          <h1 className="text-2xl font-bold text-gray-800 tracking-tight truncate max-w-xl">
            {loadingDoc ? 'Loading diagram...' : docData?.filename}
          </h1>
        </div>

        {/* Metadata JSON Export */}
        {hasShapes && (
          <a
            href={getExportMetadataUrl(docId)}
            download
            className="inline-flex items-center justify-center gap-2 bg-indigo-650 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl shadow-sm transition"
          >
            <Download className="w-4 h-4" />
            Export Shape Metadata
          </a>
        )}
      </div>

      {/* Notifications */}
      {notify && (
        <div className={`p-4 rounded-xl flex items-start gap-3 border ${
          notify.type === 'success' 
            ? 'bg-emerald-50 border-emerald-100 text-emerald-800' 
            : 'bg-rose-50 border-rose-100 text-rose-800'
        }`}>
          {notify.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 shrink-0 text-rose-600 mt-0.5" />
          )}
          <span className="text-sm font-medium">{notify.message}</span>
        </div>
      )}

      {/* Grid: Stats Summary + Pipeline Stepper */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Document Stats Card */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
              Document Workspace
            </h3>
            
            <div className="space-y-4">
              <div className="flex justify-between text-sm py-1 border-b border-gray-100">
                <span className="text-gray-500 font-medium">Document ID</span>
                <span className="font-mono text-xs text-gray-400 select-all">{docId}</span>
              </div>
              <div className="flex justify-between text-sm py-1 border-b border-gray-100">
                <span className="text-gray-500 font-medium">Pages Extracted</span>
                <span className="font-bold text-gray-800">{loadingPages ? '...' : pagesData?.length || 0}</span>
              </div>
              <div className="flex justify-between text-sm py-1 border-b border-gray-100">
                <span className="text-gray-500 font-medium">Detected Symbols</span>
                <span className="font-bold text-gray-800">{loadingShapes ? '...' : shapesData?.length || 0}</span>
              </div>
              <div className="flex justify-between text-sm py-1">
                <span className="text-gray-500 font-medium">Generated SVGs</span>
                <span className="font-bold text-gray-800">{loadingShapes ? '...' : svgCount}</span>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-gray-100">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Workspace State
            </span>
            <div className="mt-1.5 flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${
                pipeline.step === 4 
                  ? 'bg-emerald-500 animate-pulse' 
                  : pipeline.step > 1 
                    ? 'bg-amber-500' 
                    : 'bg-indigo-500'
              }`} />
              <span className="text-sm font-semibold text-gray-700">{pipeline.label}</span>
            </div>
          </div>
        </div>

        {/* Pipeline Stepper Controls */}
        <div className="lg:col-span-2 bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-6">
          <h3 className="text-base font-semibold text-gray-800">
            Extraction & Classification Pipeline
          </h3>

          <div className="space-y-4">
            {/* Step 1: Process Pages */}
            <div className={`p-4 rounded-xl border flex items-center justify-between gap-4 transition ${
              hasPages 
                ? 'bg-emerald-50/30 border-emerald-100' 
                : 'bg-gray-50/50 border-gray-150'
            }`}>
              <div className="flex items-start gap-3">
                <div className={`p-2.5 rounded-lg shrink-0 ${
                  hasPages ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'
                }`}>
                  <Image className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-gray-800">1. Extract Pages</h4>
                  <p className="text-xs text-gray-500">Converts diagram sheets into high-resolution PNG page images.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleProcessPages}
                disabled={processingPages || detectingShapes || generatingSVGs}
                className={`inline-flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-xl transition shadow-xs shrink-0 ${
                  hasPages 
                    ? 'bg-white border border-emerald-250 text-emerald-700 hover:bg-emerald-50' 
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                }`}
              >
                {processingPages ? (
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <Play className="w-3.5 h-3.5" />
                )}
                {processingPages ? 'Running...' : hasPages ? 'Re-extract Pages' : 'Extract PDF'}
              </button>
            </div>

            {/* Step 2: Detect Shapes */}
            <div className={`p-4 rounded-xl border flex items-center justify-between gap-4 transition ${
              hasShapes 
                ? 'bg-emerald-50/30 border-emerald-100' 
                : 'bg-gray-50/50 border-gray-150'
            }`}>
              <div className="flex items-start gap-3">
                <div className={`p-2.5 rounded-lg shrink-0 ${
                  hasShapes ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'
                }`}>
                  <Search className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-gray-800">2. Detect & Classify Shapes</h4>
                  <p className="text-xs text-gray-500">Run OpenCV contour algorithms and identify pumps, valves, and devices.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleDetectShapes}
                disabled={!hasPages || processingPages || detectingShapes || generatingSVGs}
                className={`inline-flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-xl transition shadow-xs shrink-0 ${
                  !hasPages 
                    ? 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed' 
                    : hasShapes 
                      ? 'bg-white border border-emerald-250 text-emerald-700 hover:bg-emerald-50' 
                      : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                }`}
              >
                {detectingShapes ? (
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <Play className="w-3.5 h-3.5" />
                )}
                {detectingShapes ? 'Detecting...' : hasShapes ? 'Run Detection Again' : 'Detect Shapes'}
              </button>
            </div>

            {/* Step 3: Generate SVGs */}
            <div className={`p-4 rounded-xl border flex items-center justify-between gap-4 transition ${
              svgCount > 0 && svgCount === shapesData?.length 
                ? 'bg-emerald-50/30 border-emerald-100' 
                : 'bg-gray-50/50 border-gray-150'
            }`}>
              <div className="flex items-start gap-3">
                <div className={`p-2.5 rounded-lg shrink-0 ${
                  svgCount > 0 && svgCount === shapesData?.length 
                    ? 'bg-emerald-100 text-emerald-700' 
                    : 'bg-gray-100 text-gray-500'
                }`}>
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-gray-800">3. Generate Editable SVGs</h4>
                  <p className="text-xs text-gray-500">Trace cropped shapes contours into responsive and scalable SVG objects.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleGenerateSVGs}
                disabled={!hasShapes || processingPages || detectingShapes || generatingSVGs}
                className={`inline-flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-xl transition shadow-xs shrink-0 ${
                  !hasShapes 
                    ? 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed' 
                    : svgCount > 0 
                      ? 'bg-white border border-emerald-250 text-emerald-700 hover:bg-emerald-50' 
                      : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                }`}
              >
                {generatingSVGs ? (
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <Play className="w-3.5 h-3.5" />
                )}
                {generatingSVGs ? 'Tracing...' : svgCount > 0 ? 'Re-generate SVGs' : 'Generate SVGs'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Pages Section */}
      {hasPages && (
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-4">
          <h3 className="text-base font-semibold text-gray-800 flex items-center gap-2">
            <Image className="w-5 h-5 text-indigo-600" />
            Extracted Sheets Preview
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {pagesData.map((page) => (
              <div key={page.id} className="border border-gray-150 rounded-xl overflow-hidden bg-slate-50 flex flex-col group">
                <div className="aspect-[4/3] flex items-center justify-center p-3">
                  <img
                    src={`${API_BASE_URL}/${page.image_path}`}
                    alt={`Page sheet ${page.page_number}`}
                    className="max-h-full max-w-full object-contain rounded shadow-xs transition group-hover:scale-102"
                  />
                </div>
                <div className="bg-white border-t border-gray-100 px-3 py-2 flex items-center justify-between text-xs text-gray-500">
                  <span className="font-semibold">Sheet {page.page_number}</span>
                  <span className="text-gray-400 font-medium">{page.width} x {page.height}px</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Shapes Section */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
          <Search className="w-5 h-5 text-indigo-600" />
          Detected Symbol Elements
        </h2>

        {loadingShapes ? (
          <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center shadow-sm">
            <LoadingSpinner label="Loading symbol classifications..." />
          </div>
        ) : shapesData && shapesData.length > 0 ? (
          <ShapeGrid shapes={shapesData} />
        ) : (
          <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center shadow-sm">
            <p className="text-sm text-gray-500 font-medium mb-1">No shapes detected yet.</p>
            <p className="text-xs text-gray-400">
              Run step "2. Detect & Classify Shapes" above to parse contour structures from the diagram.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
