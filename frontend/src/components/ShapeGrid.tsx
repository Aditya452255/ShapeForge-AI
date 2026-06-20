import React, { useState, useMemo } from 'react';
import { Search, Filter, Grid3X3 } from 'lucide-react';
import type { ShapeListResponseItem } from '../types';
import { ShapeCard } from './ShapeCard';

interface ShapeGridProps {
  shapes: ShapeListResponseItem[];
}

type FilterType = 'all' | 'valve' | 'pump' | 'instrument' | 'unknown';

export const ShapeGrid: React.FC<ShapeGridProps> = ({ shapes }) => {
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const shapeCategories: { value: FilterType; label: string }[] = [
    { value: 'all', label: 'All Shapes' },
    { value: 'valve', label: 'Valves' },
    { value: 'pump', label: 'Pumps' },
    { value: 'instrument', label: 'Instruments' },
    { value: 'unknown', label: 'Unknown/Other' },
  ];

  const filteredShapes = useMemo(() => {
    return shapes.filter((shape) => {
      const matchesFilter = 
        activeFilter === 'all' || 
        shape.shape_type.toLowerCase() === activeFilter;
      
      const matchesSearch = 
        shape.shape_number.toString().includes(searchQuery) ||
        shape.shape_type.toLowerCase().includes(searchQuery.toLowerCase());
      
      return matchesFilter && matchesSearch;
    });
  }, [shapes, activeFilter, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Search & Filter Controls */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Filters pills */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="text-gray-400 mr-2 shrink-0 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider">
            <Filter className="w-3.5 h-3.5" />
            Filter By
          </div>
          {shapeCategories.map((cat) => {
            const count = cat.value === 'all' 
              ? shapes.length 
              : shapes.filter((s) => s.shape_type.toLowerCase() === cat.value).length;
            
            return (
              <button
                key={cat.value}
                type="button"
                onClick={() => setActiveFilter(cat.value)}
                className={`text-xs px-3.5 py-1.5 rounded-full border transition font-medium ${
                  activeFilter === cat.value
                    ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm'
                    : 'bg-white border-gray-205 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {cat.label} ({count})
              </button>
            );
          })}
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-72">
          <input
            type="text"
            placeholder="Search shapes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent bg-gray-50/50 hover:bg-white focus:bg-white transition-all"
          />
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
        </div>
      </div>

      {/* Grid rendering */}
      {filteredShapes.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center">
          <div className="mx-auto w-12 h-12 bg-gray-50 flex items-center justify-center rounded-xl text-gray-400 mb-4">
            <Grid3X3 className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-semibold text-gray-900 mb-1">No shapes matched</h3>
          <p className="text-xs text-gray-500 max-w-sm mx-auto">
            Try adjusting your search criteria or active filters.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filteredShapes.map((shape) => (
            <ShapeCard key={shape.shape_id} shape={shape} />
          ))}
        </div>
      )}
    </div>
  );
};
