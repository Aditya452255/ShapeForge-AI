import os
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

    PROJECT_NAME: str = "PDF2EditableSymbols"
    DATABASE_URL: str = "sqlite:///./pdf2editable.db"
    UPLOAD_DIR: str = "uploads"
    PAGES_DIR: str = "pages"
    SHAPES_DIR: str = "shapes"
    SVG_DIR: str = "svgs"
    MIN_CONTOUR_AREA: int = 500
    MAX_CONTOUR_AREA: int = 500000
    LOG_LEVEL: str = "INFO"

    @property
    def upload_path(self) -> Path:
        # Resolve path relative to the project root
        return Path(self.UPLOAD_DIR).resolve()

    @property
    def pages_path(self) -> Path:
        # Resolve path relative to the project root
        return Path(self.PAGES_DIR).resolve()

    @property
    def shapes_path(self) -> Path:
        # Resolve path relative to the project root
        return Path(self.SHAPES_DIR).resolve()

    @property
    def svgs_path(self) -> Path:
        # Resolve path relative to the project root
        return Path(self.SVG_DIR).resolve()

settings = Settings()
