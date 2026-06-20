export interface Document {
  id: string;
  filename: string;
  file_path: string;
  upload_timestamp: string;
}

export interface Page {
  id: string;
  document_id: string;
  page_number: number;
  image_path: string;
  width: number;
  height: number;
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Shape {
  shape_id: string;
  page_id: string;
  document_id: string | null;
  shape_number: number;
  image_path: string;
  svg_path: string | null;
  bbox: BoundingBox;
  shape_type: string;
  confidence: number;
  properties: Record<string, string>;
  created_at: string;
}

export interface ShapeListResponseItem {
  shape_id: string;
  shape_number: number;
  shape_type: string;
  confidence: number;
  image_path: string;
  svg_path: string | null;
}

export interface UploadResponse {
  document_id: string;
  filename: string;
  message: string;
}

export interface ProcessPDFResponse {
  document_id: string;
  pages_processed: number;
  status: string;
}

export interface ShapeDetectionResponse {
  document_id: string;
  shapes_detected: number;
  status: string;
}

export interface SVGGenerationResponse {
  document_id: string;
  svg_generated: number;
  status: string;
}
