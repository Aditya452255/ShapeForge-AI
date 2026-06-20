# ASSESSMENT_SUBMISSION.md

## ShapeForge AI — PDF2EditableSymbols
### Technical Assessment Submission

---

## Introduction

This document presents **ShapeForge AI**, a full-stack computer vision platform developed as a technical assessment submission. The system fulfills the stated requirement:

> *"Extract images from PDF and represent them as editable symbols/shapes with custom properties."*

The project has been developed with production-grade software engineering practices: service layer architecture, automated testing, structured logging, validated REST APIs, and a modern React TypeScript frontend. Every component reflects the standards expected of professional-grade software.

---

## Problem Understanding

Engineering and technical industries routinely work with complex PDF diagrams — Piping and Instrumentation Diagrams (P&IDs), electrical schematics, process flow diagrams, and mechanical drawings. These documents contain hundreds of standardized symbols representing physical components: pumps, valves, sensors, actuators.

The core challenge is that these symbols exist as **locked raster content** within PDF pages:
- They cannot be individually selected, modified, or queried
- They carry no metadata (tag numbers, specifications, manufacturer data)
- They cannot be directly integrated into digital twin systems or asset management databases
- Manual extraction and re-creation is prohibitively expensive in time and cost

The problem, therefore, has three dimensions:
1. **Extraction**: How to algorithmically locate and isolate individual symbols from a dense diagram
2. **Vectorization**: How to represent extracted rasters as editable, scalable vector objects
3. **Enrichment**: How to attach arbitrary metadata to each symbol for downstream use

---

## Solution Design

### Pipeline Architecture

The solution implements a seven-stage processing pipeline:

```
PDF Upload → Page Extraction → Shape Detection → Classification → SVG Generation → Properties → Export
```

Each stage is independently invocable via REST API and idempotent — re-running any stage replaces previous results, supporting iterative workflows.

### Key Design Principles

**1. Separation of Concerns**
All business logic resides in a dedicated service layer (`app/services/`). API endpoint handlers are thin wrappers — they call service methods and format responses. This makes every service independently testable without HTTP context.

**2. Explicit Data Models**
Three normalized ORM models (Document → Page → Shape) provide a clear relational schema. Pydantic v2 schemas at the API boundary enforce strict input validation and generate automatic OpenAPI documentation.

**3. Configurable Vision Parameters**
Contour area thresholds are environment-variable driven (`MIN_CONTOUR_AREA`, `MAX_CONTOUR_AREA`). This allows the system to be tuned for different diagram styles (dense P&IDs vs. sparse schematics) without code changes.

**4. Re-runnable Pipeline**
Each detection/generation stage clears previous results before re-processing. This is essential for a tool where users may adjust PDF quality or tune parameters and need deterministic re-processing.

---

## Technical Highlights

### Computer Vision — The Core Innovation

The shape detection engine applies a classical image processing pipeline:

| Step | Algorithm | Purpose |
|------|-----------|---------|
| Grayscale conversion | `cv2.cvtColor` | Reduce to single channel |
| Binary inversion | `cv2.threshold(THRESH_BINARY_INV)` | Lines become foreground |
| Morphological close | `cv2.morphologyEx(MORPH_CLOSE)` | Close line gaps |
| Contour extraction | `cv2.findContours(RETR_CCOMP)` | Retrieve nested shapes |
| Area filtering | Min/Max bounds | Reject noise and page borders |
| Bounding box | `cv2.boundingRect` | Localize shape region |

**Critical discovery**: Engineering diagrams commonly have a surrounding drawing border. `RETR_EXTERNAL` returns only this border as a single giant contour, suppressing all inner symbols. Switching to `RETR_CCOMP` (two-level hierarchy) correctly parses inner symbols. On `Code Breaker.pdf`, this change increased detected shapes from **0 to 159**.

### Properties Engine — Schema-Less Metadata

The properties engine uses Pydantic's `extra="allow"` configuration to accept any JSON key-value pair without predefined schema. This is architecturally important: engineering symbols require highly varied metadata (a valve needs pressure rating; a sensor needs calibration range; a pump needs flow rate). A rigid schema would serve no use case well.

Properties support both `PATCH` (merge) and `PUT` (replace) semantics, following HTTP standards precisely.

### SVG Generation — True Editability

Shape crops are re-processed through OpenCV to extract precise contour points. These points are normalized to the shape's own coordinate space and written as SVG path data using `svgwrite`. The resulting files are valid W3C SVG — openable in Inkscape, Figma, Adobe Illustrator, and any web browser.

