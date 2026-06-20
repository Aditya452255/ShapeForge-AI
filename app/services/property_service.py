import logging
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.models.shape import Shape

logger = logging.getLogger(__name__)

class PropertyService:
    @staticmethod
    def update_properties(db: Session, shape_id: str, new_properties: dict) -> Shape:
        logger.info(f"Updating properties for shape: {shape_id}")
        
        # 1. Retrieve Shape by ID
        shape = db.query(Shape).filter(Shape.id == shape_id).first()
        if not shape:
            logger.error(f"Properties update failed: Shape {shape_id} not found in DB.")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Shape with ID {shape_id} not found."
            )
            
        # 2. Merge dictionary payload
        current_properties = shape.properties or {}
        if not isinstance(current_properties, dict):
            current_properties = {}
            
        # Trigger SQLAlchemy change tracking by assigning a new dictionary
        merged = dict(current_properties)
        merged.update(new_properties)
        
        try:
            shape.properties = merged
            db.commit()
            db.refresh(shape)
            logger.info("Properties merged successfully")
        except Exception as e:
            db.rollback()
            logger.error(f"Failed to merge shape properties: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update properties in database."
            )
            
        return shape

    @staticmethod
    def replace_properties(db: Session, shape_id: str, new_properties: dict) -> Shape:
        logger.info(f"Replacing properties for shape: {shape_id}")
        
        # 1. Retrieve Shape by ID
        shape = db.query(Shape).filter(Shape.id == shape_id).first()
        if not shape:
            logger.error(f"Properties replacement failed: Shape {shape_id} not found in DB.")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Shape with ID {shape_id} not found."
            )
            
        try:
            # Overwrite the entire properties object
            shape.properties = new_properties
            db.commit()
            db.refresh(shape)
            logger.info("Properties replaced successfully")
        except Exception as e:
            db.rollback()
            logger.error(f"Failed to replace shape properties: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to replace properties in database."
            )
            
        return shape
