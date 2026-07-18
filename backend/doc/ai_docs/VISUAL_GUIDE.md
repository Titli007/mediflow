# Medical Document Extraction System - Visual Guide

## 📊 System Workflow

```
┌──────────────────────────────────────────────────────────────┐
│                     PATIENT / USER                            │
│                  (Frontend Application)                       │
└────────────────────────┬─────────────────────────────────────┘
                         │
                         │ 1. Upload Medical Document
                         │ (JPG, PNG, PDF, etc.)
                         ▼
┌──────────────────────────────────────────────────────────────┐
│                   FastAPI SERVER                             │
│                 (Listening on :8000)                        │
│                                                              │
│  POST /api/documents/upload                                 │
│  ├─ Validate file (type, size)                             │
│  ├─ Save to disk (UPLOAD_DIRECTORY)                        │
│  ├─ Create DB record (status: PENDING)                     │
│  └─ Queue background task                                  │
│     └─ Return document_id immediately                      │
└──────────────┬─────────────────────────────────────┬────────┘
               │                                     │
               │ 2. Poll Status                      │ 3. Background Task
               │ GET /status/{id}                   │ (Async Processing)
               ▼                                     ▼
         ┌─────────────┐              ┌──────────────────────────┐
         │Status Check │              │  OCR Extraction Engine   │
         │             │              │                          │
         │pending      │──────────→   │ Load Image               │
         │processing   │              │ ↓                        │
         │completed    │              │ Preprocess               │
         │failed       │              │ ├─ Grayscale             │
         └─────────────┘              │ ├─ CLAHE                 │
                                      │ ├─ Denoise               │
                                      │ └─ Threshold             │
                                      │ ↓                        │
                                      │ Select OCR Engine:       │
                                      │ ├─ Tesseract (Free)     │
                                      │ └─ Google Vision (API)   │
                                      │ ↓                        │
                                      │ Extract Text             │
                                      │ Calculate Confidence     │
                                      │ ↓                        │
                                      │ Parse Data:              │
                                      │ ├─ Patient name          │
                                      │ ├─ Doctor name           │
                                      │ ├─ Medications           │
                                      │ ├─ Dosages               │
                                      │ └─ Diagnosis             │
                                      │ ↓                        │
                                      │ Store in Database        │
                                      │ Update status: COMPLETED │
                                      └──────────────────────────┘
               │
               │ 4. Poll returns "completed"
               │
               ▼
┌──────────────────────────────────────────────────────────────┐
│              Display Results to User                         │
│                                                              │
│  GET /api/documents/{id}                                    │
│  GET /api/documents/{id}/metadata                           │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Patient: John Doe                                      │ │
│  │ Doctor: Dr. Smith                                      │ │
│  │ Medications:                                           │ │
│  │   • Lisinopril 10mg - Once daily                      │ │
│  │   • Metformin 500mg - Twice daily                     │ │
│  │ Diagnosis: Hypertension                                │ │
│  │ Confidence: 87%                                        │ │
│  │ Extracted: 2024-01-15 10:35:00                         │ │
│  └────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

---

## 🔄 Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                   INCOMING REQUEST                          │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
        ┌────────────────────────┐
        │   File Validation      │
        │  ✓ Type check          │
        │  ✓ Size check (50MB)   │
        │  ✓ Not empty           │
        └────────────────────────┘
                     │
                     ▼
        ┌────────────────────────┐
        │  Save to Disk          │
        │  Generate UUID name    │
        │  Store path in DB      │
        └────────────────────────┘
                     │
                     ▼
        ┌────────────────────────────────────┐
        │  Respond to User (Immediate)       │
        │  ✓ document_id: 1                  │
        │  ✓ status: pending                 │
        │  ✓ message: "Extracting..."        │
        └────────────────────────────────────┘
                     │
                     ▼ (Background)
        ┌────────────────────────────────────┐
        │   Image Preprocessing               │
        │  • Convert to grayscale             │
        │  • Apply CLAHE contrast             │
        │  • Remove noise                     │
        │  • Apply thresholding               │
        └────────────────────────────────────┘
                     │
         ┌───────────┴──────────────┐
         │                          │
         ▼                          ▼
    Tesseract             Google Vision API
    (Local, Fast)         (Cloud, Accurate)
         │                          │
         └───────────┬──────────────┘
                     │
                     ▼
        ┌────────────────────────────────────┐
        │   Extract Structured Data          │
        │  ├─ Patient Name (Regex)           │
        │  ├─ Doctor Name (Regex)            │
        │  ├─ Medications (Parsing)          │
        │  ├─ Dosages (Number extraction)    │
        │  ├─ Frequencies (Pattern match)    │
        │  ├─ Diagnosis (Keyword search)     │
        │  └─ Confidence Score               │
        └────────────────────────────────────┘
                     │
                     ▼
        ┌────────────────────────────────────┐
        │   Update Database Record           │
        │  ├─ extracted_text                 │
        │  ├─ extracted_metadata (JSON)      │
        │  ├─ confidence_score               │
        │  ├─ extraction_status: COMPLETED   │
        │  ├─ extracted_at (timestamp)       │
        │  └─ patient_name, doctor_name...   │
        └────────────────────────────────────┘
                     │
                     ▼
        ┌────────────────────────────────────┐
        │  User Polls for Status             │
        │  GET /status/{id}                  │
        │                                    │
        │  Response:                         │
        │  ✓ status: completed               │
        │  ✓ confidence_score: 0.87          │
        │  ✓ error_message: null             │
        └────────────────────────────────────┘
                     │
                     ▼
        ┌────────────────────────────────────┐
        │  User Fetches Results              │
        │  GET /documents/{id}/metadata      │
        │                                    │
        │  Response: Structured Data         │
        │  ✓ patient_name: "John Doe"        │
        │  ✓ doctor_name: "Dr. Smith"        │
        │  ✓ medications: [...]              │
        │  ✓ diagnosis: "Hypertension"       │
        └────────────────────────────────────┘
```

