import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime
from app.database.session import Base

def generate_uuid() -> str:
    return str(uuid.uuid4())

class Document(Base):
    __tablename__ = "documents"

    id = Column(String(36), primary_key=True, default=generate_uuid, index=True)
    filename = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)
    upload_timestamp = Column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))