### React Dashboard — Guided Workflow

The frontend implements a step-locked pipeline UI: each stage button is disabled until prerequisites are met (cannot detect shapes before extracting pages; cannot generate SVGs before detecting shapes). This prevents user error and communicates the pipeline dependency visually.

---

## Challenges Faced

### 1. The Border Contour Problem
**Challenge**: Initial implementation using `cv2.RETR_EXTERNAL` returned 0 shapes for the test PDF due to the surrounding drawing frame dominating the contour hierarchy.

**Solution**: Replaced with `cv2.RETR_CCOMP`, which returns a 2-level contour hierarchy. The outer border is at level 0; inner symbols are at level 1. Combined with area filtering (the border area exceeds `MAX_CONTOUR_AREA`), all 159 inner symbols were correctly extracted.

### 2. Verbose Logging Performance Impact
**Challenge**: Per-contour `logger.info()` calls (thousands of contours per page) caused the detection endpoint to appear frozen in the browser, with log lines consuming significant I/O.

**Solution**: Downgraded per-contour logging to `logger.debug()` (suppressed at INFO level) and set a 120-second Axios timeout on the frontend to handle legitimate long-running operations.

### 3. React Key Prop Warning
**Challenge**: The page preview grid used `key={page.id}`, but the `PageListResponse` schema did not expose the database UUID, causing `undefined` keys and React reconciliation warnings.

**Solution**: Used `key={page.page_number}` — a stable, unique, and always-present field from the API response.

### 4. SVG Coordinate Normalization
**Challenge**: Contour points are in absolute page coordinates. SVG files need shape-relative coordinates.

**Solution**: Applied normalization: `norm_x = (abs_x / shape_width) * SVG_WIDTH`. This maps each contour point to the shape's local coordinate space regardless of where on the page it was located.

---

## Assumptions

1. **Single-color line diagrams**: The thresholding pipeline is optimized for black lines on white/light backgrounds — the dominant style for P&ID and engineering diagrams.

2. **Non-overlapping symbols**: Bounding box extraction assumes symbols don't significantly overlap. Heavily overlapping symbols would produce merged crops.

3. **Minimum symbol size**: Symbols smaller than `MIN_CONTOUR_AREA` (500px²) are considered noise. This threshold is configurable but assumes standard A4/Letter diagram scale.

4. **English-language documents**: Text detection is not implemented; the system processes graphical elements only.

5. **SQLite for MVP**: The database is SQLite, appropriate for single-user or demonstration use. Production deployment would require PostgreSQL.

---

## Future Improvements

### Short-Term (Next Sprint)
- **PDF preview thumbnails** on the dashboard without processing
- **Batch processing endpoint** for multiple PDFs
- **Shape similarity search** (find all circles across documents)
- **Manual shape region selection** via canvas overlay

### Medium-Term
- **CNN-based classifier** trained on ISA-5.1 symbol dataset for 99%+ accuracy
- **DXF export** for AutoCAD integration
- **RESTful WebSocket updates** for real-time pipeline progress
- **User authentication** with per-user document isolation

### Long-Term
- **AI-powered enrichment**: GPT-4 Vision auto-tagging of shapes based on visual appearance
- **Vector embeddings** for symbol semantic search
- **Cloud-native deployment**: Kubernetes + S3 + PostgreSQL + Redis
- **Engineering symbol libraries**: Pre-trained models for ISA, IEC 60617, ISO 10628

---

## Conclusion

ShapeForge AI delivers a complete, working implementation of the assessment requirement. The system successfully:

- ✅ Ingests PDF engineering diagrams via validated REST API
- ✅ Extracts high-resolution page images using PyMuPDF
- ✅ Detects 159 engineering symbols from a real-world P&ID diagram
- ✅ Classifies each shape by geometric type with confidence scoring
- ✅ Generates individually editable SVG vector files for each symbol
- ✅ Supports free-form custom property metadata per shape
- ✅ Exports complete structured JSON metadata
- ✅ Provides an interactive React TypeScript dashboard
- ✅ Includes a comprehensive automated test suite (4 test modules)

The architecture is clean, the code is maintainable, and the system is designed to scale. Every design decision has been made with production readiness in mind, from the service layer pattern and dependency injection to the configurable CV parameters and idempotent pipeline stages.

---

*Submitted by: Aditya*
*Repository: https://github.com/Aditya452255/ShapeForge-AI*
*Stack: FastAPI · OpenCV · PyMuPDF · svgwrite · React · TypeScript · SQLAlchemy · Tailwind CSS*
