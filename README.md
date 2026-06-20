# PDF2EditableSymbols - Phase 1

PDF2EditableSymbols is a production-grade backend system designed to accept PDF uploads of engineering diagrams, extract symbols/shapes from them, and eventually convert them into editable objects with custom properties.

This repository implements **Phase 1: Project Setup + PDF Upload Service**.

## Technology Stack

- **Python**: 3.12+
- **Framework**: FastAPI (for building REST APIs)
- **ASGI Server**: Uvicorn (for running the application)
- **Validation**: Pydantic v2 (for robust data schema validation)
- **ORM**: SQLAlchemy (for database operations)
- **Database**: SQLite (local single-file database)
- **File Upload Handler**: Python Multipart

---

## Directory Structure

```text
project/
├── app/
│   ├── api/
│   │   ├── deps.py          # Dependency injection (e.g. database sessions)
│   │   └── endpoints.py     # Router definitions for endpoints
│   ├── core/
│   │   ├── config.py        # Pydantic v2 BaseSettings configuration
│   │   └── logging.py       # Custom logging initialization
│   ├── database/
│   │   └── session.py       # SQLAlchemy setup (engine and sessionmaker)
│   ├── models/
│   │   └── document.py      # SQLAlchemy model representing the Database Schema
│   ├── schemas/
│   │   └── document.py      # Pydantic validation schemas
│   ├── services/
│   │   └── document_service.py # Core business logic (file saving & DB inserts)
│   └── main.py              # Application startup, lifespan, CORS & error handling
│
├── uploads/                 # Directory where uploaded PDF documents are stored
│
├── .env                     # Configuration file for environment variables
├── requirements.txt         # Project dependencies list
└── README.md                # Project documentation and run instructions
```

---

## Installation & Setup

Follow these steps to set up and run the project locally on Windows:

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

## API Documentation

### 1. Upload PDF
- **Endpoint**: `POST /upload-pdf`
- **Content-Type**: `multipart/form-data`
- **Request Body**:
  - `file`: PDF file stream
- **Validation**: Accepts only files ending in `.pdf` and with the MIME type `application/pdf`.
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
