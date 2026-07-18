SYSTEM ARCHITECTURE
===================

## TECH STACK

┌────────────────────────────────────────────────────────────────────┐
│                    MEDICAL DOCUMENT SYSTEM                         │
└────────────────────────────────────────────────────────────────────┘

### 1. UPLOAD & STORAGE
├─ FastAPI (Web Framework)
├─ python-multipart (File Upload)
└─ Filesystem (Document Storage: ./uploads/medical_docs)

### 2. OCR (Text Extraction)
├─ PRIMARY: Tesseract (FREE, local)
│  └─ pytesseract wrapper
│  └─ ~85-90% accuracy
│
└─ ALTERNATIVE: Google Cloud Vision (PAID, better)
   └─ $1.50/1000 images
   └─ ~95-98% accuracy
   └─ Enable: USE_GOOGLE_VISION=true

### 3. IMAGE PREPROCESSING
├─ OpenCV (cv2)
│  ├─ Grayscale conversion
│  ├─ CLAHE (contrast enhancement)
│  ├─ Denoising
│  └─ Thresholding
│
└─ Pillow (Image format conversion)

### 4. DATA PARSING
└─ Regex (re module)
   ├─ Extract patient name
   ├─ Extract doctor name
   ├─ Extract medications
   ├─ Extract diagnosis
   └─ Extract medical findings

### 5. EMBEDDING GENERATION ⭐ COHERE
├─ Cohere API (embed-english-v3.0)
├─ Cost: FREE (100K calls/month)
├─ Dimensions: 384
├─ Generates 3 embeddings:
│  ├─ extracted_text_embedding
│  ├─ diagnosis_embedding
│  └─ medication_embedding
└─ API Key: COHERE_API_KEY

### 6. VECTOR DATABASE
├─ PostgreSQL (database)
├─ pgvector (vector extension)
├─ Stores:
│  ├─ Traditional columns (text, metadata)
│  ├─ Vector columns (embeddings)
│  └─ HNSW indexes (for fast search)
└─ Cost: FREE (self-hosted)

### 7. API ENDPOINTS
├─ POST /api/documents/upload (upload + extract)
├─ GET /api/documents/{id} (retrieve document)
├─ GET /api/documents/similar/{id} (find similar docs)
├─ POST /api/documents/search/semantic (search by query)
├─ GET /api/medications/check-synonyms (find drug variations)
└─ POST /api/ai/chat (OPTIONAL: AI Q&A with Gemini)

### 8. AI CHAT (OPTIONAL)
├─ Google Gemini API
├─ Cost: FREE tier available
├─ API Key: GEMINI_API_KEY
└─ Features:
   ├─ Answer medical questions
   ├─ Generate health summaries
   └─ Explain medical terms

---

## DATA FLOW

```
1. USER UPLOADS DOCUMENT
   ↓ (FastAPI, python-multipart)
   
2. SAVE FILE TO DISK
   ↓ (./uploads/medical_docs/)
   
3. OCR TEXT EXTRACTION
   ├─ Read PDF/Image
   ├─ Preprocess with OpenCV
   ├─ Tesseract OCR extracts text
   └─ Calculate confidence score
   ↓
   
4. DATA PARSING (Regex)
   ├─ Extract patient name
   ├─ Extract doctor name
   ├─ Extract medications
   ├─ Extract diagnosis
   └─ Extract findings
   ↓
   
5. EMBEDDING GENERATION (Cohere)
   ├─ API Call: Text → Vector (384 dims)
   ├─ API Call: Diagnosis → Vector
   ├─ API Call: Medications → Vector
   └─ Cost: 0.000045¢ per document (from free tier)
   ↓
   
6. DATABASE STORAGE (PostgreSQL + pgvector)
   ├─ Store raw text
   ├─ Store vectors
   ├─ Store metadata
   └─ Create HNSW index
   ↓
   
7. RETRIEVAL
   ├─ Semantic search (query → vector → similar docs)
   ├─ Similar documents (doc → vector → related docs)
   ├─ Medication synonyms (drug → vector → variations)
   └─ AI chat (context from vectors + Gemini response)
```

---

## COMPONENT DETAILS

### OCR Engine
- **Primary:** Tesseract OCR
  - Library: pytesseract
  - Cost: FREE
  - Speed: ~500ms per page
  - Accuracy: 85-90%
  - Setup: Pre-installed (usually)
  
- **Alternative:** Google Cloud Vision
  - Library: google-cloud-vision
  - Cost: $1.50 per 1000 images
  - Speed: ~200ms per page
  - Accuracy: 95-98%
  - Enable: USE_GOOGLE_VISION=true

### Embedding Service
- **Provider:** Cohere API
- **Model:** embed-english-v3.0
- **Dimensions:** 384
- **Cost:** FREE (100,000 calls/month)
- **Speed:** ~200ms per embedding
- **Authentication:** COHERE_API_KEY

### Vector Database
- **Database:** PostgreSQL 12+
- **Extension:** pgvector
- **Vector Dimensions:** 384
- **Indexes:** HNSW (hierarchical navigable small world)
- **Search Speed:** <10ms per query
- **Cost:** FREE if self-hosted

