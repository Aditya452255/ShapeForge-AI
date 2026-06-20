from typing import List
from fastapi import APIRouter, Depends, File, UploadFile, status
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.schemas.document import DocumentResponse, UploadResponse
from app.services.document_service import DocumentService

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
