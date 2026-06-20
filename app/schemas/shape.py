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
    document_id: UUID | None = None
    shape_number: int
    image_path: str
    bbox: BoundingBox
    shape_type: str
    confidence: float
    svg_path: str | None = None
    properties: dict = Field(default_factory=dict)
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
                "document_id": data.page.document_id if data.page else None,
                "shape_number": data.shape_number,
                "image_path": data.image_path,
                "shape_type": data.shape_type,
                "confidence": data.confidence,
                "svg_path": data.svg_path,
                "properties": data.properties or {},
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
            # Ensure properties defaults to dict
            if "properties" not in data or data["properties"] is None:
                data["properties"] = {}
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
    svg_path: str | None = None


class ShapeDetectionResponse(BaseModel):
    document_id: UUID
    shapes_detected: int
    status: str

class ShapePropertyUpdate(BaseModel):
    model_config = ConfigDict(extra="allow")

