from typing import List
from fastapi import APIRouter, Depends, File, UploadFile, status
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.schemas.document import DocumentResponse, UploadResponse
from app.schemas.page import PageListResponse, ProcessPDFResponse
from app.schemas.shape import ShapeListResponse, ShapeResponse, ShapeDetectionResponse
from app.services.document_service import DocumentService
from app.services.pdf_processor import PDFProcessorService
from app.services.shape_detector import ShapeDetectorService

router = APIRouter()

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
    description="Retrieves complete metadata for a specific shape including its bounding box coordinates."
)
def get_shape_details(
    shape_id: str,
    db: Session = Depends(get_db)
):
    return ShapeDetectorService.get_shape_by_id(db=db, shape_id=shape_id)
