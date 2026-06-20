# PROJECT_WALKTHROUGH.md — ShapeForge AI

## Complete Development Walkthrough: PDF2EditableSymbols

This document provides a comprehensive walkthrough of how each phase of the ShapeForge AI project was designed, implemented, and tested.

---

## Phase 1 — PDF Upload Engine

### Objective
Build a production-grade file upload system capable of accepting PDF files, validating them, persisting them to disk, and recording metadata to a relational database.

### Implementation

**`app/services/document_service.py`**
- Accepts FastAPI `UploadFile` objects via multipart POST
- Validates MIME type (`application/pdf`) and `.pdf` extension
- Generates a UUID-based `document_id` for collision-free storage
- Saves the file at `uploads/{document_id}.pdf`
- Creates a `Document` ORM record and commits to SQLite

**`app/models/document.py`**
- SQLAlchemy `Document` model with UUID primary key, filename, file_path, and uploaded_at timestamp
- Auto-generated `id` using Python's `uuid.uuid4()`

**`app/schemas/document.py`**
- `UploadResponse` Pydantic schema: `{ document_id, filename, message }`
- `DocumentResponse` schema for list endpoints

### Technologies
- **FastAPI** — `UploadFile`, `File(...)` for multipart handling
- **SQLAlchemy 2.0** — ORM with `Session.add()` + `commit()`
- **Python `uuid`** — UUID4 document identity
- **`python-multipart`** — FastAPI multipart form parser

### Output
```
POST /upload-pdf → 201 Created
{
  "document_id": "93a30c13-695e-47ad-b696-4dc0d4e3e3a6",
  "filename": "Code Breaker.pdf",
  "message": "PDF uploaded successfully"
}
```

---

## Phase 2 — PDF Processing Engine (PDF → PNG)

### Objective
Convert every page of an uploaded PDF document into a high-resolution PNG image, making them accessible for computer vision processing.

### Implementation

**`app/services/pdf_processor.py`**
- Queries the `Document` record to get the file path
- Opens the PDF using `fitz.open()` (PyMuPDF)
- Iterates over all pages: `for page_num in range(doc.page_count)`
- Applies a `fitz.Matrix(2.0, 2.0)` transformation matrix (2× scale = ~150 DPI equivalent)
- Renders each page with `page.get_pixmap(matrix=mat)`
- Saves to `pages/{document_id}/page_{n}.png`
- Creates a `Page` ORM record per page with width, height, and image_path

### Technologies
- **PyMuPDF (`fitz`)** — Native PDF rendering engine
- **Matrix transformation** — 2.0× scale for high-resolution output
- **Pillow** — Image handling and validation

### Output
```
POST /documents/{id}/process → 200 OK
{
  "document_id": "...",
  "pages_processed": 1,
  "status": "success"
}

# Files created:
pages/93a30c13.../page_1.png   (3508 × 4961 px for A4 @ 2× scale)
```

---

## Phase 3 — Shape Detection Engine

### Objective
Locate all symbol contours within page images using OpenCV computer vision, crop each shape, and persist bounding box metadata.

### Implementation

**`app/services/shape_detector.py`**

**Step A — Load image:**
```python
image = cv2.imread(str(page_img_path))
```

**Step B — Grayscale conversion:**
```python
gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
```

**Step C — Binary thresholding:**
```python
_, thresh = cv2.threshold(gray, 200, 255, cv2.THRESH_BINARY_INV)
```
Inverts the image so black diagram lines become white foreground (OpenCV convention).

**Step D — Morphological cleaning:**
```python
kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
cleaned = cv2.morphologyEx(thresh, cv2.MORPH_CLOSE, kernel)
```
Closes small gaps in line segments, preventing fragmented contours.

**Step E — Contour detection:**
```python
contours, _ = cv2.findContours(cleaned, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_SIMPLE)
```

> **Critical insight**: `RETR_CCOMP` (2-level hierarchy) is used instead of `RETR_EXTERNAL`. Engineering diagrams often have a surrounding border frame. `RETR_EXTERNAL` returns only the frame as one contour (0 shapes detected). `RETR_CCOMP` retrieves inner symbol contours correctly.

**Step F — Area filtering:**
```python
if settings.MIN_CONTOUR_AREA <= area <= settings.MAX_CONTOUR_AREA:
```
Filters noise (too small) and page borders (too large).

**Step G — Crop and save:**
```python
x, y, w, h = cv2.boundingRect(contour)
cropped = image[y:y+h, x:x+w]
cv2.imwrite(str(shape_img_path), cropped)
```

### Technologies
- **OpenCV 4.9** — Image processing and contour analysis
- **NumPy** — Array operations on pixel data
- **`RETR_CCOMP`** — Nested contour retrieval

### Output
```
POST /documents/{id}/detect-shapes → 200 OK
{
  "shapes_detected": 159,
  "status": "success"
}

# Files created:
shapes/93a30c13.../shape_1.png
shapes/93a30c13.../shape_2.png
...
shapes/93a30c13.../shape_159.png
```

---

## Phase 4 — Shape Classification Engine

### Objective
Classify each detected shape into a geometric category (circle, rectangle, triangle, ellipse, polygon) with a confidence score, using only classical geometry — no ML required.

### Implementation

**`app/services/shape_classifier.py`**

The classifier uses OpenCV geometric algorithms:

