# System Architecture & Design

## Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (React/Vue)                     │
│            (Upload UI, Status Polling, Results Display)     │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTP/REST
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                  FASTAPI SERVER (main.py)                   │
│  ┌──────────────────────────────────────────────────────┐  │
│  │         Routes (routes/documents.py)                 │  │
│  │  • POST /upload - File upload endpoint              │  │
│  │  • GET /status - Check extraction status            │  │
│  │  • GET /{id} - Retrieve full document               │  │
│  │  • GET /{id}/text - Raw extracted text              │  │
│  │  • GET /{id}/metadata - Structured data             │  │
│  └──────────────────────────────────────────────────────┘  │
└────────────┬─────────────────────────────┬──────────────────┘
             │                             │
             ▼                             ▼
    ┌─────────────────────┐      ┌──────────────────────┐
    │  EXTRACTION SERVICE │      │   DATABASE (SQLAlch) │
    │ (services/)         │      │   (SQLite/Postgres)  │
    │                     │      │                      │
    │ • OCRExtractor      │      │  • Users table      │
    │ • MedicalDataEx.    │      │  • Documents table  │
    │ • DocumentExtractor │      │  • Indexed queries  │
    └──────┬──────────────┘      └──────────────────────┘
           │
    ┌──────┴────────────────────────┐
    │     OCR ENGINE (Choose one)   │
    ├──────────────────────────────┤
    │ A) Tesseract OCR (Free)      │ ← Recommended for MVP
    │    • Fast (2-5 sec/page)    │
    │    • Offline                 │
    │    • Good for clear docs     │
    │                              │
    │ B) Google Vision API (Paid)  │
    │    • Very accurate           │
    │    • Handles complex layouts │
    │    • Cloud-based             │
    └──────────────────────────────┘
```

## Component Details

### 1. **FastAPI Application** (`main.py`)

Entry point that:
- Initializes database tables
- Sets up CORS middleware
- Registers document routes
- Provides health check endpoints

### 2. **Document Routes** (`routes/documents.py`)

Handles HTTP requests:

```python
# Key functions:
- upload_document()          # POST upload
- get_extraction_status()    # GET status
- get_document()             # GET full data
- get_extracted_text()       # GET raw text
- get_extracted_metadata()   # GET structured data
- get_user_documents()       # GET all user docs
- delete_document()          # DELETE doc
```

### 3. **Extraction Service** (`services/extraction_service.py`)

Three main classes:

#### **OCRExtractor**
```python
# Processes images to extract text
- preprocess_image()         # Image enhancement
- extract_text_tesseract()   # Tesseract OCR
- extract_text_google_vision()  # Google API
- extract_text()             # Auto-selects engine
```

Features:
- Converts to grayscale
- CLAHE contrast enhancement
- Noise removal
- Adaptive thresholding

#### **MedicalDataExtractor**
```python
# Parses structured data from text
- extract_medications()      # Parse Rx info
- parse_date()              # Date parsing
- extract_structured_data()  # All fields
```

Uses regex patterns for:
- Patient names
- Doctor names
- Dates
- Medications
- Dosages
- Diagnosis
- Medical findings

#### **DocumentExtractor**
```python
# Main orchestrator
- extract_from_image()       # Image files
- extract_from_pdf()         # PDF files
```

Returns:
```json
{
  "success": true,
  "extracted_text": "...",
  "confidence_score": 0.87,
  "structured_data": {
    "patient_name": "John Doe",
    "medications": [...],
    "diagnosis": "..."
  }
}
```

### 4. **Database Models** (`models/document.py`)

#### **User Model**
```
id (PK)
email (unique, indexed)
phone
full_name
created_at
└─ documents (relationship)
```

#### **Document Model**
```
id (PK)
user_id (FK)

File Info:
├─ file_name
├─ file_path
├─ file_size
└─ mime_type

Document Info:
├─ document_type (enum)
└─ document_date

Extraction Status:
├─ extraction_status (pending/processing/completed/failed)
├─ extracted_text (large text)
├─ extracted_metadata (JSON)
├─ confidence_score (0-1)
└─ extraction_error

Structured Data:
├─ patient_name
├─ patient_dob
├─ doctor_name
├─ medication_names (JSON)
├─ dosage_instructions (JSON)
├─ diagnosis
└─ medical_findings

Timestamps:
├─ uploaded_at
├─ extracted_at
└─ updated_at
```

### 5. **Request/Response Schemas** (`schemas/document.py`)

Pydantic models for:
- `DocumentUploadSchema` - Upload request
- `DocumentResponseSchema` - Full document response
- `ExtractionStatusSchema` - Status query response
- `PrescriptionExtractedSchema` - Prescription data
- `DocumentListSchema` - Paginated list
- `MedicationSchema` - Medication info

### 6. **Configuration** (`config/settings.py`)

Environment-based settings:
```python
DATABASE_URL          # Database connection
UPLOAD_DIRECTORY      # File storage path
MAX_FILE_SIZE         # Upload limit
USE_TESSERACT         # Enable Tesseract
USE_GOOGLE_VISION     # Enable Google API
TESSERACT_PATH        # OCR binary path
MIN_CONFIDENCE_SCORE  # Quality threshold
```

### 7. **Utility Functions** (`services/utils.py`)

Helper classes:
- `DocumentUtils` - Text cleaning, data extraction
- `MedicationParser` - Medication info parsing
- `DiagnosisExtractor` - Clinical data extraction
- `QualityMetrics` - Scoring and validation
- `ReportFormatter` - Human-readable output

## Data Flow

### Upload Flow

```
1. User uploads file
   ↓
