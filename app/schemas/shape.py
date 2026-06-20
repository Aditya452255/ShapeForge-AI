from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field, model_validator

class BoundingBox(BaseModel):
    x: int
    y: int
    width: int
    height: int

class ShapeResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    shape_id: UUID = Field(validation_alias="id", serialization_alias="shape_id")
    page_id: UUID
    shape_number: int
    image_path: str
    bbox: BoundingBox
    shape_type: str
    confidence: float
    created_at: datetime

    @model_validator(mode="before")
    @classmethod
    def populate_bbox(cls, data):
        # Handle SQLAlchemy model objects
        if hasattr(data, "x") and hasattr(data, "y") and hasattr(data, "width") and hasattr(data, "height"):
            # Extract attributes from DB model
            attribs = {
                "id": data.id,
                "page_id": data.page_id,
                "shape_number": data.shape_number,
                "image_path": data.image_path,
                "shape_type": data.shape_type,
                "confidence": data.confidence,
                "created_at": data.created_at,
                "bbox": {
                    "x": data.x,
                    "y": data.y,
                    "width": data.width,
                    "height": data.height
                }
            }
            return attribs
        # Handle raw dictionaries
        elif isinstance(data, dict) and "x" in data and "y" in data:
            data["bbox"] = {
                "x": data["x"],
                "y": data["y"],
                "width": data["width"],
                "height": data["height"]
            }
            # Also ensure shape_id matches id for alias mapping
            if "id" in data and "shape_id" not in data:
                data["shape_id"] = data["id"]
            return data
        return data

class ShapeListResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    shape_id: UUID = Field(validation_alias="id", serialization_alias="shape_id")
    shape_number: int
    shape_type: str
    confidence: float
    image_path: str

class ShapeDetectionResponse(BaseModel):
    document_id: UUID
    shapes_detected: int
    status: str
