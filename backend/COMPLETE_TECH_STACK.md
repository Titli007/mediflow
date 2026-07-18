COMPLETE TECH STACK BREAKDOWN
==============================

## 📋 ARCHITECTURE OVERVIEW

Your Medical Document Extraction System uses:

┌─────────────────────────────────────────────────────────────────┐
│                    MEDICAL DOCUMENT EXTRACTION                  │
└─────────────────────────────────────────────────────────────────┘

## 1️⃣ DOCUMENT UPLOAD & STORAGE
┌──────────────────────────────┐
│ File Upload                  │
├──────────────────────────────┤
│ Tool: FastAPI                │
│ Library: python-multipart    │
│ Storage: Local filesystem    │
│ Max size: 50MB               │
└──────────────────────────────┘

## 2️⃣ DOCUMENT CONVERSION (PDF → Image)
┌──────────────────────────────┐
│ PDF to Image Conversion      │
├──────────────────────────────┤
│ Tool: pdf2image              │
│ Dependency: Ghostscript      │
│ Purpose: Convert PDF pages   │
│          to PNG for OCR      │
│ DPI: 150 (good quality)      │
└──────────────────────────────┘

## 3️⃣ TEXT EXTRACTION (OCR)
┌──────────────────────────────────────────────┐
│ Optical Character Recognition                │
├──────────────────────────────────────────────┤
│ PRIMARY: Tesseract OCR                       │
│ ├─ Tool: pytesseract                         │
│ ├─ Model: eng (English)                      │
│ ├─ Cost: FREE (open-source)                  │
│ └─ Accuracy: ~85-90%                         │
│                                              │
│ ALTERNATIVE: Google Cloud Vision             │
│ ├─ Tool: google-cloud-vision                 │
│ ├─ Cost: $1.50 per 1000 images (paid)        │
│ ├─ Accuracy: ~95-98%                         │
│ └─ Enable via: USE_GOOGLE_VISION=true        │
│                                              │
│ Image Preprocessing:                         │
│ ├─ Tool: OpenCV                              │
│ ├─ Grayscale conversion                      │
│ ├─ CLAHE (contrast enhancement)              │
│ ├─ Denoising                                 │
│ └─ Thresholding                              │
└──────────────────────────────────────────────┘

## 4️⃣ TEXT PARSING & EXTRACTION
┌──────────────────────────────────────────────┐
│ Medical Data Parsing                         │
├──────────────────────────────────────────────┤
│ Tool: Regex (Python re module)               │
│ Cost: FREE (built-in)                        │
│                                              │
│ Extracts:                                    │
│ ├─ Patient name                              │
│ ├─ Doctor name                               │
│ ├─ Date (multiple formats)                   │
│ ├─ Medications (names + dosage)              │
│ ├─ Diagnosis                                 │
│ └─ Medical findings                          │
│                                              │
│ Method: Pattern matching with regex          │
│ Library: re (Python standard library)        │
└──────────────────────────────────────────────┘

## 5️⃣ EMBEDDINGS (Vector Generation) - ALL FREE
┌──────────────────────────────────────────────────────┐
│ OPTION 1: Cohere (Cloud, FREE)                       │
├──────────────────────────────────────────────────────┤
│ Tool: cohere                                         │
│ API: https://api.cohere.ai/v1/embed                  │
│ Model: embed-english-v3.0                            │
│ Dimensions: 384                                      │
│ Cost: 100,000 API calls/month FREE                   │
│ Sign up: https://cohere.ai (free account)            │
│ Setup: Set COHERE_API_KEY in .env                    │
│                                                      │
│ OPTION 2: Hugging Face (Local, FREE)                 │
├──────────────────────────────────────────────────────┤
│ Tool: sentence-transformers                          │
│ Model: all-MiniLM-L6-v2                              │
│ Dimensions: 384                                      │
│ Cost: $0 (runs locally, no API calls)                │
│ Speed: 50ms per document (local)                     │
│ Setup: pip install sentence-transformers             │
│ Privacy: Data never leaves your server               │
│                                                      │
│ OPTION 3: Ollama (Local, FREE)                       │
├──────────────────────────────────────────────────────┤
│ Tool: Ollama (Docker container)                      │
│ Model: nomic-embed-text                              │
│ Dimensions: 768                                      │
│ Cost: $0 (completely local)                          │
│ Setup: docker run -p 11434:11434 ollama/ollama       │
│        ollama pull nomic-embed-text                  │
│ Privacy: 100% local, no internet                     │
│ Performance: Fast on GPU                             │
└──────────────────────────────────────────────────────┘

