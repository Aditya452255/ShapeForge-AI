import logging
import shutil
import cv2
from pathlib import Path
from typing import List, Sequence
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.core.config import settings
from app.models.document import Document
from app.models.page import Page
from app.models.shape import Shape
from app.services.shape_classifier import ShapeClassifierService

logger = logging.getLogger(__name__)

class ShapeDetectorService:
    @staticmethod
    def detect_shapes(db: Session, document_id: str) -> int:
        logger.info(f"Starting shape detection for document: {document_id}")
        
        # 1. Verify Document metadata exists in DB
        doc = db.query(Document).filter(Document.id == document_id).first()
        if not doc:
            logger.error(f"Detection failed: Document {document_id} not found in DB.")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Document with ID {document_id} not found."
            )
            
        # 2. Get pages for this document
        pages = db.query(Page).filter(Page.document_id == document_id).order_by(Page.page_number.asc()).all()
        if not pages:
            logger.error(f"Detection failed: No pages processed for document {document_id}.")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No pages found. Please process the PDF pages first."
            )
            
        # 3. Clean up existing shape metadata to support reprocessing
        try:
            page_ids = [page.id for page in pages]
            db.query(Shape).filter(Shape.page_id.in_(page_ids)).delete(synchronize_session=False)
            db.commit()
            logger.info("Cleared existing shape metadata from DB.")
        except Exception as e:
            db.rollback()
            logger.error(f"Failed to clear existing shapes metadata: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to clear existing shapes metadata."
            )
            
        # Deleting physical shape crops directory
        shapes_base_dir = settings.shapes_path / document_id
        if shapes_base_dir.exists():
            try:
                shutil.rmtree(shapes_base_dir)
                logger.info(f"Cleared existing shape crops directory: {shapes_base_dir}")
            except Exception as e:
                logger.error(f"Failed to delete existing shapes directory {shapes_base_dir}: {str(e)}")
                
        # 4. Create directory structure shapes/{document_id}/
        try:
            shapes_base_dir.mkdir(parents=True, exist_ok=True)
            logger.info(f"Created/verified shapes directory: {shapes_base_dir}")
        except Exception as e:
            logger.error(f"Failed to create directory {shapes_base_dir}: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create shape image directory."
            )

        shapes_detected_count = 0
        shapes_to_add = []
        created_file_paths = []
        
        # 5. Process page images
        try:
            for page in pages:
                page_img_path = Path(page.image_path)
                if not page_img_path.is_absolute():
                    # Resolve relative to active page images directory for robustness
                    filename = page_img_path.name
                    page_img_path = settings.pages_path / document_id / filename
                
                logger.info(f"Loading page image: {page_img_path}")
                if not page_img_path.exists():
                    logger.error(f"Page image file not found on disk at {page_img_path}")
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail=f"Page image for page {page.page_number} not found on disk."
                    )
                
                # Load page image with OpenCV
                image = cv2.imread(str(page_img_path))
                if image is None:
                    logger.error(f"Failed to read/parse image file at {page_img_path}")
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Failed to read page image. It may be corrupted."
                    )
                
                # Pipeline Step A: Convert to grayscale
                gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
                
                # Pipeline Step B: Thresholding (binary inverse since drawings are black lines on white background)
                _, thresh = cv2.threshold(gray, 200, 255, cv2.THRESH_BINARY_INV)
                
                # Pipeline Step C: Morphological Close cleanup
                kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
                cleaned = cv2.morphologyEx(thresh, cv2.MORPH_CLOSE, kernel)
                
                # Pipeline Step D: Find contours
                contours, _ = cv2.findContours(cleaned, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
                logger.info(f"Found {len(contours)} initial contours on page {page.page_number}")
                
                for contour in contours:
                    # Pipeline Step E: Area filtering
                    area = cv2.contourArea(contour)
                    if settings.MIN_CONTOUR_AREA <= area <= settings.MAX_CONTOUR_AREA:
                        shapes_detected_count += 1
                        logger.info(f"Detected contour with area: {area:.1f}")
                        
                        # Pipeline Step F: Bounding Box
                        x, y, w, h = cv2.boundingRect(contour)
                        
                        # Pipeline Step G: Crop Shape
                        cropped = image[y:y+h, x:x+w]
                        
                        # Pipeline Step H: Classification
                        classification = ShapeClassifierService.classify_shape(contour, x, y, w, h)
                        shape_type = classification["shape_type"]
                        confidence = classification["confidence"]
                        
                        # Pipeline Step I: Save Shape Crop PNG to disk
                        shape_img_name = f"shape_{shapes_detected_count}.png"
                        shape_img_path = shapes_base_dir / shape_img_name
                        
                        success = cv2.imwrite(str(shape_img_path), cropped)
                        if not success:
                            raise Exception(f"Failed to write cropped shape to {shape_img_path}")
                            
                        created_file_paths.append(shape_img_path)
                        logger.info(f"Generated shape crop: {shape_img_name}")
                        
                        # Pipeline Step J: Build DB model
                        relative_shape_path = f"shapes/{document_id}/{shape_img_name}"
                        db_shape = Shape(
                            page_id=page.id,
                            shape_number=shapes_detected_count,
                            image_path=relative_shape_path,
                            x=x,
                            y=y,
                            width=w,
                            height=h,
                            shape_type=shape_type,
                            confidence=confidence
                        )
                        shapes_to_add.append(db_shape)
            
            # Save all shape records to database
            db.add_all(shapes_to_add)
            db.commit()
            logger.info(f"Completed detection. Stored metadata for {shapes_detected_count} shapes.")
            
        except Exception as e:
            db.rollback()
            logger.error(f"Error during shape detection pipeline: {str(e)}")
            
            # Clean up files created during this failed transaction
            for file_path in created_file_paths:
                if file_path.exists():
                    try:
                        file_path.unlink()
                        logger.info(f"Deleted file during rollback: {file_path}")
                    except Exception as cleanup_err:
                        logger.error(f"Failed to delete {file_path}: {str(cleanup_err)}")
            
            # Delete directory if empty
            if shapes_base_dir.exists() and not any(shapes_base_dir.iterdir()):
                try:
                    shapes_base_dir.rmdir()
                except Exception:
                    pass
            
            if isinstance(e, HTTPException):
                raise e
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"An error occurred during shape detection: {str(e)}"
            )
            
        return shapes_detected_count

    @staticmethod
    def get_document_shapes(db: Session, document_id: str) -> List[Shape]:
        # Validate that the Document exists
        doc = db.query(Document).filter(Document.id == document_id).first()
        if not doc:
            logger.error(f"Retrieval failed: Document {document_id} not found.")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Document with ID {document_id} not found."
            )
            
        try:
            # Query pages for document
            pages = db.query(Page).filter(Page.document_id == document_id).all()
            page_ids = [page.id for page in pages]
            
            # Query shapes for these pages
            return db.query(Shape).filter(Shape.page_id.in_(page_ids)).order_by(Shape.shape_number.asc()).all()
        except Exception as e:
            logger.error(f"Failed to query shapes for document {document_id}: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to query shapes from database."
            )

    @staticmethod
    def get_shape_by_id(db: Session, shape_id: str) -> Shape:
        shape = db.query(Shape).filter(Shape.id == shape_id).first()
        if not shape:
            logger.error(f"Retrieval failed: Shape {shape_id} not found in DB.")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Shape with ID {shape_id} not found."
            )
        return shape
