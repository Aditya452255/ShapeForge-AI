import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { FileText, Grid, FileCode } from 'lucide-react';
import { getDocuments } from '../api/documents';
import { getDocumentShapes } from '../api/shapes';
import { UploadCard } from '../components/UploadCard';
import { DocumentList } from '../components/DocumentList';
import { LoadingSpinner } from '../components/LoadingSpinner';

export const Dashboard: React.FC = () => {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['dashboardStats'],
    queryFn: async () => {
      const docs = await getDocuments();
      let totalShapesCount = 0;
      let totalSvgsCount = 0;
      
      // Load shape counts for all documents in parallel
      await Promise.all(
        docs.map(async (doc) => {
          try {
            const shapes = await getDocumentShapes(doc.id);
            totalShapesCount += shapes.length;
            totalSvgsCount += shapes.filter((s) => s.svg_path !== null).length;
          } catch {
            // Document might not have shapes detected yet, which is fine (returns empty list or error status)
            console.warn(`Could not load shapes for document ${doc.id}`);
          }
        })
      );

      return {
        documents: docs,
        totalDocuments: docs.length,
        totalShapes: totalShapesCount,
        totalSvgs: totalSvgsCount,
      };
    },
  });

  const handleUploadSuccess = () => {
    refetch();
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Stats Cards Section */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, idx) => (
            <div key={idx} className="bg-white border border-gray-200 rounded-2xl p-6 h-28 animate-pulse flex flex-col justify-between">
              <div className="h-4 bg-gray-200 rounded w-1/3"></div>
              <div className="h-8 bg-gray-200 rounded w-1/4"></div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: Total Documents */}
          <div className="bg-white border border-gray-255 rounded-2xl p-6 shadow-sm flex items-center justify-between group hover:border-indigo-200 transition">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Total Documents
              </span>
              <p className="text-3xl font-bold text-gray-800 tracking-tight">
                {data?.totalDocuments || 0}
              </p>
            </div>
            <div className="p-3 bg-indigo-50 rounded-xl text-indigo-600 transition-colors group-hover:bg-indigo-100">
              <FileText className="w-6 h-6" />
            </div>
          </div>

          {/* Card 2: Total Shapes */}
          <div className="bg-white border border-gray-255 rounded-2xl p-6 shadow-sm flex items-center justify-between group hover:border-emerald-250 transition">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Total Shapes
              </span>
              <p className="text-3xl font-bold text-gray-800 tracking-tight">
                {data?.totalShapes || 0}
              </p>
            </div>
            <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600 transition-colors group-hover:bg-emerald-100">
              <Grid className="w-6 h-6" />
            </div>
          </div>

          {/* Card 3: Total SVGs */}
          <div className="bg-white border border-gray-255 rounded-2xl p-6 shadow-sm flex items-center justify-between group hover:border-violet-250 transition">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Total SVGs (Vector Symbols)
              </span>
              <p className="text-3xl font-bold text-gray-800 tracking-tight">
                {data?.totalSvgs || 0}
              </p>
            </div>
            <div className="p-3 bg-violet-50 rounded-xl text-violet-600 transition-colors group-hover:bg-violet-100">
              <FileCode className="w-6 h-6" />
            </div>
          </div>
        </div>
      )}

      {/* Main Grid: Upload & File management */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Document table area */}
        <div className="lg:col-span-2 space-y-6">
          {isLoading ? (
            <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center shadow-sm">
              <LoadingSpinner label="Fetching workspace registry..." />
            </div>
          ) : (
            <DocumentList documents={data?.documents || []} />
          )}
        </div>

        {/* Upload card area */}
        <div className="space-y-6">
          <UploadCard onUploadSuccess={handleUploadSuccess} />
        </div>
      </div>
    </div>
  );
};
