import React, { useState, useRef, useEffect } from 'react';
import { ZoomIn, ZoomOut, RotateCcw, Maximize, Minimize, Move } from 'lucide-react';
import { API_BASE_URL } from '../api/client';

interface SVGViewerProps {
  svgPath: string | null;
  shapeName: string;
}

export const SVGViewer: React.FC<SVGViewerProps> = ({ svgPath, shapeName }) => {
  const [scale, setScale] = useState<number>(1);
  const [position, setPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isFullWidth, setIsFullWidth] = useState<boolean>(false);
  const [svgContent, setSvgContent] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement>(null);

  const resetViewer = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  // Fetch the SVG string to render it directly inline. This allows smooth color rendering and inspectability.
  useEffect(() => {
    if (!svgPath) return;

    const fetchSvg = async () => {
      setLoading(true);
      try {
        const url = `${API_BASE_URL}/${svgPath}`;
        const response = await fetch(url);
        if (response.ok) {
          const text = await response.text();
          setSvgContent(text);
        } else {
          setSvgContent(null);
        }
      } catch (err) {
        console.error('Failed to load SVG content:', err);
        setSvgContent(null);
      } finally {
        setLoading(false);
      }
    };

    fetchSvg();
  }, [svgPath]);

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = 0.1;
    const newScale = e.deltaY < 0 ? scale + zoomFactor : scale - zoomFactor;
    // Bound zoom level between 0.3x and 8x
    setScale(Math.max(0.3, Math.min(8, newScale)));
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const zoomIn = () => setScale((prev) => Math.min(8, prev + 0.25));
  const zoomOut = () => setScale((prev) => Math.max(0.3, prev - 0.25));
  


  const toggleFullWidth = () => {
    setIsFullWidth((prev) => !prev);
    resetViewer();
  };

  if (!svgPath) {
    return (
      <div className="flex flex-col items-center justify-center bg-gray-50 border border-gray-200 border-dashed rounded-2xl p-12 text-center h-96">
        <p className="text-sm text-gray-500 font-medium mb-2">No vector representation generated yet.</p>
        <p className="text-xs text-gray-400 max-w-xs">
          Please run "Generate SVG" on the document detail workspace page to trace this shape contour into editable vectors.
        </p>
      </div>
    );
  }

  return (
    <div className={`bg-slate-50 border border-gray-200 rounded-2xl overflow-hidden flex flex-col relative transition-all duration-300 ${
      isFullWidth ? 'h-[600px] shadow-lg' : 'h-96'
    }`}>
      {/* Title / Toolbar */}
      <div className="bg-white border-b border-gray-150 px-4 py-3 flex items-center justify-between z-10">
        <span className="text-sm font-semibold text-gray-700">
          Editable Symbol Preview ({shapeName})
        </span>

        {/* Action Panel */}
        <div className="flex items-center space-x-1.5">
          <button
            type="button"
            onClick={zoomIn}
            title="Zoom In"
            className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-600 transition"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={zoomOut}
            title="Zoom Out"
            className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-600 transition"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={resetViewer}
            title="Reset View"
            className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-600 transition"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <div className="w-px h-4 bg-gray-200 mx-1"></div>
          <button
            type="button"
            onClick={toggleFullWidth}
            title={isFullWidth ? 'Compact View' : 'Expand View'}
            className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-600 transition flex items-center gap-1 text-xs font-semibold"
          >
            {isFullWidth ? (
              <>
                <Minimize className="w-4 h-4" />
                <span>Minimize</span>
              </>
            ) : (
              <>
                <Maximize className="w-4 h-4" />
                <span>Expand</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* SVG Canvas view */}
      <div
        ref={containerRef}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className={`flex-1 relative overflow-hidden select-none ${
          isDragging ? 'cursor-grabbing' : 'cursor-grab'
        }`}
      >
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-50/50 backdrop-blur-xs">
            <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : svgContent ? (
          <div
            className="absolute inset-0 flex items-center justify-center p-8 origin-center transition-transform duration-75 pointer-events-none"
            style={{
              transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
            }}
            dangerouslySetInnerHTML={{ __html: svgContent }}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-rose-500 font-medium">
            Failed to parse vector SVG file from server.
          </div>
        )}

        {/* Drag Helper Overlay indicator */}
        <div className="absolute bottom-3 right-3 bg-gray-900/60 text-white text-[10px] px-2 py-1 rounded-full backdrop-blur-sm pointer-events-none flex items-center gap-1.5">
          <Move className="w-3.5 h-3.5" />
          Drag to Pan | Scroll to Zoom
        </div>
      </div>
    </div>
  );
};
