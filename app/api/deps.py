from typing import Generator
from sqlalchemy.orm import Session
from app.database.session import SessionLocal

def get_db() -> Generator[Session, None, None]:
    """
    Dependency generator to yield database sessions for each request
    and close them when the request finishes.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
