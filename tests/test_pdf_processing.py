import os
import sys
import tempfile
import shutil
from pathlib import Path
import pytest
from fastapi.testclient import TestClient

# Add project root to Python path so imports resolve correctly
project_root = Path("c:/Users/hp/Desktop/project/ShapeForge-AI").resolve()
sys.path.insert(0, str(project_root))

from app.main import app
from app.core.config import settings
from app.database.session import Base, engine, SessionLocal
from app.models.document import Document
from app.models.page import Page

# Setup the TestClient
client = TestClient(app)

@pytest.fixture(scope="module", autouse=True)
def setup_test_env():
    # Setup temporary directory overrides to keep test files separate
    temp_upload = tempfile.mkdtemp()
    temp_pages = tempfile.mkdtemp()
    
    orig_upload = settings.UPLOAD_DIR
    orig_pages = settings.PAGES_DIR
    
    settings.UPLOAD_DIR = temp_upload
    settings.PAGES_DIR = temp_pages
    
    # Reset database schema for testing
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    
    yield
    
    # Tear down temporary directories
    settings.UPLOAD_DIR = orig_upload
    settings.PAGES_DIR = orig_pages
    
    shutil.rmtree(temp_upload, ignore_errors=True)
    shutil.rmtree(temp_pages, ignore_errors=True)

def test_pdf_processing_success_flow():
    # Generate a simple 2-page PDF in-memory using PyMuPDF to test upload/process
    import fitz
    doc = fitz.open()
    doc.new_page(width=595, height=842)  # Page 1 (A4 width/height in points)
    doc.new_page(width=595, height=842)  # Page 2
    pdf_bytes = doc.write()
    doc.close()
    
    # 1. Upload PDF
    upload_resp = client.post(
        "/upload-pdf",
        files={"file": ("test_sheet.pdf", pdf_bytes, "application/pdf")}
    )
    assert upload_resp.status_code == 201
    doc_id = upload_resp.json()["document_id"]
    
    # 2. Process PDF
    process_resp = client.post(f"/documents/{doc_id}/process")
    assert process_resp.status_code == 200
    process_data = process_resp.json()
    assert process_data["document_id"] == doc_id
    assert process_data["pages_processed"] == 2
    assert process_data["status"] == "success"
    
    # 3. Verify page images exist on disk under settings.PAGES_DIR / {document_id}
    pages_dir = Path(settings.PAGES_DIR) / doc_id
    assert pages_dir.exists(), "Pages directory was not created"
    assert (pages_dir / "page_1.png").exists(), "Page 1 image not found"
    assert (pages_dir / "page_2.png").exists(), "Page 2 image not found"
    
    # 4. Verify database records created
    db = SessionLocal()
    try:
        db_pages = db.query(Page).filter(Page.document_id == doc_id).order_by(Page.page_number.asc()).all()
        assert len(db_pages) == 2
        # Verify page 1 metadata
        assert db_pages[0].page_number == 1
        assert db_pages[0].image_path == f"pages/{doc_id}/page_1.png"
        # zoomed 3x: 595 * 3 = 1785 width, 842 * 3 = 2526 height
        assert db_pages[0].width == 1785
        assert db_pages[0].height == 2526
        
        # Verify page 2 metadata
        assert db_pages[1].page_number == 2
        assert db_pages[1].image_path == f"pages/{doc_id}/page_2.png"
        assert db_pages[1].width == 1785
        assert db_pages[1].height == 2526
    finally:
        db.close()
        
    # 5. Retrieve pages endpoint
    pages_resp = client.get(f"/documents/{doc_id}/pages")
    assert pages_resp.status_code == 200
    pages_list = pages_resp.json()
    assert len(pages_list) == 2
    assert pages_list[0]["page_number"] == 1
    assert pages_list[0]["image_path"] == f"pages/{doc_id}/page_1.png"
    assert pages_list[0]["width"] == 1785
    assert pages_list[0]["height"] == 2526
    
    assert pages_list[1]["page_number"] == 2
    assert pages_list[1]["image_path"] == f"pages/{doc_id}/page_2.png"

def test_invalid_document_id():
    # 6. Invalid document ID handling
    fake_id = "00000000-0000-0000-0000-000000000000"
    process_resp = client.post(f"/documents/{fake_id}/process")
    assert process_resp.status_code == 404
    
    pages_resp = client.get(f"/documents/{fake_id}/pages")
    assert pages_resp.status_code == 404

def test_corrupted_pdf_handling():
    # 7. Corrupted PDF handling
    db = SessionLocal()
    corrupt_id = "e0dbad00-a000-4b2b-967c-d38a1ef0ef00"
    
    # Write a corrupted text file as if it were an uploaded PDF
    upload_dir = Path(settings.UPLOAD_DIR)
    upload_dir.mkdir(parents=True, exist_ok=True)
    file_path = upload_dir / f"{corrupt_id}.pdf"
    with open(file_path, "wb") as f:
        f.write(b"NOT A REAL PDF FILE HEADER OR BODY")
        
    db_doc = Document(
        id=corrupt_id,
        filename="bad_sheet.pdf",
        file_path=str(file_path)
    )
    db.add(db_doc)
    db.commit()
    db.close()
    
    # Process corrupted PDF (should fail with HTTP 400 Bad Request)
    process_resp = client.post(f"/documents/{corrupt_id}/process")
    assert process_resp.status_code == 400
    assert "Failed to parse PDF file" in process_resp.json()["detail"]
    
    # Verify no page images or database records were persisted
    pages_dir = Path(settings.PAGES_DIR) / corrupt_id
    assert not pages_dir.exists(), "Corrupted document pages directory should not exist"
    
    db = SessionLocal()
    try:
        db_pages = db.query(Page).filter(Page.document_id == corrupt_id).all()
        assert len(db_pages) == 0, "No Page metadata should be saved in DB for corrupted PDFs"
    finally:
        db.close()