---

## 📋 Database Schema Diagram

```
┌─────────────────────────────────────┐
│           USERS TABLE               │
├─────────────────────────────────────┤
│ id (PK) ───→ INTEGER               │
│ email        → VARCHAR (UNIQUE)     │
│ phone        → VARCHAR              │
│ full_name    → VARCHAR              │
│ created_at   → DATETIME             │
│                                     │
│ ←──── ONE TO MANY ─────→            │
└─────────────────────────────────────┘
            │
            │
            ▼
┌──────────────────────────────────────────────────┐
│          DOCUMENTS TABLE                         │
├──────────────────────────────────────────────────┤
│ id (PK)                    → INTEGER              │
│ user_id (FK)               → INTEGER              │
│                                                  │
│ FILE METADATA:                                   │
│ ├─ file_name               → VARCHAR             │
│ ├─ file_path               → VARCHAR             │
│ ├─ file_size               → INTEGER (bytes)     │
│ └─ mime_type               → VARCHAR             │
│                                                  │
│ DOCUMENT INFO:                                   │
│ ├─ document_type (enum)    → prescription, mri...│
│ └─ document_date           → DATETIME (nullable) │
│                                                  │
│ EXTRACTION STATUS:                               │
│ ├─ extraction_status (enum)→ pending/processing/ │
│ │                          completed/failed      │
│ ├─ extracted_text          → TEXT (large)       │
│ ├─ extracted_metadata      → JSON               │
│ ├─ confidence_score        → FLOAT (0-1)        │
│ └─ extraction_error        → TEXT (nullable)    │
│                                                  │
│ STRUCTURED DATA:                                 │
│ ├─ patient_name            → VARCHAR            │
│ ├─ patient_dob             → DATETIME           │
│ ├─ doctor_name             → VARCHAR            │
│ ├─ medication_names        → JSON Array         │
│ ├─ dosage_instructions     → JSON               │
│ ├─ diagnosis               → VARCHAR            │
│ └─ medical_findings        → TEXT               │
│                                                  │
│ TIMESTAMPS:                                      │
│ ├─ uploaded_at             → DATETIME (auto)    │
│ ├─ extracted_at            → DATETIME           │
│ └─ updated_at              → DATETIME (auto)    │
└──────────────────────────────────────────────────┘
```

---

## 🔌 API Request/Response Examples

### 1. Upload Document
```
REQUEST:
POST /api/documents/upload HTTP/1.1
Content-Type: multipart/form-data

file: [binary image data]
document_type: prescription
user_id: 1

RESPONSE: 200 OK
{
  "document_id": 1,
  "file_name": "prescription.pdf",
  "status": "pending",
  "message": "Document uploaded. Extraction in progress..."
}
```

### 2. Check Status
```
REQUEST:
GET /api/documents/status/1 HTTP/1.1

RESPONSE: 200 OK
{
  "document_id": 1,
  "status": "completed",
  "confidence_score": 0.87,
  "error_message": null
}
```

### 3. Get Full Document
```
REQUEST:
GET /api/documents/1 HTTP/1.1

RESPONSE: 200 OK
{
  "id": 1,
  "file_name": "prescription.pdf",
  "document_type": "prescription",
  "extraction_status": "completed",
  "confidence_score": 0.87,
  "uploaded_at": "2024-01-15T10:30:00",
  "extracted_at": "2024-01-15T10:35:00",
  "extracted_text": "PRESCRIPTION\nPatient...",
  "patient_name": "John Doe",
  "doctor_name": "Dr. Smith",
  "diagnosis": "Hypertension"
}
```

