# PDF2EditableSymbols - Phase 3 & 4 (Shape Detection & Classification)

PDF2EditableSymbols is a production-grade backend system designed to accept PDF uploads of engineering diagrams, extract symbols/shapes from them, and convert them into editable objects with custom properties.

This repository implements:
- **Phase 3: Shape Detection Engine** (extracting symbols using OpenCV contours)
- **Phase 4: Shape Classification Engine** (assigning categories via rule-based geometry heuristics)

---

## Technology Stack

- **Python**: 3.12+
- **Framework**: FastAPI (for building REST APIs)
- **ASGI Server**: Uvicorn (for running the application)
- **Validation**: Pydantic v2 (for robust data schema validation)
- **ORM**: SQLAlchemy (for database operations)
- **Database**: SQLite (local single-file database)
- **PDF Renderer**: PyMuPDF (`fitz` for high-resolution PNG page extraction)
- **Computer Vision**: OpenCV (`cv2`) & NumPy (for contour detection and image cropping)
- **Image handling**: Pillow (`PIL`)
- **File Upload Handler**: Python Multipart
- **Testing**: pytest (for integration test automation)

---

## Directory Structure

```text
project/
├── app/
│   ├── api/
│   │   ├── deps.py             # Dependency injection (e.g. database sessions)
│   │   └── endpoints.py        # Router definitions (Upload, List, Process, Pages, Detect, Shapes)
│   ├── core/
│   │   ├── config.py           # Pydantic v2 BaseSettings configuration
│   │   └── logging.py          # Custom logging initialization
│   ├── database/
│   │   └── session.py          # SQLAlchemy setup (engine and sessionmaker)
│   ├── models/
│   │   ├── document.py         # Document model with cascading pages
│   │   ├── page.py             # Page model with cascading shapes
│   │   └── shape.py            # Shape model storing cropped dimensions and classes
│   ├── schemas/
│   │   ├── document.py         # Pydantic schemas for documents
│   │   ├── page.py             # Pydantic schemas for pages
│   │   └── shape.py            # Pydantic schemas for shapes & bbox nested structures
│   ├── services/
│   │   ├── document_service.py # Business logic (file saving & DB inserts)
│   │   ├── pdf_processor.py    # PyMuPDF processing pipeline (PDF to PNG conversions)
│   │   ├── shape_detector.py   # OpenCV shape segmentation pipeline
│   │   └── shape_classifier.py # Rule-based geometric shape classifier
│   └── main.py                 # Startup hooks, lifespan, CORS, and error handling
│
├── uploads/                    # Folder containing uploaded PDF documents
├── pages/                      # Folder containing processed page images
├── shapes/                     # Folder containing cropped symbol PNG images
├── tests/
│   ├── test_pdf_processing.py  # Automated integration test suite for PDF rendering
│   └── test_shape_detection.py # Automated integration test suite for shape detection
│
├── .env                        # Configuration file for environment variables
├── requirements.txt            # Project dependencies list
└── README.md                   # Project documentation and run instructions
```

---

## Installation & Setup

Follow these steps to set up and run the project locally:

### 1. Clone or Open the Workspace
Ensure you are operating in the root directory: `c:\Users\hp\Desktop\project\ShapeForge-AI`.

### 2. Create a Virtual Environment
Run the following command in PowerShell:
```powershell
python -m venv venv
```

### 3. Activate the Virtual Environment
```powershell
.\venv\Scripts\Activate.ps1
```

### 4. Install Dependencies
```powershell
pip install -r requirements.txt
```

### 5. Environment Variables
The `.env` file should have the following contents (pre-configured):
```env
PROJECT_NAME="PDF2EditableSymbols"
DATABASE_URL="sqlite:///./pdf2editable.db"
UPLOAD_DIR="uploads"
PAGES_DIR="pages"
SHAPES_DIR="shapes"
MIN_CONTOUR_AREA=500
MAX_CONTOUR_AREA=500000
LOG_LEVEL="INFO"
```

---

## Running the Application

To start the FastAPI server locally:

```powershell
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Once running, you can access:
- **Interactive Documentation (Swagger UI)**: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- **Alternative Auto-Docs (ReDoc)**: [http://127.0.0.1:8000/redoc](http://127.0.0.1:8000/redoc)
- **API Health Check**: [http://127.0.0.1:8000/](http://127.0.0.1:8000/)

---

## Running Automated Tests

To run the automated integration tests:

```powershell
# Run all tests (processing & shape detection)
.\venv\Scripts\pytest.exe -p no:logging -v
```

This tests:
1. Root health checks & file uploads validation.
2. High-resolution PNG extraction.
3. Shape segmentation using computer vision.
4. Bounding box coordinates calculation and crop saves.
5. Shape classifier assignments based on aspect ratio, circularity, and geometry.
6. Empty page handling (returns 0 shapes).
7. Invalid document ID exception handling.
8. DB transaction rollbacks on corrupted file errors.

---

## API Documentation

### 1. Upload PDF
- **Endpoint**: `POST /upload-pdf`
- **Content-Type**: `multipart/form-data`
- **Request Body**:
  - `file`: PDF file stream
- **Response Code**: `201 Created`
- **Response Body**:
```json
{
  "document_id": "835c6020-f561-4876-b605-728b12204c3d",
  "filename": "diagram.pdf",
  "message": "PDF uploaded successfully"
}
```

### 2. Get All Documents
- **Endpoint**: `GET /documents`
- **Response Code**: `200 OK`

### 3. Process PDF Document (PDF → Pages)
- **Endpoint**: `POST /documents/{document_id}/process`
- **Response Code**: `200 OK`

### 4. Retrieve Extracted Pages
- **Endpoint**: `GET /documents/{document_id}/pages`
- **Response Code**: `200 OK`

### 5. Detect and Classify Shapes (Pages → Shapes)
- **Endpoint**: `POST /documents/{document_id}/detect-shapes`
- **Response Code**: `200 OK`
- **Response Body**:
```json
{
  "document_id": "835c6020-f561-4876-b605-728b12204c3d",
  "shapes_detected": 16,
  "status": "success"
}
```

### 6. List Detected Shapes
- **Endpoint**: `GET /documents/{document_id}/shapes`
- **Response Code**: `200 OK`
- **Response Body**:
```json
[
  {
    "shape_id": "876c6020-f561-4876-b605-728b12204c3d",
    "shape_number": 1,
    "shape_type": "valve",
    "confidence": 0.80,
    "image_path": "shapes/835c6020-f561-4876-b605-728b12204c3d/shape_1.png"
  }
]
```

### 7. Get Shape Details
- **Endpoint**: `GET /shapes/{shape_id}`
- **Response Code**: `200 OK`
- **Response Body**:
```json
{
  "shape_id": "876c6020-f561-4876-b605-728b12204c3d",
  "page_id": "835c6020-f561-4876-b605-728b12204c3d",
  "shape_number": 1,
  "image_path": "shapes/835c6020-f561-4876-b605-728b12204c3d/shape_1.png",
  "bbox": {
    "x": 120,
    "y": 220,
    "width": 150,
    "height": 300
  },
  "shape_type": "valve",
  "confidence": 0.80,
  "created_at": "2026-06-20T16:38:02.482811Z"
}
```
