import React from 'react';
import { Link } from 'react-router-dom';
import { FileText, ChevronRight, Calendar, Layers } from 'lucide-react';
import type { Document } from '../types';

interface DocumentListProps {
  documents: Document[];
}

export const DocumentList: React.FC<DocumentListProps> = ({ documents }) => {
  const formatDate = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  if (documents.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center">
        <div className="mx-auto w-12 h-12 bg-gray-50 flex items-center justify-center rounded-xl text-gray-400 mb-4">
          <FileText className="w-6 h-6" />
        </div>
        <h3 className="text-sm font-semibold text-gray-900 mb-1">No documents uploaded</h3>
        <p className="text-xs text-gray-500 max-w-sm mx-auto">
          Start by uploading a PDF diagram. Once uploaded, it will appear here in the workspace registry.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Layers className="w-5 h-5 text-indigo-600" />
          <h3 className="text-lg font-semibold text-gray-800">Workspace Documents</h3>
        </div>
        <span className="bg-indigo-50 text-indigo-700 text-xs px-2.5 py-0.5 rounded-full font-medium">
          {documents.length} Total
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50/50 text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-200">
              <th className="px-6 py-3.5">Filename</th>
              <th className="px-6 py-3.5">Document ID</th>
              <th className="px-6 py-3.5">Upload Date</th>
              <th className="px-6 py-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-150 text-sm text-gray-700">
            {documents.map((doc) => (
              <tr key={doc.id} className="hover:bg-gray-50/30 transition">
                <td className="px-6 py-4 font-medium text-gray-900 flex items-center gap-3">
                  <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div className="truncate max-w-xs md:max-w-md" title={doc.filename}>
                    {doc.filename}
                  </div>
                </td>
                <td className="px-6 py-4 text-xs font-mono text-gray-400">
                  {doc.id}
                </td>
                <td className="px-6 py-4 text-gray-500 flex items-center gap-1.5 mt-1.5 border-none">
                  <Calendar className="w-3.5 h-3.5 text-gray-400" />
                  {formatDate(doc.upload_timestamp)}
                </td>
                <td className="px-6 py-4 text-right">
                  <Link
                    to={`/documents/${doc.id}`}
                    className="inline-flex items-center gap-1 text-sm font-semibold text-indigo-600 hover:text-indigo-700 transition"
                  >
                    Open Workspace
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