2. validate_file() - Check type, size
   ↓
3. Save file to disk (UPLOAD_DIRECTORY)
   ↓
4. Create Document record (status: PENDING)
   ↓
5. Return document_id immediately
   ↓
6. Queue background extraction task
```

### Background Extraction

```
1. process_document_extraction() starts
   ↓
2. Update status → PROCESSING
   ↓
3. Choose processor based on file type
   ├─ PDF → extract_from_pdf()
   └─ Image → extract_from_image()
   ↓
4. OCR Engine (Tesseract or Google Vision)
   ↓
5. Extract structured data (regex patterns)
   ↓
6. Store results in database
   ├─ extracted_text
   ├─ confidence_score
   ├─ structured_data (JSON)
   ├─ status → COMPLETED
   └─ extracted_at timestamp
   ↓
7. Update Document record
```

### Retrieval Flow

```
1. User requests document data
   ↓
2. Query database by document_id
   ↓
3. Return stored extraction results
   ├─ Raw text
   ├─ Structured metadata
   ├─ Confidence score
   └─ Timestamps
```

## API Sequence Diagram

```
Client                  Server              Database         OCR Engine
  │                       │                    │                  │
  ├──POST /upload──────→  │                    │                  │
  │                       ├─validate file      │                  │
  │                       ├─save to disk       │                  │
  │                       ├─insert record──→   │                  │
  │                       │◄──doc_id─────      │                  │
  │◄─{doc_id, status}──   │                    │                  │
  │                       ├─queue background task
  │                       │                    │                  │
  │  (polling)            │                    │                  │
  ├──GET /status/{id}───→ │                    │                  │
  │◄─{status: pending}──  │                    │                  │
  │                       ├─update status     │                  │
  │                       ├─load image        │                  │
  │                       ├─send image───────────────────────→   │
  │                       │◄──extract text────────────────────   │
  │                       ├─parse data        │                  │
  │                       ├─update record──→  │                  │
  │                       │◄──done──────      │                  │
  │                       │                    │                  │
  ├──GET /status/{id}───→ │                    │                  │
  │◄─{status: completed}─ │                    │                  │
  │                       │                    │                  │
  ├──GET /{id}──────────→ │                    │                  │
  │                       ├─query record──→   │                  │
  │◄─{full document}──    │◄──return────      │                  │
```

## Key Design Decisions

### 1. **Async Background Processing**
- Upload returns immediately
- Extraction happens in background
- Client polls for status or gets webhook callback
- **Benefit:** No timeout issues, better UX

### 2. **Database-First Storage**
- All data persisted in database
- File references stored in DB
- **Benefit:** Easy auditing, compliance, recovery

### 3. **Pluggable OCR Engines**
- Tesseract (default) or Google Vision
- Easy to add more (Azure, AWS, etc.)
- **Benefit:** Flexibility, cost optimization

### 4. **Structured + Raw Data**
- Store both raw OCR text AND parsed data
- Allows re-extraction without re-running OCR
- **Benefit:** Audit trail, flexibility

### 5. **Confidence Scoring**
- Every extraction has a score
- Quality metrics for filtering
- **Benefit:** Know reliability of each extraction

## File Structure

```
backend/
├── main.py                    # FastAPI app entry
├── requirements.txt           # Dependencies
├── .env.example              # Config template
├── QUICKSTART.md             # Quick start
├── SETUP_GUIDE.md            # Full documentation
├── ARCHITECTURE.md           # This file
│
├── config/
│   ├── settings.py           # Configuration
│   └── database.py           # SQLAlchemy setup
│
├── models/
│   └── document.py           # User & Document models
│
├── schemas/
│   └── document.py           # Pydantic schemas
│
├── services/
│   ├── __init__.py
│   ├── extraction_service.py # OCR & parsing
│   └── utils.py              # Utility functions
│
├── routes/
│   └── documents.py          # API endpoints
│
└── uploads/
    └── medical_docs/         # Uploaded files
```

## Performance Considerations

### Image Preprocessing
- Grayscale conversion: ~50ms
- CLAHE enhancement: ~100ms
- Thresholding: ~50ms
- Total: ~200ms per image

### OCR Extraction
- Tesseract: 2-5 seconds per page (depends on image quality)
- Google Vision: 1-2 seconds per image (+ API latency)

### Database Queries
- All indexed on user_id, extraction_status
- Single document fetch: ~5ms
- List 20 documents: ~15ms

### Recommended Infrastructure
- FastAPI workers: 4-8 (depends on server CPU)
- Database: PostgreSQL in production (SQLite for dev)
- File storage: Local disk or S3
- Cache layer: Redis (optional, for extracted text)

## Security Considerations

✓ File type validation
✓ File size limits
✓ Path traversal prevention (uuid filenames)
✓ Database prepared statements (SQLAlchemy)
✓ CORS configuration
✓ Input validation (Pydantic)

**To add in production:**
- Authentication/Authorization
- HTTPS/TLS
- Rate limiting
- HIPAA compliance (if needed)
- Encryption at rest

## Future Enhancements

1. **Multi-page PDF Support** - Extract all pages
2. **Webhook Callbacks** - Instead of polling
3. **Batch Processing** - Multiple documents at once
4. **ML-based Entity Recognition** - NER for better parsing
5. **Document Classification** - Auto-detect document type
6. **Template Matching** - For standardized forms
7. **Handwriting Recognition** - For signatures, handwritten notes
8. **Caching Layer** - Redis for frequent queries
