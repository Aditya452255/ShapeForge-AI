import client from './client';
import type { Shape, ShapeListResponseItem } from '../types';

export const getDocumentShapes = async (documentId: string): Promise<ShapeListResponseItem[]> => {
  const response = await client.get<ShapeListResponseItem[]>(`/documents/${documentId}/shapes`);
  return response.data;
};

export const getShapeDetails = async (shapeId: string): Promise<Shape> => {
  const response = await client.get<Shape>(`/shapes/${shapeId}`);
  return response.data;
};

export const patchShapeProperties = async (
  shapeId: string, 
  properties: Record<string, string>
): Promise<Shape> => {
  const response = await client.patch<Shape>(`/shapes/${shapeId}/properties`, properties);
  return response.data;
};

export const putShapeProperties = async (
  shapeId: string, 
  properties: Record<string, string>
): Promise<Shape> => {
  const response = await client.put<Shape>(`/shapes/${shapeId}/properties`, properties);
  return response.data;
};
