import React, { useState, useRef } from 'react';
import { UploadCloud, FileText, CheckCircle, AlertTriangle } from 'lucide-react';
import { uploadPDF } from '../api/documents';
import type { UploadResponse } from '../types';

interface UploadCardProps {
  onUploadSuccess: (response: UploadResponse) => void;
}

export const UploadCard: React.FC<UploadCardProps> = ({ onUploadSuccess }) => {
  const [isDragActive, setIsDragActive] = useState<boolean>(false);
  const [uploading, setUploading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragActive(true);
    } else if (e.type === 'dragleave') {
      setIsDragActive(false);
    }
  };

  const processFile = async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setError('Only PDF documents are supported.');
      setSuccessMsg(null);
      return;
    }
    setError(null);
    setSuccessMsg(null);
    setUploading(true);

    try {
      const response = await uploadPDF(file);
      setSuccessMsg(`"${file.name}" uploaded successfully!`);
      onUploadSuccess(response);
    } catch (err: any) {
      const details = err.response?.data?.detail || 'Failed to connect to the server.';
      setError(typeof details === 'string' ? details : 'An error occurred during file upload.');
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      await processFile(e.target.files[0]);
    }
  };

  const onButtonClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
      <h2 className="text-lg font-semibold text-gray-800 mb-2">Upload Diagrams</h2>
      <p className="text-sm text-gray-500 mb-4">
        Upload vector or scanned PDF drawings to run shape classification and export editable symbol metadata.
      </p>

      <div
        className={`relative border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center transition-all ${
          isDragActive 
            ? 'border-indigo-600 bg-indigo-50/50' 
            : 'border-gray-300 hover:border-indigo-400 bg-gray-50/30'
        }`}
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf"
          className="hidden"
          onChange={handleFileInputChange}
          disabled={uploading}
        />

        {uploading ? (
          <div className="flex flex-col items-center space-y-4">
            <div className="relative flex items-center justify-center">
              <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
              <FileText className="absolute w-5 h-5 text-indigo-600 animate-pulse" />
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-gray-700">Uploading PDF document...</p>
              <p className="text-xs text-gray-400 mt-1">Extracting file streams and validating headers</p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center text-center space-y-3">
            <div className="p-3 bg-indigo-50 rounded-lg text-indigo-600">
              <UploadCloud className="w-8 h-8" />
            </div>
            <div>
              <button
                type="button"
                onClick={onButtonClick}
                className="text-sm font-semibold text-indigo-600 hover:text-indigo-700 transition"
              >
                Click to upload
              </button>
              <span className="text-sm text-gray-500"> or drag and drop</span>
            </div>
            <p className="text-xs text-gray-400">PDF documents up to 50MB</p>
          </div>
        )}
      </div>

      {error && (
        <div className="mt-4 flex items-start gap-2.5 p-3 bg-rose-50 border border-rose-100 rounded-xl text-rose-700 text-sm">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          <div>{error}</div>
        </div>
      )}

      {successMsg && (
        <div className="mt-4 flex items-start gap-2.5 p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-700 text-sm">
          <CheckCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <div>{successMsg}</div>
        </div>
      )}
    </div>
  );
};
