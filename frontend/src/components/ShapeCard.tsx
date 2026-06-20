import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Percent } from 'lucide-react';
import type { ShapeListResponseItem } from '../types';
import { API_BASE_URL } from '../api/client';

interface ShapeCardProps {
  shape: ShapeListResponseItem;
}

export const ShapeCard: React.FC<ShapeCardProps> = ({ shape }) => {
  const imageUrl = `${API_BASE_URL}/${shape.image_path}`;
  const confidencePercent = Math.round(shape.confidence * 100);

  // Determine color theme for classification
  const getBadgeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'valve':
        return 'bg-amber-50 text-amber-800 border-amber-250';
      case 'pump':
        return 'bg-blue-50 text-blue-800 border-blue-250';
      case 'instrument':
        return 'bg-purple-50 text-purple-800 border-purple-250';
      default:
        return 'bg-gray-50 text-gray-800 border-gray-250';
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md hover:border-gray-300 transition-all flex flex-col group">
      {/* Image Preview Container */}
      <div className="aspect-square bg-slate-50 flex items-center justify-center p-4 relative border-b border-gray-100 overflow-hidden">
        <img
          src={imageUrl}
          alt={`Shape crop ${shape.shape_number}`}
          className="max-h-full max-w-full object-contain rounded transition-transform duration-300 group-hover:scale-105"
          onError={(e) => {
            // Fallback for missing image
            (e.target as HTMLImageElement).src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 24 24" fill="none" stroke="%23cbd5e1" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>';
          }}
        />
        
        {/* Floating Shape Number Badge */}
        <span className="absolute top-3 left-3 bg-gray-900/80 text-white text-[10px] font-mono px-2 py-0.5 rounded backdrop-blur-sm">
          #{shape.shape_number}
        </span>
      </div>

      {/* Details Container */}
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div className="mb-4">
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <span className="text-[11px] font-mono text-gray-400 uppercase tracking-wider">
              Classification
            </span>
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${getBadgeColor(shape.shape_type)}`}>
              {shape.shape_type}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-800">
              Confidence
            </span>
            <div className="flex items-center text-xs text-gray-500 font-medium">
              <span>{confidencePercent}</span>
              <Percent className="w-3 h-3 text-gray-400 ml-0.5" />
            </div>
          </div>
          
          {/* Visual Confidence Bar */}
          <div className="w-full bg-gray-100 rounded-full h-1.5 mt-2">
            <div
              className={`h-1.5 rounded-full ${
                confidencePercent > 80 
                  ? 'bg-emerald-500' 
                  : confidencePercent > 50 
                    ? 'bg-amber-500' 
                    : 'bg-rose-500'
              }`}
              style={{ width: `${confidencePercent}%` }}
            />
          </div>
        </div>

        <Link
          to={`/shapes/${shape.shape_id}`}
          className="w-full inline-flex items-center justify-center gap-1.5 bg-gray-50 hover:bg-indigo-650 hover:text-white text-gray-700 text-xs font-semibold py-2 px-3 rounded-xl border border-gray-150 transition-all duration-200"
        >
          View Details
          <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
};
