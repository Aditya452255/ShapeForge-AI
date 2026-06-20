import logging
import fitz  # PyMuPDF
from pathlib import Path
from typing import List, Sequence
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.core.config import settings
from app.models.document import Document
from app.models.page import Page

logger = logging.getLogger(__name__)

class PDFProcessorService:
    @staticmethod
    def process_pdf(db: Session, document_id: str) -> int:
        logger.info(f"Processing document: {document_id}")
        
        # 1. Verify Document metadata exists in DB
        doc = db.query(Document).filter(Document.id == document_id).first()
        if not doc:
            logger.error(f"Processing failed: Document {document_id} not found in DB.")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Document with ID {document_id} not found."
            )
        
        # 2. Check if the PDF file exists on disk
        # Resolve the filename relative to the active upload directory to support custom directories (e.g. in tests)
        filename = Path(doc.file_path).name
        pdf_path = settings.upload_path / filename
        
        if not pdf_path.exists():
            logger.error(f"Processing failed: PDF file not found at {pdf_path}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="PDF file not found on disk."
            )
        
        # 3. Open PDF file with PyMuPDF
        try:
            pdf_doc = fitz.open(str(pdf_path))
        except Exception as e:
            logger.error(f"Failed to open/parse PDF {document_id}: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to parse PDF file. The file may be corrupted."
            )
        
        # 4. Clean up any existing page records in DB (to prevent duplicates if reprocessing)
        try:
            db.query(Page).filter(Page.document_id == document_id).delete()
            db.commit()
        except Exception as e:
            db.rollback()
            pdf_doc.close()
            logger.error(f"Failed to delete existing page metadata: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to clear existing page metadata."
            )

        # 5. Ensure output directory pages/{document_id}/ exists
        doc_pages_dir = settings.pages_path / document_id
        try:
            doc_pages_dir.mkdir(parents=True, exist_ok=True)
            logger.info(f"Verified directory: {doc_pages_dir}")
        except Exception as e:
            pdf_doc.close()
            logger.error(f"Failed to create output directory {doc_pages_dir}: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create page image storage directory."
            )
            
        created_image_paths = []
        pages_to_add = []
        pages_processed = 0
        
        try:
            # Matrix(3, 3) provides high quality ~300 DPI rendering
            zoom_matrix = fitz.Matrix(3, 3)
            
            for page_idx in range(len(pdf_doc)):
                page_num = page_idx + 1
                page = pdf_doc[page_idx]
                
                # Render to high-resolution Pixmap
                pix = page.get_pixmap(matrix=zoom_matrix)
                width = pix.width
                height = pix.height
                
                image_name = f"page_{page_num}.png"
                image_path = doc_pages_dir / image_name
                
                # Save to disk
                pix.save(str(image_path))
                created_image_paths.append(image_path)
                logger.info(f"Generated {image_name}")
                
                # Build database metadata Page model
                relative_image_path = f"pages/{document_id}/{image_name}"
                db_page = Page(
                    document_id=document_id,
                    page_number=page_num,
                    image_path=relative_image_path,
                    width=width,
                    height=height
                )
                pages_to_add.append(db_page)
                pages_processed += 1
            
            # Commit metadata to DB
            db.add_all(pages_to_add)
            db.commit()
            logger.info(f"Successfully processed {pages_processed} pages")
            
        except Exception as e:
            db.rollback()
            logger.error(f"Error processing PDF pages: {str(e)}")
            
            # Delete any page files created during this failed transaction
            for img_path in created_image_paths:
                if img_path.exists():
                    try:
                        img_path.unlink()
                        logger.info(f"Rolled back file: {img_path}")
                    except Exception as cleanup_err:
                        logger.error(f"Failed to delete {img_path}: {str(cleanup_err)}")
                        
            # Clean up directory if empty
            if doc_pages_dir.exists() and not any(doc_pages_dir.iterdir()):
                try:
                    doc_pages_dir.rmdir()
                except Exception:
                    pass
                    
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"An error occurred while converting PDF to images: {str(e)}"
            )
        finally:
            pdf_doc.close()
            
        return pages_processed

    @staticmethod
    def get_document_pages(db: Session, document_id: str) -> Sequence[Page]:
        # Validate that the Document exists
        doc = db.query(Document).filter(Document.id == document_id).first()
        if not doc:
            logger.error(f"Retrieval failed: Document {document_id} not found in DB.")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Document with ID {document_id} not found."
            )
        
        try:
            return db.query(Page).filter(Page.document_id == document_id).order_by(Page.page_number.asc()).all()
        except Exception as e:
            logger.error(f"Failed to query pages from database: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to query pages from database."
            )
