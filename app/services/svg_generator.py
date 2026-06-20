import logging
import cv2
import svgwrite
from pathlib import Path
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.core.config import settings
from app.models.document import Document
from app.models.page import Page
from app.models.shape import Shape

logger = logging.getLogger(__name__)

class SVGGeneratorService:
    @staticmethod
    def generate_svgs(db: Session, document_id: str) -> int:
        logger.info(f"Starting SVG generation for document: {document_id}")
        
        # 1. Verify Document metadata exists in DB
        doc = db.query(Document).filter(Document.id == document_id).first()
        if not doc:
            logger.error(f"SVG generation failed: Document {document_id} not found in DB.")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Document with ID {document_id} not found."
            )
            
        # 2. Get pages for this document
        pages = db.query(Page).filter(Page.document_id == document_id).all()
        if not pages:
            logger.error(f"SVG generation failed: No pages found for document {document_id}.")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No pages found. Please process PDF pages first."
            )
            
        # 3. Get shapes for these pages
        page_ids = [page.id for page in pages]
        shapes = db.query(Shape).filter(Shape.page_id.in_(page_ids)).order_by(Shape.shape_number.asc()).all()
        if not shapes:
            logger.error(f"SVG generation failed: No shapes found for document {document_id}.")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No shapes found. Please run shape detection first."
            )

        # 4. Create output directory: svgs/{document_id}/
        svgs_base_dir = settings.svgs_path / document_id
        try:
            svgs_base_dir.mkdir(parents=True, exist_ok=True)
            logger.info(f"Verified SVG output directory: {svgs_base_dir}")
        except Exception as e:
            logger.error(f"Failed to create directory {svgs_base_dir}: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create SVG output directory."
            )

        svgs_generated_count = 0
        created_file_paths = []
        
        try:
            for shape in shapes:
                shape_num = shape.shape_number
                logger.info(f"Generating SVG for shape_{shape_num}")
                
                # Resolve cropped image path
                img_path = Path(shape.image_path)
                if not img_path.is_absolute():
                    filename = img_path.name
                    img_path = settings.shapes_path / document_id / filename
                    
                if not img_path.exists():
                    logger.error(f"Shape crop image not found on disk at {img_path}")
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail=f"Shape crop image for shape {shape_num} not found on disk."
                    )
                    
                # Read using OpenCV
                image = cv2.imread(str(img_path))
                if image is None:
                    logger.error(f"Failed to read image file at {img_path}")
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Shape image {shape_num} is corrupted and cannot be read."
                    )
                    
                # Grayscale & inverse threshold to extract boundaries
                gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
                _, thresh = cv2.threshold(gray, 200, 255, cv2.THRESH_BINARY_INV)
                
                # Find contours
                contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
                
                # Setup target SVG filename
                svg_filename = f"shape_{shape_num}.svg"
                svg_filepath = svgs_base_dir / svg_filename
                
                height, width = image.shape[:2]
                
                # Create SVG Drawing using svgwrite
                dwg = svgwrite.Drawing(str(svg_filepath), size=(width, height))
                
                paths_added = 0
                for contour in contours:
                    if len(contour) < 2:
                        continue
                    
                    # Convert coordinate array into standard SVG path instructions
                    path_data = []
                    start_pt = contour[0][0]
                    path_data.append(f"M {start_pt[0]} {start_pt[1]}")
                    
                    for pt in contour[1:]:
                        coord = pt[0]
                        path_data.append(f"L {coord[0]} {coord[1]}")
                        
                    path_data.append("Z")
                    path_str = " ".join(path_data)
                    
                    dwg.add(dwg.path(d=path_str, stroke="black", fill="none", stroke_width=2))
                    paths_added += 1
                
                # Handle edge cases (empty or plain white cropped crop): draw outer border
                if paths_added == 0:
                    dwg.add(dwg.rect(insert=(0, 0), size=(width, height), stroke="black", fill="none", stroke_width=2))
                
                # Save SVG drawing
                dwg.save()
                created_file_paths.append(svg_filepath)
                logger.info(f"SVG saved successfully for shape_{shape_num}")
                
                # Update database shape row
                relative_svg_path = f"svgs/{document_id}/{svg_filename}"
                shape.svg_path = relative_svg_path
                svgs_generated_count += 1
                
            # Commit changes to database
            db.commit()
            logger.info(f"Successfully generated {svgs_generated_count} SVG files.")
            
        except Exception as e:
            db.rollback()
            logger.error(f"Error during SVG generation pipeline: {str(e)}")
            
            # Delete any created SVG files during this transaction
            for file_path in created_file_paths:
                if file_path.exists():
                    try:
                        file_path.unlink()
                        logger.info(f"Deleted file during rollback: {file_path}")
                    except Exception as cleanup_err:
                        logger.error(f"Failed to delete {file_path}: {str(cleanup_err)}")
                        
            if isinstance(e, HTTPException):
                raise e
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"An error occurred during SVG generation: {str(e)}"
            )
            
        return svgs_generated_count
