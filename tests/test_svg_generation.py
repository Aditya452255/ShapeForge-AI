import os
import sys
import tempfile
import shutil
from pathlib import Path
import pytest
from fastapi.testclient import TestClient

# Add project root to Python path
project_root = Path("c:/Users/hp/Desktop/project/ShapeForge-AI").resolve()
sys.path.insert(0, str(project_root))

from app.main import app
from app.core.config import settings
from app.database.session import Base, engine, SessionLocal
from app.models.shape import Shape

# Setup TestClient
client = TestClient(app)

@pytest.fixture(scope="module", autouse=True)
def setup_test_env():
    # Setup temporary isolated folders for testing
    temp_upload = tempfile.mkdtemp()
    temp_pages = tempfile.mkdtemp()
    temp_shapes = tempfile.mkdtemp()
    temp_svgs = tempfile.mkdtemp()
    
    orig_upload = settings.UPLOAD_DIR
    orig_pages = settings.PAGES_DIR
    orig_shapes = settings.SHAPES_DIR
    orig_svgs = settings.SVG_DIR
    
    settings.UPLOAD_DIR = temp_upload
    settings.PAGES_DIR = temp_pages
    settings.SHAPES_DIR = temp_shapes
    settings.SVG_DIR = temp_svgs
    
    # Recreate test schema
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    
    yield
    
    # Clean up test directories
    settings.UPLOAD_DIR = orig_upload
    settings.PAGES_DIR = orig_pages
    settings.SHAPES_DIR = orig_shapes
    settings.SVG_DIR = orig_svgs
    
    shutil.rmtree(temp_upload, ignore_errors=True)
    shutil.rmtree(temp_pages, ignore_errors=True)
    shutil.rmtree(temp_shapes, ignore_errors=True)
    shutil.rmtree(temp_svgs, ignore_errors=True)

def test_svg_generation_flow():
    # Generate a simple 1-page PDF using PyMuPDF containing a filled circle
    import fitz
    doc = fitz.open()
    page = doc.new_page(width=595, height=842)
    # Circle -> pump or instrument (area > 500)
    page.draw_circle((150, 150), 30, fill=(0, 0, 0), color=(0, 0, 0))
    pdf_bytes = doc.write()
    doc.close()
    
    # 1. Upload
    upload_resp = client.post(
        "/upload-pdf",
        files={"file": ("svg_diagram.pdf", pdf_bytes, "application/pdf")}
    )
    assert upload_resp.status_code == 201
    doc_id = upload_resp.json()["document_id"]
    
    # 2. Process
    process_resp = client.post(f"/documents/{doc_id}/process")
    assert process_resp.status_code == 200
    
    # 3. Detect shapes
    detect_resp = client.post(f"/documents/{doc_id}/detect-shapes")
    assert detect_resp.status_code == 200
    assert detect_resp.json()["shapes_detected"] > 0
    
    # 4. Generate SVG
    svg_resp = client.post(f"/documents/{doc_id}/generate-svg")
    assert svg_resp.status_code == 200
    svg_data = svg_resp.json()
    assert svg_data["document_id"] == doc_id
    assert svg_data["svg_generated"] > 0
    assert svg_data["status"] == "success"
    
    # 5. Verify SVG files exist on disk
    svgs_dir = Path(settings.SVG_DIR) / doc_id
    assert svgs_dir.exists(), "SVG folder was not created"
    
    svg_files = list(svgs_dir.glob("shape_*.svg"))
    assert len(svg_files) > 0, "No SVG files generated on disk"
    
    # 6. Verify SVG content is valid XML and contains path instructions
    for svg_file in svg_files:
        with open(svg_file, "r") as f:
            content = f.read()
            assert "<svg" in content
            assert "</svg>" in content
            assert '<path d="' in content or '<rect ' in content
            
    # 7. Verify SVG path stored in DB
    db = SessionLocal()
    try:
        db_shapes = db.query(Shape).all()
        assert len(db_shapes) > 0
        for shape in db_shapes:
            assert shape.svg_path == f"svgs/{doc_id}/shape_{shape.shape_number}.svg"
            
            # Verify details endpoint returns the SVG path
            detail_resp = client.get(f"/shapes/{shape.id}")
            assert detail_resp.status_code == 200
            assert detail_resp.json()["svg_path"] == f"svgs/{doc_id}/shape_{shape.shape_number}.svg"
    finally:
        db.close()
