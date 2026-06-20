from typing import List
from uuid import UUID
from fastapi import APIRouter, Depends, File, UploadFile, status, Body
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.api.deps import get_db
from app.schemas.document import DocumentResponse, UploadResponse
from app.schemas.page import PageListResponse, ProcessPDFResponse
from app.schemas.shape import ShapeListResponse, ShapeResponse, ShapeDetectionResponse, ShapePropertyUpdate
from app.services.document_service import DocumentService
from app.services.pdf_processor import PDFProcessorService
from app.services.shape_detector import ShapeDetectorService
from app.services.svg_generator import SVGGeneratorService
from app.services.property_service import PropertyService

router = APIRouter()

class SVGGenerationResponse(BaseModel):
    document_id: UUID
    svg_generated: int
    status: str

@router.post(
    "/upload-pdf",
    response_model=UploadResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload an engineering diagram PDF",
    description="Accepts a PDF file, validates the format, stores it on disk, and records metadata in the database."
)
def upload_pdf(
    file: UploadFile = File(..., description="The PDF file to upload"),
    db: Session = Depends(get_db)
):
    db_doc = DocumentService.create_document(db=db, file=file)
    return UploadResponse(
        document_id=db_doc.id,
        filename=db_doc.filename,
        message="PDF uploaded successfully"
    )

@router.get(
    "/documents",
    response_model=List[DocumentResponse],
    summary="Retrieve all uploaded documents",
    description="Returns a list of metadata for all documents uploaded to the system, sorted by upload time."
)
def get_documents(db: Session = Depends(get_db)):
    return DocumentService.get_all_documents(db=db)

@router.post(
    "/documents/{document_id}/process",
    response_model=ProcessPDFResponse,
    status_code=status.HTTP_200_OK,
    summary="Process PDF document pages into high-resolution images",
    description="Validates document existence, converts every PDF page to a high-resolution PNG, and registers page metadata."
)
def process_document(
    document_id: str,
    db: Session = Depends(get_db)
):
    pages_processed = PDFProcessorService.process_pdf(db=db, document_id=document_id)
    return ProcessPDFResponse(
        document_id=document_id,
        pages_processed=pages_processed,
        status="success"
    )

@router.get(
    "/documents/{document_id}/pages",
    response_model=List[PageListResponse],
    status_code=status.HTTP_200_OK,
    summary="Retrieve metadata of processed pages",
    description="Retrieves a list of all processed pages (numbers, image paths, dimensions) for a document."
)
def get_document_pages(
    document_id: str,
    db: Session = Depends(get_db)
):
    return PDFProcessorService.get_document_pages(db=db, document_id=document_id)

@router.post(
    "/documents/{document_id}/detect-shapes",
    response_model=ShapeDetectionResponse,
    status_code=status.HTTP_200_OK,
    summary="Detect and classify shapes on all pages of a document",
    description="Loads page images, extracts contours, crops shapes, executes geometry-based classification, and stores shape metadata."
)
def detect_document_shapes(
    document_id: str,
    db: Session = Depends(get_db)
):
    shapes_count = ShapeDetectorService.detect_shapes(db=db, document_id=document_id)
    return ShapeDetectionResponse(
        document_id=document_id,
        shapes_detected=shapes_count,
        status="success"
    )

@router.get(
    "/documents/{document_id}/shapes",
    response_model=List[ShapeListResponse],
    status_code=status.HTTP_200_OK,
    summary="List all detected shapes for a document",
    description="Returns a list of metadata for all shapes detected across the pages of a document."
)
def get_document_shapes(
    document_id: str,
    db: Session = Depends(get_db)
):
    return ShapeDetectorService.get_document_shapes(db=db, document_id=document_id)

@router.get(
    "/shapes/{shape_id}",
    response_model=ShapeResponse,
    status_code=status.HTTP_200_OK,
    summary="Get detailed metadata for a shape",
    description="Retrieves complete metadata for a specific shape including its bounding box coordinates, properties, and SVG paths."
)
def get_shape_details(
    shape_id: str,
    db: Session = Depends(get_db)
):
    return ShapeDetectorService.get_shape_by_id(db=db, shape_id=shape_id)

@router.post(
    "/documents/{document_id}/generate-svg",
    response_model=SVGGenerationResponse,
    status_code=status.HTTP_200_OK,
    summary="Generate editable SVGs for all detected shapes of a document",
    description="Processes all detected shapes, traces their outline contours, saves them as editable vector SVGs, and updates DB metadata."
)
def generate_document_svgs(
    document_id: str,
    db: Session = Depends(get_db)
):
    svgs_generated = SVGGeneratorService.generate_svgs(db=db, document_id=document_id)
    return SVGGenerationResponse(
        document_id=document_id,
        svg_generated=svgs_generated,
        status="success"
    )

@router.patch(
    "/shapes/{shape_id}/properties",
    response_model=ShapeResponse,
    status_code=status.HTTP_200_OK,
    summary="Merge new shape properties",
    description="Merges the provided custom properties with the shape's existing attributes in the database."
)
def update_shape_properties(
    shape_id: str,
    payload: ShapePropertyUpdate = Body(..., description="The properties dictionary to merge"),
    db: Session = Depends(get_db)
):
    # payload.model_dump() extracts the dynamically validated key-value pairs
    properties_to_merge = payload.model_dump()
    return PropertyService.update_properties(db=db, shape_id=shape_id, new_properties=properties_to_merge)

@router.put(
    "/shapes/{shape_id}/properties",
    response_model=ShapeResponse,
    status_code=status.HTTP_200_OK,
    summary="Overwrite shape properties",
    description="Replaces the shape's properties dictionary entirely with the provided key-value dictionary."
)
def replace_shape_properties(
    shape_id: str,
    payload: ShapePropertyUpdate = Body(..., description="The properties dictionary to set"),
    db: Session = Depends(get_db)
):
    properties_to_set = payload.model_dump()
    return PropertyService.replace_properties(db=db, shape_id=shape_id, new_properties=properties_to_set)
