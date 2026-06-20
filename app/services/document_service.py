import logging
import uuid
import shutil
from pathlib import Path
from typing import List, Sequence
from fastapi import UploadFile, HTTPException, status
from sqlalchemy.orm import Session
from app.core.config import settings
from app.models.document import Document

logger = logging.getLogger(__name__)

class DocumentService:
    @staticmethod
    def create_document(db: Session, file: UploadFile) -> Document:
        filename = file.filename or ""
        
        # 1. Validation: check file extension
        if not filename.lower().endswith(".pdf"):
            logger.warning(f"File upload rejected: '{filename}' does not have a .pdf extension")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Only PDF files are allowed (invalid file extension)."
            )
        
        # 2. Validation: check MIME type
        if file.content_type != "application/pdf":
            logger.warning(f"File upload rejected: '{filename}' content type is {file.content_type}, expected application/pdf")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Only PDF files are allowed (invalid MIME type)."
            )

        # 3. Generate unique UUID
        doc_id = str(uuid.uuid4())
        
        # 4. Ensure upload directory exists
        upload_dir = settings.upload_path
        upload_dir.mkdir(parents=True, exist_ok=True)
        
        # 5. Define write target path
        target_filename = f"{doc_id}.pdf"
        target_path = upload_dir / target_filename
        
        # 6. Save the file stream to disk
        try:
            logger.info(f"Saving uploaded file '{filename}' to {target_path}")
            # Reset cursor to beginning of file just in case it was read elsewhere
            file.file.seek(0)
            with open(target_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
        except Exception as e:
            logger.error(f"Failed to write file to disk: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to save uploaded file on server."
            )
        
        # 7. Persist metadata in the database
        relative_path = f"uploads/{target_filename}"
        db_doc = Document(
            id=doc_id,
            filename=filename,
            file_path=relative_path
        )
        
        try:
            db.add(db_doc)
            db.commit()
            db.refresh(db_doc)
            logger.info(f"Document '{filename}' metadata successfully saved with ID: {doc_id}")
            return db_doc
        except Exception as e:
            logger.error(f"Failed to insert document metadata: {str(e)}")
            db.rollback()
            
            # Clean up the file from disk if database transaction fails
            if target_path.exists():
                try:
                    target_path.unlink()
                    logger.info(f"Cleaned up file {target_path} after database insertion rollback")
                except Exception as cleanup_err:
                    logger.error(f"Failed to clean up file {target_path}: {str(cleanup_err)}")
            
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to persist document metadata in database."
            )

    @staticmethod
    def get_all_documents(db: Session) -> Sequence[Document]:
        try:
            return db.query(Document).order_by(Document.upload_timestamp.desc()).all()
        except Exception as e:
            logger.error(f"Failed to retrieve documents from database: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to query documents from database."
            )
