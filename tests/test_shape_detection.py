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
from app.models.document import Document
from app.models.page import Page
from app.models.shape import Shape

# Setup the TestClient
client = TestClient(app)

@pytest.fixture(scope="module", autouse=True)
def setup_test_env():
    # Setup temporary directory overrides to isolate tests
    temp_upload = tempfile.mkdtemp()
    temp_pages = tempfile.mkdtemp()
    temp_shapes = tempfile.mkdtemp()
    
    orig_upload = settings.UPLOAD_DIR
    orig_pages = settings.PAGES_DIR
    orig_shapes = settings.SHAPES_DIR
    
    settings.UPLOAD_DIR = temp_upload
    settings.PAGES_DIR = temp_pages
    settings.SHAPES_DIR = temp_shapes
    
    # Reset database schema for testing
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    
    yield
    
    # Clean up temporary folders
    settings.UPLOAD_DIR = orig_upload
    settings.PAGES_DIR = orig_pages
    settings.SHAPES_DIR = orig_shapes
    
    shutil.rmtree(temp_upload, ignore_errors=True)
    shutil.rmtree(temp_pages, ignore_errors=True)
    shutil.rmtree(temp_shapes, ignore_errors=True)

def test_shape_detection_success_flow():
    # Generate a PDF with distinct geometric shapes using PyMuPDF to test classifications
    import fitz
    doc = fitz.open()
    page = doc.new_page(width=595, height=842)  # A4
    
    # 1. Circle (radius 30) -> should classify as a pump (circularity > 0.78, w/h >= 40)
    page.draw_circle((150, 150), 30, fill=(0, 0, 0), color=(0, 0, 0))
    
    # 2. Circle (radius 5) -> should classify as an instrument (w/h < 45)
    page.draw_circle((300, 300), 5, fill=(0, 0, 0), color=(0, 0, 0))
    
    # 3. Horizontal rectangle (150x20) -> should classify as pressure_vessel (aspect ratio > 2.2)
    page.draw_rect((50, 450, 200, 470), fill=(0, 0, 0), color=(0, 0, 0))
    
    # 4. Vertical rectangle (60x40) -> should classify as heat_exchanger (num_vertices = 4, aspect ratio 1.5)
    page.draw_rect((400, 600, 460, 640), fill=(0, 0, 0), color=(0, 0, 0))
    
    pdf_bytes = doc.write()
    doc.close()
    
    # 1. Upload PDF
    upload_resp = client.post(
        "/upload-pdf",
        files={"file": ("diagram_shapes.pdf", pdf_bytes, "application/pdf")}
    )
    assert upload_resp.status_code == 201
    doc_id = upload_resp.json()["document_id"]
    
    # 2. Process PDF to page image
    process_resp = client.post(f"/documents/{doc_id}/process")
    assert process_resp.status_code == 200
    
    # 3. Detect and classify shapes
    detect_resp = client.post(f"/documents/{doc_id}/detect-shapes")
    assert detect_resp.status_code == 200
    detect_data = detect_resp.json()
    assert detect_data["document_id"] == doc_id
    assert detect_data["status"] == "success"
    # Expected: 4 distinct shapes matching our criteria
    assert detect_data["shapes_detected"] >= 4
    
    # 4. Verify shape files are saved on disk
    shapes_dir = Path(settings.SHAPES_DIR) / doc_id
    assert shapes_dir.exists(), "Shapes base directory was not created"
    
    # At least 4 shape PNG files should be stored on disk
    shape_files = list(shapes_dir.glob("shape_*.png"))
    assert len(shape_files) >= 4, f"Expected >= 4 shape files, found {len(shape_files)}"
    
    # 5. Verify database records are created
    db = SessionLocal()
    try:
        # Retrieve all shape records
        db_shapes = db.query(Shape).order_by(Shape.shape_number.asc()).all()
        assert len(db_shapes) >= 4
        
        # Verify classification types exist in DB entries
        shape_types = [s.shape_type for s in db_shapes]
        assert "pump" in shape_types
        assert "instrument" in shape_types
        assert "pressure_vessel" in shape_types
        assert "heat_exchanger" in shape_types
        
        # Test shape id retrieval
        sample_shape_id = db_shapes[0].id
    finally:
        db.close()
        
    # 6. Retrieve pages list endpoint
    list_resp = client.get(f"/documents/{doc_id}/shapes")
    assert list_resp.status_code == 200
    shapes_list = list_resp.json()
    assert len(shapes_list) >= 4
    assert "shape_id" in shapes_list[0]
    assert "shape_number" in shapes_list[0]
    assert "shape_type" in shapes_list[0]
    assert "confidence" in shapes_list[0]
    assert "image_path" in shapes_list[0]
    
    # 7. Get specific shape by ID endpoint
    detail_resp = client.get(f"/shapes/{sample_shape_id}")
    assert detail_resp.status_code == 200
    detail_data = detail_resp.json()
    assert detail_data["shape_id"] == sample_shape_id
    assert "bbox" in detail_data
    assert "x" in detail_data["bbox"]
    assert "y" in detail_data["bbox"]
    assert "width" in detail_data["bbox"]
    assert "height" in detail_data["bbox"]

def test_empty_page_handling():
    # Create an empty A4 PDF page
    import fitz
    doc = fitz.open()
    doc.new_page(width=595, height=842)
    pdf_bytes = doc.write()
    doc.close()
    
    # 1. Upload
    upload_resp = client.post(
        "/upload-pdf",
        files={"file": ("empty_sheet.pdf", pdf_bytes, "application/pdf")}
    )
    doc_id = upload_resp.json()["document_id"]
    
    # 2. Process
    client.post(f"/documents/{doc_id}/process")
    
    # 3. Detect shapes (should find 0 shapes on an empty canvas)
    detect_resp = client.post(f"/documents/{doc_id}/detect-shapes")
    assert detect_resp.status_code == 200
    assert detect_resp.json()["shapes_detected"] == 0
    
    # List shapes should be empty
    list_resp = client.get(f"/documents/{doc_id}/shapes")
    assert list_resp.status_code == 200
    assert len(list_resp.json()) == 0

def test_invalid_document_id():
    fake_id = "00000000-0000-0000-0000-000000000000"
    
    # Should get 404
    detect_resp = client.post(f"/documents/{fake_id}/detect-shapes")
    assert detect_resp.status_code == 404
    
    list_resp = client.get(f"/documents/{fake_id}/shapes")
    assert list_resp.status_code == 404
    
    detail_resp = client.get(f"/shapes/{fake_id}")
    assert detail_resp.status_code == 404