### 4. Get Metadata
```
REQUEST:
GET /api/documents/1/metadata HTTP/1.1

RESPONSE: 200 OK
{
  "document_id": 1,
  "patient_name": "John Doe",
  "doctor_name": "Dr. Smith",
  "diagnosis": "Hypertension",
  "findings": null,
  "medications": [
    {
      "name": "Lisinopril",
      "dosage": "10 mg",
      "frequency": "once daily",
      "duration": null,
      "instructions": null
    },
    {
      "name": "Metformin",
      "dosage": "500 mg",
      "frequency": "twice daily",
      "duration": null,
      "instructions": null
    }
  ],
  "metadata": {
    "patient_name": "John Doe",
    "doctor_name": "Dr. Smith",
    "date": "2024-01-15",
    "raw_text_preview": "PRESCRIPTION\nDate: 01/15/2024..."
  }
}
```

---

## 🎯 Processing Timeline

```
T+0s    ├─ User clicks "Upload"
        │  File selected, sent to server
        │
T+1s    ├─ Server receives file
        │  ├─ Validates file
        │  ├─ Saves to disk
        │  ├─ Creates DB record
        │  └─ Returns document_id
        │
T+1.5s  ├─ User gets confirmation
        │  "Extraction in progress"
        │
T+2s    ├─ Background task starts
        │  ├─ Load image
        │  ├─ Preprocess
        │  └─ Status: PROCESSING
        │
T+4s    ├─ OCR runs
        │  ├─ Tesseract: ~2-5 seconds
        │  └─ Google Vision: ~1-2 seconds
        │
T+6s    ├─ Data extraction
        │  ├─ Parse medications
        │  ├─ Extract patient name
        │  ├─ Identify doctor
        │  └─ Calculate confidence
        │
T+7s    ├─ Update database
        │  └─ Status: COMPLETED
        │
T+8s    ├─ User polls status
        │  └─ Gets: "completed"
        │
T+8.1s  └─ User fetches results
           Gets all extracted data
```

---

## 📦 File Organization

```
backend/
│
├─ main.py                          (FastAPI app entry)
├─ requirements.txt                 (Dependencies)
├─ .env.example                     (Config template)
│
├─ config/
│   ├─ __init__.py
│   ├─ settings.py                  (Configuration)
│   └─ database.py                  (SQLAlchemy)
│
├─ models/
│   ├─ __init__.py
│   └─ document.py                  (User & Document models)
│
├─ schemas/
│   ├─ __init__.py
│   └─ document.py                  (Pydantic schemas)
│
├─ services/
│   ├─ __init__.py
│   ├─ extraction_service.py        (OCR & parsing)
│   └─ utils.py                     (Helper functions)
│
├─ routes/
│   ├─ __init__.py
│   └─ documents.py                 (7 API endpoints)
│
├─ uploads/
│   └─ medical_docs/                (Uploaded files)
│
└─ Documentation/
    ├─ START_HERE.md                (Begin here!)
    ├─ README.md                    (Overview)
    ├─ QUICKSTART.md                (5-min setup)
    ├─ SETUP_GUIDE.md               (Complete setup)
    ├─ ARCHITECTURE.md              (System design)
    ├─ DEPLOYMENT_CHECKLIST.md      (Production)
    ├─ IMPLEMENTATION_SUMMARY.md    (What's built)
    └─ SOLUTION_OVERVIEW.md         (High-level)
```

---

## 🚀 Quick Reference Checklist

```
□ Install dependencies:        pip install -r requirements.txt
□ Install Tesseract:           brew/apt/choco install tesseract
□ Copy environment file:        cp .env.example .env
□ Start server:                python -m uvicorn main:app --reload
□ Visit API docs:              http://localhost:8000/docs
□ Upload test document:        POST /api/documents/upload
□ Check status:                GET /api/documents/status/1
□ Get results:                 GET /api/documents/1/metadata
□ Read documentation:          START_HERE.md
□ Deploy to production:        See DEPLOYMENT_CHECKLIST.md
```

---

## ✨ Key Points

🎯 **Simple Setup** - Works in 5 minutes
🔄 **Async Processing** - No timeouts
📚 **Well Documented** - 7 guides included
🔒 **Secure** - Built-in validation
⚡ **Fast** - Optimized extraction
📊 **Comprehensive** - All data extracted
🚀 **Production Ready** - Ready to deploy
💡 **Customizable** - Easy to modify

---

**START WITH: START_HERE.md** 👈

Then follow QUICKSTART.md for a 5-minute setup.
