from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, ConfigDict

class PageResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    document_id: UUID
    page_number: int
    image_path: str
    width: int
    height: int
    created_at: datetime

class PageListResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    page_number: int
    image_path: str
    width: int
    height: int

class ProcessPDFResponse(BaseModel):
    document_id: UUID
    pages_processed: int
    status: str