System will AUTO-DETECT and use whichever is available:
Priority: Cohere > Hugging Face > Ollama

## 6️⃣ VECTOR DATABASE
┌──────────────────────────────────────────────┐
│ PostgreSQL + pgvector                        │
├──────────────────────────────────────────────┤
│ Database: PostgreSQL 12+                     │
│ Extension: pgvector (vector storage)         │
│ Cost: FREE (self-hosted) or ~$15/mo (cloud)  │
│                                              │
│ Stores:                                      │
│ ├─ extracted_text_embedding (384/768 dims)   │
│ ├─ diagnosis_embedding (384/768 dims)        │
│ └─ medication_embedding (384/768 dims)       │
│                                              │
│ Indexes:                                     │
│ ├─ HNSW index for fast search                │
│ ├─ Cosine similarity operator (<=>)          │
│ └─ 100ms to find similar docs                │
└──────────────────────────────────────────────┘

## 7️⃣ AI CHAT & SUMMARIES
┌──────────────────────────────────────────────┐
│ Gemini API (Google)                          │
├──────────────────────────────────────────────┤
│ Tool: google.generativeai                    │
│ Model: gemini-1.5-flash                      │
│ Cost: FREE tier available                    │
│ Use: Chat about medical documents            │
│      Generate health summaries               │
│      Medical term explanations               │
│      Specialist recommendations              │
│                                              │
│ Setup: Set GEMINI_API_KEY in .env            │
│ Free tier: 60 requests per minute            │
└──────────────────────────────────────────────┘

## 8️⃣ WEB FRAMEWORK
┌──────────────────────────────────────────────┐
│ FastAPI                                      │
├──────────────────────────────────────────────┤
│ Framework: FastAPI 0.104.1                   │
│ Cost: FREE (open-source)                     │
│ Server: Uvicorn                              │
│ Features: REST API, auto-docs, validation    │
│                                              │
│ Dependencies:                                │
│ ├─ pydantic (request validation)             │
│ ├─ sqlalchemy (ORM)                          │
│ ├─ python-dotenv (config)                    │
│ └─ aiofiles (async file handling)            │
└──────────────────────────────────────────────┘

## 9️⃣ DATA VALIDATION
┌──────────────────────────────────────────────┐
│ Pydantic                                     │
├──────────────────────────────────────────────┤
│ Tool: pydantic 2.5.0                         │
│ Cost: FREE (open-source)                     │
│ Purpose: Request/response validation         │
│          Type checking                       │
│          API documentation                   │
└──────────────────────────────────────────────┘

## 🔟 IMAGE PROCESSING
┌──────────────────────────────────────────────┐
│ Image Enhancement & Preprocessing            │
├──────────────────────────────────────────────┤
│ Primary: OpenCV (cv2)                        │
│ ├─ Grayscale conversion                      │
│ ├─ CLAHE (Contrast Limited Adaptive         │
│ │  Histogram Equalization)                   │
│ ├─ Denoising                                 │
│ └─ Thresholding                              │
│                                              │
│ Secondary: Pillow (PIL)                      │
│ ├─ Image format conversion                   │
│ ├─ Basic image operations                    │
│ └─ Metadata extraction                       │
│                                              │
│ Cost: FREE (open-source)                     │
└──────────────────────────────────────────────┘

---

## 📊 COMPLETE COST BREAKDOWN

┌─────────────────────────────────────────────────────────┐
│ Component              │ Cost/Month  │ Status          │
├─────────────────────────────────────────────────────────┤
│ Tesseract OCR          │ $0          │ FREE            │
│ PDF Conversion         │ $0          │ FREE            │
│ Cohere Embeddings      │ $0          │ 100K calls FREE │
│ HuggingFace (local)    │ $0          │ FREE            │
│ Ollama (local)         │ $0          │ FREE            │
│ pgvector (self-hosted) │ $0          │ FREE            │
│ Gemini API (free tier) │ $0          │ FREE            │
│ FastAPI                │ $0          │ FREE            │
│ OpenCV                 │ $0          │ FREE            │
│ Pillow                 │ $0          │ FREE            │
│ Pydantic               │ $0          │ FREE            │
├─────────────────────────────────────────────────────────┤
│ TOTAL                  │ $0          │ 100% FREE       │
└─────────────────────────────────────────────────────────┘

