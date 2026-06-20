import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, Float, ForeignKey, DateTime, JSON
from sqlalchemy.orm import relationship
from app.database.session import Base

def generate_uuid() -> str:
    return str(uuid.uuid4())

class Shape(Base):
    __tablename__ = "shapes"

    id = Column(String(36), primary_key=True, default=generate_uuid, index=True)
    page_id = Column(
        String(36),
        ForeignKey("pages.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    shape_number = Column(Integer, nullable=False)
    image_path = Column(String(500), nullable=False)
    x = Column(Integer, nullable=False)
    y = Column(Integer, nullable=False)
    width = Column(Integer, nullable=False)
    height = Column(Integer, nullable=False)
    shape_type = Column(String(50), nullable=False)
    confidence = Column(Float, nullable=False)
    svg_path = Column(String(500), nullable=True)
    properties = Column(JSON, nullable=True)
    created_at = Column(
        DateTime,
        nullable=False,
        default=lambda: datetime.now(timezone.utc)
    )

    # Relationships
    page = relationship("Page", back_populates="shapes")
