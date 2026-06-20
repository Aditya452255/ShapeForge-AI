# PDF2EditableSymbols - Phase 5 & 6 (SVG Generation & Properties Engine)

PDF2EditableSymbols is a production-grade backend system designed to accept PDF uploads of engineering diagrams, extract symbols/shapes from them, and convert them into editable objects with custom properties.

This repository implements:
- **Phase 5: Editable Symbol Generation** (saving shape contours as editable vector SVGs)
- **Phase 6: Custom Properties Engine** (binding dynamic custom JSON metadata to shapes)

---

## Technology Stack

- **Python**: 3.12+
- **Framework**: FastAPI (for building REST APIs)
- **ASGI Server**: Uvicorn (for running the application)
- **Validation**: Pydantic v2 (for robust data schema validation)
- **ORM**: SQLAlchemy (for database operations)
- **Database**: SQLite (local single-file database with native JSON support)
- **PDF Renderer**: PyMuPDF (`fitz` for high-resolution PNG page extraction)
- **Computer Vision**: OpenCV (`cv2`) & NumPy (for contour detection and image cropping)
- **Vector Graphics**: `svgwrite` (for generating editable vector paths)
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
│   │   └── endpoints.py        # Router definitions (Upload, List, Process, Pages, Detect, SVG, Properties)
│   ├── core/
│   │   ├── config.py           # Pydantic v2 BaseSettings configuration
│   │   └── logging.py          # Custom logging initialization
│   ├── database/
│   │   └── session.py          # SQLAlchemy setup (engine and sessionmaker)
│   ├── models/
│   │   ├── document.py         # Document model with cascading pages
│   │   ├── page.py             # Page model with cascading shapes
│   │   └── shape.py            # Shape model storing cropped dimensions, classes, SVGs, and JSON properties
│   ├── schemas/
│   │   ├── document.py         # Pydantic schemas for documents
│   │   ├── page.py             # Pydantic schemas for pages
│   │   └── shape.py            # Pydantic schemas for shapes, bbox, and properties updates
│   ├── services/
│   │   ├── document_service.py # Business logic (file saving & DB inserts)
│   │   ├── pdf_processor.py    # PyMuPDF processing pipeline (PDF to PNG conversions)
│   │   ├── shape_detector.py   # OpenCV shape segmentation pipeline
│   │   ├── shape_classifier.py # Rule-based geometric shape classifier
│   │   ├── svg_generator.py    # SVG rendering engine (contours to vector paths)
│   │   └── property_service.py # Properties manager (merges and overwrites custom attributes)
│   └── main.py                 # Startup hooks, lifespan, CORS, and error handling
│
├── uploads/                    # Folder containing uploaded PDF documents
├── pages/                      # Folder containing processed page images
├── shapes/                     # Folder containing cropped symbol PNG images
├── svgs/                       # Folder containing editable vector SVG files
├── tests/
│   ├── test_pdf_processing.py  # Automated integration test suite for PDF rendering
│   ├── test_shape_detection.py # Automated integration test suite for shape detection
│   ├── test_svg_generation.py  # Automated integration test suite for SVG creation
│   └── test_properties.py      # Automated integration test suite for properties management
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
SVG_DIR="svgs"
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
# Run the complete test suite (all phases)
.\venv\Scripts\pytest.exe -p no:logging -v
```

This tests:
1. Root health checks & file uploads validation.
2. High-resolution PNG extraction.
3. Shape segmentation using computer vision.
4. Bounding box coordinates calculation and crop saves.
5. Shape classifier assignments.
6. SVG vector conversion (traces contour arrays to valid SVG path files).
7. Custom properties merging (PATCH) and overwriting (PUT).
8. Schema outputs validation including nested `bbox` configurations.
9. Empty page handling (returns 0 shapes).
10. DB transaction rollbacks on corrupted file errors.

---

## API Documentation

### 1. Upload PDF
- **Endpoint**: `POST /upload-pdf`
- **Content-Type**: `multipart/form-data`
- **Request Body**:
  - `file`: PDF file stream
- **Response Code**: `201 Created`

### 2. Process PDF Document (PDF → Pages)
- **Endpoint**: `POST /documents/{document_id}/process`
- **Response Code**: `200 OK`

### 3. Detect and Classify Shapes (Pages → Shapes)
- **Endpoint**: `POST /documents/{document_id}/detect-shapes`
- **Response Code**: `200 OK`

### 4. List Detected Shapes
- **Endpoint**: `GET /documents/{document_id}/shapes`
- **Response Code**: `200 OK`

### 5. Generate Editable SVGs
- **Endpoint**: `POST /documents/{document_id}/generate-svg`
- **Response Code**: `200 OK`
- **Response Body**:
```json
{
  "document_id": "835c6020-f561-4876-b605-728b12204c3d",
  "svg_generated": 4,
  "status": "success"
}
```

### 6. Get Shape Details (Includes SVG & custom properties)
- **Endpoint**: `GET /shapes/{shape_id}`
- **Response Code**: `200 OK`
- **Response Body**:
```json
{
  "shape_id": "876c6020-f561-4876-b605-728b12204c3d",
  "page_id": "835c6020-f561-4876-b605-728b12204c3d",
  "shape_number": 1,
  "image_path": "shapes/835c6020-f561-4876-b605-728b12204c3d/shape_1.png",
  "svg_path": "svgs/835c6020-f561-4876-b605-728b12204c3d/shape_1.svg",
  "bbox": {
    "x": 120,
    "y": 220,
    "width": 150,
    "height": 300
  },
  "shape_type": "valve",
  "confidence": 0.80,
  "properties": {
    "tag": "XV-200",
    "line_number": "L-101"
  },
  "created_at": "2026-06-20T16:38:02.482811Z"
}
```

### 7. Merge Custom Properties
- **Endpoint**: `PATCH /shapes/{shape_id}/properties`
- **Request Body**:
```json
{
  "tag": "XV-200",
  "line_number": "L-101"
}
```
- **Response Code**: `200 OK`
- **Response Body**:
```json
{
  "shape_id": "876c6020-f561-4876-b605-728b12204c3d",
  "page_id": "835c6020-f561-4876-b605-728b12204c3d",
  "shape_number": 1,
  "image_path": "shapes/835c6020-f561-4876-b605-728b12204c3d/shape_1.png",
  "svg_path": "svgs/835c6020-f561-4876-b605-728b12204c3d/shape_1.svg",
  "bbox": {
    "x": 120,
    "y": 220,
    "width": 150,
    "height": 300
  },
  "shape_type": "valve",
  "confidence": 0.80,
  "properties": {
    "tag": "XV-200",
    "line_number": "L-101"
  },
  "created_at": "2026-06-20T16:38:02.482811Z"
}
```

### 8. Overwrite/Replace Properties
- **Endpoint**: `PUT /shapes/{shape_id}/properties`
- **Request Body**:
```json
{
  "device": "compressor",
  "power": "250kW"
}
```
- **Response Code**: `200 OK`
- **Response Body**: (contains the updated properties dict, replacing old ones)
```json
{
  "shape_id": "876c6020-f561-4876-b605-728b12204c3d",
  "page_id": "835c6020-f561-4876-b605-728b12204c3d",
  "shape_number": 1,
  "image_path": "shapes/835c6020-f561-4876-b605-728b12204c3d/shape_1.png",
  "svg_path": "svgs/835c6020-f561-4876-b605-728b12204c3d/shape_1.svg",
  "bbox": {
    "x": 120,
    "y": 220,
    "width": 150,
    "height": 300
  },
  "shape_type": "valve",
  "confidence": 0.80,
  "properties": {
    "device": "compressor",
    "power": "250kW"
  },
  "created_at": "2026-06-20T16:38:02.482811Z"
}
```