*Add PostgreSQL cloud DB cost if not self-hosted (~$15/mo)

---

## 🔗 COMPLETE DATA FLOW WITH TOOLS

```
1. USER UPLOADS DOCUMENT
   └─ FastAPI receives file
      └─ python-multipart parses request

2. PDF PROCESSING
   └─ pdf2image converts PDF → PNG
      └─ Stored in filesystem

3. IMAGE PREPROCESSING
   └─ OpenCV (cv2):
      ├─ Grayscale conversion
      ├─ CLAHE enhancement
      ├─ Denoising
      └─ Thresholding

4. TEXT EXTRACTION (OCR)
   └─ Tesseract (or Google Vision if enabled):
      ├─ Extract text from image
      ├─ Calculate confidence score
      └─ Return raw text

5. MEDICAL DATA PARSING
   └─ Regex patterns extract:
      ├─ Patient name
      ├─ Doctor name
      ├─ Medications
      ├─ Diagnosis
      └─ Medical findings

6. VECTOR EMBEDDING GENERATION
   └─ Auto-select available provider:
      ├─ TRY: Cohere API (cloud)
      ├─ IF FAILED: Hugging Face (local)
      ├─ IF FAILED: Ollama (local)
      └─ IF ALL FAIL: Skip embeddings
   
   Then generate 3 embeddings:
   ├─ Extracted text → vector (384/768 dims)
   ├─ Diagnosis → vector (384/768 dims)
   └─ Medications → vector (384/768 dims)

7. DATABASE STORAGE
   └─ SQLAlchemy ORM saves to PostgreSQL:
      ├─ Traditional columns (text, metadata)
      ├─ Vector columns (embeddings)
      └─ Indexes (HNSW for fast search)

8. VECTOR SEARCH
   └─ PostgreSQL pgvector queries:
      ├─ Cosine similarity (<=> operator)
      ├─ HNSW index lookup
      └─ Return top N results

9. AI CHAT
   └─ Gemini API:
      ├─ Vector search finds relevant docs
      ├─ Pass context to Gemini
      └─ Return AI-generated response
```

---

## 🎯 KEY DECISIONS MADE

### OCR Engine
✓ **Tesseract** (default, FREE)
✓ Google Vision (optional, paid but better accuracy)

### Embeddings
✓ **Cohere** - Cloud, easiest setup, 100K free/month
✓ **Hugging Face** - Local, most private, zero cost
✓ **Ollama** - Local, Docker-based, zero cost
→ System auto-selects based on availability

### Vector DB
✓ **PostgreSQL + pgvector** - All-in-one solution
  - No separate vector DB to manage
  - Single database to maintain
  - ACID transactions
  - Can self-host (free)

### AI Model
✓ **Gemini (Google)** - Free tier available
  - 60 req/min free
  - Good for medical queries
  - Alternative: Cohere (also free)

---

## 📦 DEPENDENCIES SUMMARY

### REQUIRED
- fastapi - Web framework
- uvicorn - Server
- sqlalchemy - Database ORM
- pydantic - Validation
- python-dotenv - Config
- python-multipart - File upload

### OCR & IMAGE
- pytesseract - Tesseract wrapper
- opencv-python - Image processing
- pillow - Image format conversion
- pdf2image - PDF to image

### EMBEDDINGS (Choose at least one)
- cohere - Cohere API client
- sentence-transformers - Hugging Face embeddings
- requests - HTTP client (for Ollama)

### VECTOR DB
- pgvector - PostgreSQL vector extension
- psycopg2-binary - PostgreSQL driver

### AI
- google-cloud-generativeai - Gemini API

### DATABASE
- sqlalchemy[postgresql] - PostgreSQL support

---

## ✅ SUMMARY

**You have a completely customizable system where:**

1. ✅ OCR: Tesseract (free, local) + Google Vision option (paid, better)
2. ✅ Embeddings: Cohere (free cloud) OR Hugging Face (free local) OR Ollama (free local)
3. ✅ Vector DB: PostgreSQL + pgvector (self-hosted free)
4. ✅ AI: Gemini (free tier)
5. ✅ Total Cost: **$0/month** if fully local setup

**Everything is modular - you can swap any component!**