### AI Chat (Optional)
- **Provider:** Google Gemini
- **Model:** gemini-1.5-flash
- **Cost:** FREE tier (60 requests/minute)
- **Authentication:** GEMINI_API_KEY

---

## DEPLOYMENT ARCHITECTURE

```
Development Setup:
┌─────────────────────────────────────────────┐
│ Local Machine                               │
├─────────────────────────────────────────────┤
│ FastAPI (uvicorn)          :8000            │
├─────────────────────────────────────────────┤
│ PostgreSQL (local or Docker)    :5432       │
├─────────────────────────────────────────────┤
│ Uploaded Files (./uploads/)                 │
├─────────────────────────────────────────────┤
│ API Calls → Cohere (cloud)                  │
│ AI Calls → Gemini (cloud)                   │
└─────────────────────────────────────────────┘

Production Setup:
┌─────────────────────────────────────────────┐
│ Web Server                                  │
│ ├─ FastAPI (Gunicorn + Uvicorn)             │
│ └─ Nginx reverse proxy                      │
├─────────────────────────────────────────────┤
│ Database Server                             │
│ ├─ PostgreSQL (managed)                     │
│ └─ pgvector extension enabled               │
├─────────────────────────────────────────────┤
│ File Storage                                │
│ ├─ S3 / Cloud Storage                       │
│ └─ Document uploads                         │
├─────────────────────────────────────────────┤
│ External APIs                               │
│ ├─ Cohere (embeddings)                      │
│ └─ Gemini (AI chat)                         │
└─────────────────────────────────────────────┘
```

---

## DEPENDENCIES TREE

```
FastAPI (web framework)
├─ Uvicorn (server)
├─ Pydantic (validation)
├─ SQLAlchemy (ORM)
│  └─ psycopg2-binary (PostgreSQL driver)
│     └─ pgvector (vector storage)
├─ Starlette (async web)
├─ python-multipart (file upload)
├─ python-dotenv (config)
└─ aiofiles (async file I/O)

OCR Pipeline
├─ pytesseract (Tesseract wrapper)
│  └─ opencv-python (image preprocessing)
├─ pdf2image (PDF conversion)
│  └─ Ghostscript (PDF rendering)
└─ Pillow (image format conversion)

Embedding Service
└─ cohere (Cohere API client)

Optional AI Service
└─ google-cloud-generativeai (Gemini API client)
```

---

## API ENDPOINTS SUMMARY

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | /api/documents/upload | Upload document & extract |
| GET | /api/documents/{id} | Get full document with data |
| GET | /api/documents/similar/{id} | Find clinically similar documents |
| POST | /api/documents/search/semantic | Search by medical query |
| GET | /api/medications/check-synonyms | Find medication name variations |
| GET | /api/documents/user/{id}/all | List user's documents |
| DELETE | /api/documents/{id} | Delete document |
| POST | /api/ai/chat | Chat about medical documents (optional) |
| GET | /api/documents/health/vector-search | Health check |

---

## COST BREAKDOWN (Monthly)

```
┌─────────────────────────────┬─────────┐
│ Service                     │ Cost    │
├─────────────────────────────┼─────────┤
│ Tesseract OCR (local)       │ $0      │
│ PostgreSQL (self-hosted)    │ $0      │
│ Cohere (100K calls free)    │ $0      │
│ Gemini (free tier)          │ $0      │
│ FastAPI (open source)       │ $0      │
├─────────────────────────────┼─────────┤
│ TOTAL                       │ $0      │
└─────────────────────────────┘

* Add cost if exceeding Cohere free tier or using cloud databases
```

---

## SCALABILITY

### Current Setup (Good for):
- Prototype/MVP
- Internal medical teams
- <1000 documents/month
- Single server

### Scale to 10K docs/month:
- Add Cohere paid tier ($2 per million requests)
- Use managed PostgreSQL (~$15/month)
- Cost: ~$15-20/month

### Scale to 100K docs/month:
- Cohere: $2 per million requests = ~$0.20
- PostgreSQL: Managed instance = ~$50/month
- Add load balancer + multiple FastAPI servers
- Use S3/cloud storage for documents
- Cost: ~$50-100/month

---

## MONITORING & LOGGING

- **Logs:** medical_extraction.log (generated on startup)
- **Health Check:** GET /api/documents/health/vector-search
- **Database Monitor:** database_monitor.py (optional CLI tool)
- **API Docs:** http://localhost:8000/docs (auto-generated)

---

## SECURITY NOTES

- API keys stored in .env (never in code)
- Input validation via Pydantic
- SQL injection protection via SQLAlchemy ORM
- File upload validation (type + size)
- Database SSL support available
- CORS configured for development

---

## DEVELOPMENT WORKFLOW

```
1. Install: pip install -r requirements.txt
2. Configure: Create .env with API keys
3. Start PostgreSQL
4. Run: python -m uvicorn main:app --reload
5. Visit: http://localhost:8000/docs
6. Test: Upload documents via API
7. Debug: tail -f medical_extraction.log
```
