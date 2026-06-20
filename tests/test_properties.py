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
    
    orig_upload = settings.UPLOAD_DIR
    orig_pages = settings.PAGES_DIR
    orig_shapes = settings.SHAPES_DIR
    
    settings.UPLOAD_DIR = temp_upload
    settings.PAGES_DIR = temp_pages
    settings.SHAPES_DIR = temp_shapes
    
    # Recreate test schema
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    
    yield
    
    # Clean up test directories
    settings.UPLOAD_DIR = orig_upload
    settings.PAGES_DIR = orig_pages
    settings.SHAPES_DIR = orig_shapes
    
    shutil.rmtree(temp_upload, ignore_errors=True)
    shutil.rmtree(temp_pages, ignore_errors=True)
    shutil.rmtree(temp_shapes, ignore_errors=True)

def test_properties_management_flow():
    # Setup: Create a mock shape to work with directly in DB or through upload/process/detect
    # Upload/process/detect is safer and tests full flow
    import fitz
    doc = fitz.open()
    page = doc.new_page(width=595, height=842)
    page.draw_circle((150, 150), 30, fill=(0, 0, 0), color=(0, 0, 0))
    pdf_bytes = doc.write()
    doc.close()
    
    # Upload, Process, Detect
    upload_resp = client.post("/upload-pdf", files={"file": ("prop_diagram.pdf", pdf_bytes, "application/pdf")})
    doc_id = upload_resp.json()["document_id"]
    client.post(f"/documents/{doc_id}/process")
    client.post(f"/documents/{doc_id}/detect-shapes")
    
    # Retrieve shape id from DB
    db = SessionLocal()
    shape_id = None
    try:
        shapes = db.query(Shape).all()
        assert len(shapes) > 0
        shape_id = shapes[0].id
    finally:
        db.close()
        
    # 1. Verify initially properties is empty
    detail_resp = client.get(f"/shapes/{shape_id}")
    assert detail_resp.status_code == 200
    assert detail_resp.json()["properties"] == {}
    
    # 2. Patch properties (Merge)
    patch_payload = {
        "tag": "PV-1000",
        "capacity": "5000L"
    }
    patch_resp = client.patch(f"/shapes/{shape_id}/properties", json=patch_payload)
    assert patch_resp.status_code == 200
    patch_data = patch_resp.json()
    assert patch_data["properties"]["tag"] == "PV-1000"
    assert patch_data["properties"]["capacity"] == "5000L"
    
    # 3. Patch properties again (Merge verification)
    second_patch_payload = {
        "tag": "PV-2000",  # Updates existing key
        "status": "active" # Adds new key
    }
    patch_resp2 = client.patch(f"/shapes/{shape_id}/properties", json=second_patch_payload)
    assert patch_resp2.status_code == 200
    patch_data2 = patch_resp2.json()
    assert patch_data2["properties"]["tag"] == "PV-2000"       # Updated
    assert patch_data2["properties"]["capacity"] == "5000L"  # Merged (kept)
    assert patch_data2["properties"]["status"] == "active"     # Added
    
    # 4. Put properties (Replace/Overwrite verification)
    put_payload = {
        "device": "compressor",
        "power": "250kW"
    }
    put_resp = client.put(f"/shapes/{shape_id}/properties", json=put_payload)
    assert put_resp.status_code == 200
    put_data = put_resp.json()
    assert put_data["properties"] == {
        "device": "compressor",
        "power": "250kW"
    }
    
    # 5. Retrieve details endpoint to confirm values match database
    detail_resp = client.get(f"/shapes/{shape_id}")
    assert detail_resp.status_code == 200
    assert detail_resp.json()["properties"] == {
        "device": "compressor",
        "power": "250kW"
    }

def test_invalid_shape_id():
    fake_shape_id = "00000000-0000-0000-0000-000000000000"
    
    # PATCH should return 404
    resp = client.patch(f"/shapes/{fake_shape_id}/properties", json={"tag": "test"})
    assert resp.status_code == 404
    
    # PUT should return 404
    resp = client.put(f"/shapes/{fake_shape_id}/properties", json={"tag": "test"})
    assert resp.status_code == 404
