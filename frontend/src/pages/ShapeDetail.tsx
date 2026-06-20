import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Box, CheckCircle, HelpCircle, ImageIcon, Activity } from 'lucide-react';
import { getShapeDetails } from '../api/shapes';
import { SVGViewer } from '../components/SVGViewer';
import { PropertyEditor } from '../components/PropertyEditor';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { API_BASE_URL } from '../api/client';

export const ShapeDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const shapeId = id || '';
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'vector' | 'raster'>('vector');

  // Query details for this specific shape
  const { data: shape, isLoading, error } = useQuery({
    queryKey: ['shapeDetails', shapeId],
    queryFn: () => getShapeDetails(shapeId),
    enabled: !!shapeId,
  });

  const handleUpdate = () => {
    // Invalidate queries so components fetch updated details
    queryClient.invalidateQueries({ queryKey: ['shapeDetails', shapeId] });
    queryClient.invalidateQueries({ queryKey: ['documentShapes'] });
  };

  if (isLoading) {
    return (
      <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center shadow-sm animate-pulse min-h-[450px] flex items-center justify-center">
        <LoadingSpinner label="Loading symbol attributes & vectors..." />
      </div>
    );
  }

  if (error || !shape) {
    return (
      <div className="bg-white border border-gray-205 rounded-2xl p-12 text-center shadow-sm max-w-lg mx-auto space-y-4">
        <div className="mx-auto w-12 h-12 bg-rose-50 flex items-center justify-center rounded-xl text-rose-500">
          <HelpCircle className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-gray-900">Symbol details not found</h3>
          <p className="text-xs text-gray-500 mt-1">
            We couldn't retrieve metadata for the requested symbol ID. It may have been deleted or the document was re-processed.
          </p>
        </div>
        <Link
          to="/"
          className="inline-flex items-center justify-center gap-1.5 bg-indigo-600 hover:bg-indigo-750 text-white text-xs font-semibold py-2 px-4 rounded-xl transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Link>
      </div>
    );
  }

  const confidencePercent = Math.round(shape.confidence * 100);
  const docUrl = shape.document_id ? `/documents/${shape.document_id}` : '/';

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Navigation header */}
      <div className="space-y-1">
        <Link
          to={docUrl}
          className="inline-flex items-center gap-1 text-xs font-semibold text-gray-500 hover:text-indigo-600 transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Document Workspace
        </Link>
        <h1 className="text-2xl font-bold text-gray-800 tracking-tight">
          Symbol #{shape.shape_number} Details
        </h1>
      </div>

      {/* Main Workspace Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left column: Visual elements (inline SVG vs raster comparison) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4">
            {/* View Mode Tabs */}
            <div className="flex items-center border-b border-gray-100 pb-3 mb-4 justify-between">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Visual Inspection
              </span>
              <div className="flex bg-gray-100 p-0.5 rounded-xl">
                <button
                  type="button"
                  onClick={() => setActiveTab('vector')}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-all ${
                    activeTab === 'vector'
                      ? 'bg-white text-gray-800 shadow-xs'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Vector (SVG)
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('raster')}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-all ${
                    activeTab === 'raster'
                      ? 'bg-white text-gray-800 shadow-xs'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Original Crop (PNG)
                </button>
              </div>
            </div>

            {/* Tab Contents */}
            {activeTab === 'vector' ? (
              <SVGViewer
                svgPath={shape.svg_path}
                shapeName={`Symbol #${shape.shape_number}`}
              />
            ) : (
              <div className="bg-slate-50 border border-gray-200 rounded-2xl h-96 flex items-center justify-center p-8 relative overflow-hidden group">
                <img
                  src={`${API_BASE_URL}/${shape.image_path}`}
                  alt={`Original crop ${shape.shape_number}`}
                  className="max-h-full max-w-full object-contain rounded shadow-xs select-none transition-transform duration-300 group-hover:scale-105"
                />
                <div className="absolute bottom-3 right-3 bg-gray-900/60 text-white text-[10px] px-2.5 py-1 rounded-full backdrop-blur-sm pointer-events-none flex items-center gap-1">
                  <ImageIcon className="w-3.5 h-3.5" />
                  Original OpenCV Crop (Raster PNG)
                </div>
              </div>
            )}
          </div>

          {/* Bounding Box Information */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Box className="w-4 h-4 text-indigo-600" />
              OpenCV Bounding Box Coordinates
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
              <div className="bg-slate-50 rounded-xl p-3 border border-gray-100">
                <span className="text-[10px] font-mono text-gray-400 uppercase block mb-1">X-Origin</span>
                <span className="font-mono text-base font-bold text-gray-700">{shape.bbox.x} px</span>
              </div>
              <div className="bg-slate-50 rounded-xl p-3 border border-gray-100">
                <span className="text-[10px] font-mono text-gray-400 uppercase block mb-1">Y-Origin</span>
                <span className="font-mono text-base font-bold text-gray-700">{shape.bbox.y} px</span>
              </div>
              <div className="bg-slate-50 rounded-xl p-3 border border-gray-100">
                <span className="text-[10px] font-mono text-gray-400 uppercase block mb-1">Width</span>
                <span className="font-mono text-base font-bold text-gray-700">{shape.bbox.width} px</span>
              </div>
              <div className="bg-slate-50 rounded-xl p-3 border border-gray-100">
                <span className="text-[10px] font-mono text-gray-400 uppercase block mb-1">Height</span>
                <span className="font-mono text-base font-bold text-gray-700">{shape.bbox.height} px</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right column: Properties and metadata form */}
        <div className="lg:col-span-5 space-y-6">
          {/* Classification Stats */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-2">
              <Activity className="w-4 h-4 text-indigo-600" />
              AI Model Classification
            </h3>

            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-sm text-gray-500">Predicted Type</span>
              <span className="bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs px-3 py-1 rounded-full font-bold uppercase tracking-wide">
                {shape.shape_type}
              </span>
            </div>

            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-sm text-gray-500">Confidence Score</span>
              <span className={`text-sm font-bold ${
                confidencePercent > 80 
                  ? 'text-emerald-600' 
                  : confidencePercent > 50 
                    ? 'text-amber-600' 
                    : 'text-rose-600'
              }`}>
                {confidencePercent}%
              </span>
            </div>

            <div className="flex justify-between items-center py-2">
              <span className="text-sm text-gray-500">Vector Status</span>
              {shape.svg_path ? (
                <span className="inline-flex items-center text-xs font-semibold text-emerald-600 gap-1">
                  <CheckCircle className="w-3.5 h-3.5" />
                  Vectorized
                </span>
              ) : (
                <span className="inline-flex items-center text-xs font-semibold text-gray-400 gap-1">
                  Raster Only
                </span>
              )}
            </div>
          </div>

          {/* Property Editor */}
          <PropertyEditor shape={shape} onUpdate={handleUpdate} />
        </div>
      </div>
    </div>
  );
};