**Circle detection:**
```python
(cx, cy), radius = cv2.minEnclosingCircle(contour)
circle_area = math.pi * radius * radius
circularity = contour_area / circle_area
# circularity > 0.80 → "circle", confidence = circularity
```

**Rectangle detection:**
```python
approx = cv2.approxPolyDP(contour, epsilon, True)
if len(approx) == 4:
    x, y, w, h = cv2.boundingRect(approx)
    aspect_ratio = w / h
    # aspect_ratio near 1.0 → "rectangle"
```

**Triangle detection:**
```python
if len(approx) == 3:
    return "triangle", confidence
```

**Fallback:**
```python
return "polygon", 0.5  # complex/irregular shape
```

### Technologies
- **`cv2.approxPolyDP`** — Ramer-Douglas-Peucker polygon approximation
- **`cv2.minEnclosingCircle`** — Minimum enclosing circle for circularity
- **`cv2.boundingRect`** — Bounding rectangle for aspect ratio analysis

### Output
Each shape record includes:
```json
{
  "shape_type": "circle",
  "confidence": 0.94
}
```

---

## Phase 5 — SVG Generation Engine

### Objective
Transform cropped shape PNG images back into editable vector SVG files by tracing contour points and writing normalized SVG path data.

### Implementation

**`app/services/svg_generator.py`**

For each shape with a stored `image_path`:

1. Re-load the cropped PNG: `cv2.imread(shape_crop_path)`
2. Re-run thresholding + contour detection on the crop
3. Select the largest contour (primary symbol)
4. Normalize coordinates to shape-relative space:
   ```python
   norm_x = (point[0][0] / shape_width) * svg_width
   norm_y = (point[0][1] / shape_height) * svg_height
   ```
5. Build SVG path data with `svgwrite`:
   ```python
   dwg = svgwrite.Drawing(svg_path, size=(width, height))
   path_data = "M " + " L ".join([f"{x},{y}" for x, y in points]) + " Z"
   dwg.add(dwg.path(d=path_data, fill="none", stroke="black"))
   dwg.save()
   ```
6. Update `Shape.svg_path` in database

### Technologies
- **svgwrite** — Python SVG document creation library
- **OpenCV** — Re-thresholding on crop for clean contour
- **W3C SVG path** — `M`, `L`, `Z` commands for polygon paths

### Output
```
POST /documents/{id}/generate-svg → 200 OK
{
  "svg_generated": 159,
  "status": "success"
}

# Files created:
svgs/93a30c13.../shape_1.svg
...
svgs/93a30c13.../shape_159.svg
```

---

## Phase 6 — Custom Properties Engine

### Objective
Allow any shape to be tagged with arbitrary custom JSON properties — tag numbers, manufacturer data, material specs, pressure ratings — enabling true "editable symbol" semantics.

### Implementation

**`app/services/property_service.py`**

Two operations are supported:

**Merge (PATCH):**
```python
existing = shape.properties or {}
existing.update(new_properties)
shape.properties = existing
db.commit()
```

**Replace (PUT):**
```python
shape.properties = new_properties
db.commit()
```

**`app/schemas/shape.py` — `ShapePropertyUpdate`:**
```python
class ShapePropertyUpdate(BaseModel):
    model_config = ConfigDict(extra="allow")
    # Accepts any JSON key-value pairs via extra="allow"
```

The `extra="allow"` Pydantic configuration enables free-form property schemas without predefined fields — critical for the open-ended metadata use case.

### Technologies
- **SQLAlchemy JSON column** — Native JSON storage in SQLite
- **Pydantic `extra="allow"`** — Schema-less property validation
- **`PATCH` vs `PUT`** — HTTP semantics: merge vs replace

### Output
```bash
PATCH /shapes/{id}/properties
{
  "tag_number": "P-101",
  "manufacturer": "Flowserve",
  "material": "SS316"
}

→ 200 OK with updated ShapeResponse including properties
```

---

## Phase 7 — React Dashboard

### Objective
Build a modern, intuitive web dashboard enabling non-technical users to upload PDFs, run the pipeline step-by-step, browse detected symbols, inspect SVGs, and tag shapes with custom metadata.

### Implementation

**Dashboard.tsx**
- `UploadCard`: Drag-and-drop area using HTML5 File API + `FormData` multipart POST
- `DocumentList`: React Query-powered list of all documents with status badges

**DocumentDetail.tsx**
- Three-step pipeline control panel with visual status tracking
- `hasPages` / `hasShapes` state computed from React Query cache
- Disabled states prevent out-of-order pipeline execution
- Success/error notifications with appropriate color coding
- Page preview grid showing extracted PNG thumbnails

**ShapeDetail.tsx**
- `SVGViewer`: Fetches and renders the SVG inline using `dangerouslySetInnerHTML` with zoom/pan controls
- `PropertyEditor`: Form with dynamic add/remove property rows, saves via `PATCH` API call

### Technologies
- **React 18** + **TypeScript** — Component model + type safety
- **Vite** — Fast development server with HMR
- **TanStack Query (React Query)** — Server state caching and refetch
- **Tailwind CSS** — Utility-first responsive design
- **Axios** — HTTP client with 120s timeout for long operations
- **React Router v6** — Client-side routing

### Output
Complete interactive web application at `http://localhost:5173` with:
- Dashboard with document library
- Document workspace with pipeline controls
- Shape gallery with SVG viewer
- Property editor with live persistence
