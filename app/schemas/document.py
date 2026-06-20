from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, ConfigDict

class DocumentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    filename: str
    file_path: str
    upload_timestamp: datetime

class UploadResponse(BaseModel):
    document_id: UUID
    filename: str
    message: str
