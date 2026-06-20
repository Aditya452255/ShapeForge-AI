import client, { API_BASE_URL } from './client';
import type { 
  Document, 
  Page, 
  UploadResponse, 
  ProcessPDFResponse, 
  ShapeDetectionResponse, 
  SVGGenerationResponse 
} from '../types';

export const uploadPDF = async (file: File): Promise<UploadResponse> => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await client.post<UploadResponse>('/upload-pdf', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

export const getDocuments = async (): Promise<Document[]> => {
  const response = await client.get<Document[]>('/documents');
  return response.data;
};

export const processDocument = async (id: string): Promise<ProcessPDFResponse> => {
  const response = await client.post<ProcessPDFResponse>(`/documents/${id}/process`);
  return response.data;
};

export const getDocumentPages = async (id: string): Promise<Page[]> => {
  const response = await client.get<Page[]>(`/documents/${id}/pages`);
  return response.data;
};

export const detectShapes = async (id: string): Promise<ShapeDetectionResponse> => {
  const response = await client.post<ShapeDetectionResponse>(`/documents/${id}/detect-shapes`);
  return response.data;
};

export const generateSVG = async (id: string): Promise<SVGGenerationResponse> => {
  const response = await client.post<SVGGenerationResponse>(`/documents/${id}/generate-svg`);
  return response.data;
};

export const getExportMetadataUrl = (id: string): string => {
  return `${API_BASE_URL}/documents/${id}/export`;
};
