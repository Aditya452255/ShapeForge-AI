# PDF2EditableSymbols - Phase 2 (PDF Processing Engine)

PDF2EditableSymbols is a production-grade backend system designed to accept PDF uploads of engineering diagrams, extract symbols/shapes from them, and convert them into editable objects with custom properties.

This repository implements **Phase 2: PDF Processing Engine (PDF → High Resolution Images)**.

## Technology Stack

- **Python**: 3.12+
- **Framework**: FastAPI (for building REST APIs)
- **ASGI Server**: Uvicorn (for running the application)
- **Validation**: Pydantic v2 (for robust data schema validation)
- **ORM**: SQLAlchemy (for database operations)
- **Database**: SQLite (local single-file database)
- **PDF Renderer**: PyMuPDF (`fitz` for high-resolution PNG page extraction)
- **File Upload Handler**: Python Multipart
- **Testing**: pytest (for integration test automation)

---

## Directory Structure

```text
project/
├── app/
│   ├── api/
│   │   ├── deps.py             # Dependency injection (e.g. database sessions)
│   │   └── endpoints.py        # Router definitions (Upload, List, Process, Pages)
│   ├── core/
│   │   ├── config.py           # Pydantic v2 BaseSettings configuration
│   │   └── logging.py          # Custom logging initialization
│   ├── database/
│   │   └── session.py          # SQLAlchemy setup (engine and sessionmaker)
│   ├── models/
│   │   ├── document.py         # Document model with pages relationship
│   │   └── page.py             # Page model representing individual extracted pages
│   ├── schemas/
│   │   ├── document.py         # Pydantic validation schemas for documents
│   │   └── page.py             # Pydantic validation schemas for pages
│   ├── services/
│   │   ├── document_service.py # Core business logic (file saving & DB inserts)
│   │   └── pdf_processor.py    # PyMuPDF processing pipeline (PDF to PNG conversions)
│   └── main.py                 # Startup hooks, lifespan, CORS, and error handling
│
├── uploads/                    # Folder containing uploaded PDF documents
├── pages/                      # Folder containing processed page images organized by document ID
├── tests/
│   └── test_pdf_processing.py  # Automated integration test suite
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
.\venv\Scripts\pytest.exe tests/test_pdf_processing.py -v
```

This tests:
1. Root health checks.
2. File validation (extensions & MIME types).
3. Image rendering at A4 scale zoomed 3x (300 DPI quality).
4. Disk creation of PNG images.
5. SQL metadata creation & relationship cascade deletes.
6. Error handling for non-existent document IDs.
7. Graceful rollback safety when processing corrupted PDF uploads.

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
- **Response Body**:
```json
[
  {
    "id": "835c6020-f561-4876-b605-728b12204c3d",
    "filename": "diagram.pdf",
    "file_path": "uploads/835c6020-f561-4876-b605-728b12204c3d.pdf",
    "upload_timestamp": "2026-06-20T16:24:32.482811Z"
  }
]
```

### 3. Process PDF Document
- **Endpoint**: `POST /documents/{document_id}/process`
- **Response Code**: `200 OK`
- **Response Body**:
```json
{
  "document_id": "835c6020-f561-4876-b605-728b12204c3d",
  "pages_processed": 3,
  "status": "success"
}
```

### 4. Retrieve Extracted Pages
- **Endpoint**: `GET /documents/{document_id}/pages`
- **Response Code**: `200 OK`
- **Response Body**:
```json
[
  {
    "page_number": 1,
    "image_path": "pages/835c6020-f561-4876-b605-728b12204c3d/page_1.png",
    "width": 2480,
    "height": 3508
  }
]
```
