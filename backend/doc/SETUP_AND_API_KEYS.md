SETUP & API KEYS GUIDE
======================

## 📋 QUICK OVERVIEW

Your medical document extraction system uses:

**Embeddings (Text → Vectors):**
- Tool: Cohere API
- Cost: FREE (100,000 API calls/month)
- Model: embed-english-v3.0
- Dimensions: 384

**Vector Database:**
- Tool: PostgreSQL + pgvector
- Cost: FREE (self-hosted)
- Storage: Semantic vectors + full text

**AI Chat (Optional):**
- Tool: Google Gemini
- Cost: FREE (free tier available)

---

## 🔑 API KEYS NEEDED

### 1. COHERE API KEY (REQUIRED for embeddings)

**What it is:** Free API service that converts medical text into vectors

**How to get:**
1. Go to https://cohere.ai
2. Click "Sign Up" (free)
3. Create account
4. Go to API Keys page
5. Copy your API key

**What it looks like:**
```
cohere_api_key_abcdef123456789xyz
```

**Where to put it:**
Create `.env` file in `backend/` folder:
```
COHERE_API_KEY=cohere_api_key_abcdef123456789xyz
```

**Cost:**
- FREE tier: 100,000 API calls per month
- Each document = 3 API calls (text + diagnosis + medications)
- 100,000 calls = ~33,000 documents
- If you exceed: $2 per million requests

---

### 2. GEMINI API KEY (OPTIONAL - for AI chat only)

**What it is:** Google's AI model for answering medical questions

**How to get:**
1. Go to https://makersuite.google.com/app/apikey
2. Click "Create API key"
3. Copy your key

**What it looks like:**
```
AIzaSyD_abcdef123456789xyz
```

**Where to put it:**
```
GEMINI_API_KEY=AIzaSyD_abcdef123456789xyz
```

**Cost:**
- FREE tier: Good for testing
- Paid: $0.075 per 1M input tokens

**Note:** Only needed if you want AI chat features. Without it, the system still works fine for document extraction and vector search.

---

### 3. GOOGLE CLOUD VISION KEY (OPTIONAL - for better OCR)

**What it is:** Google's OCR service (more accurate than Tesseract)

**How to get:**
1. Go to https://console.cloud.google.com
2. Create new project
3. Enable "Cloud Vision API"
4. Create service account
5. Download JSON key

**Cost:**
- FREE tier: 1,000 requests/month free
- Paid: $1.50 per 1,000 images

**Where to put it:**
```
USE_GOOGLE_VISION=true
GOOGLE_VISION_API_KEY=your-key-here
```

**Note:** Optional. Default (Tesseract OCR) is free and works well. Only use this if you need better accuracy.

---

## 📝 COMPLETE SETUP STEPS

### Step 1: Clone/Get Code
```bash
cd backend
```

### Step 2: Get Cohere API Key
1. Go to https://cohere.ai
2. Sign up (free)
3. Get your API key

### Step 3: Create .env File
Create `backend/.env` with:

```
# REQUIRED
COHERE_API_KEY=your-cohere-key-here
DATABASE_URL=postgresql://user:password@localhost:5432/mediflow

# OPTIONAL
GEMINI_API_KEY=your-gemini-key-here

# Optional OCR upgrade
USE_GOOGLE_VISION=false
GOOGLE_VISION_API_KEY=your-google-vision-key-here

# File storage
UPLOAD_DIRECTORY=./uploads/medical_docs

# Tesseract path (Windows users may need to set)
TESSERACT_PATH=tesseract
```

### Step 4: Install Dependencies
```bash
pip install -r requirements.txt
```

### Step 5: Setup PostgreSQL

**Option A: Local PostgreSQL**
```bash
# Windows: Download from https://www.postgresql.org/download/windows/
# Mac: brew install postgresql
# Linux: sudo apt-get install postgresql postgresql-contrib

# Start PostgreSQL
# Then create database:
psql -U postgres -c "CREATE DATABASE mediflow;"
```

**Option B: Docker PostgreSQL**
```bash
docker run --name postgres -e POSTGRES_PASSWORD=password -p 5432:5432 -d postgres:15
docker exec postgres psql -U postgres -c "CREATE DATABASE mediflow;"
```

### Step 6: Start Server
```bash
python -m uvicorn main:app --reload
```

On startup, the system will:
- ✅ Connect to PostgreSQL
- ✅ Install pgvector extension
- ✅ Create all tables
- ✅ Ready for uploads!

---

## ✅ CHECKLIST

- [ ] Got Cohere API key from https://cohere.ai
- [ ] Created `.env` file with COHERE_API_KEY
- [ ] PostgreSQL running (local or Docker)
- [ ] Installed requirements: `pip install -r requirements.txt`
- [ ] Server started: `python -m uvicorn main:app --reload`
- [ ] Visit http://localhost:8000/docs (see all APIs)

---

## 🧪 TEST IT

### 1. Check Health
```bash
curl http://localhost:8000/api/documents/health/vector-search
```

Expected response:
```json
{
  "status": "healthy",
  "embedding_service_available": true,
  "pgvector_enabled": true
}
```

### 2. Upload Test Document
```bash
curl -X POST "http://localhost:8000/api/documents/upload" \
  -F "file=@prescription.pdf" \
  -F "document_type=prescription" \
  -F "user_id=1"
```

Check logs to see embedding generation:
```
Cohere embedding service initialized
Successfully generated all embeddings
Document saved with 3 embeddings
```

### 3. Semantic Search
```bash
curl -X POST "http://localhost:8000/api/documents/search/semantic?user_id=1" \
  -H "Content-Type: application/json" \
  -d '{"query": "Type 2 diabetes"}'
```

---

## 🚨 TROUBLESHOOTING

### "COHERE_API_KEY not set"
**Problem:** Cohere key not configured

**Solution:**
1. Get key from https://cohere.ai
2. Add to `.env`: `COHERE_API_KEY=your-key`
3. Restart server

---

### "Failed to initialize Cohere client"
**Problem:** Invalid API key or network issue

**Solution:**
1. Double-check key in `.env` (copy from Cohere dashboard)
2. Check internet connection
3. Restart server

---

### "pgvector extension not found"
**Problem:** PostgreSQL pgvector not installed

**Solution:**
```bash
# Connect to PostgreSQL
psql -d mediflow

# Install extension
CREATE EXTENSION IF NOT EXISTS vector;

# Verify
SELECT 1 FROM pg_extension WHERE extname = 'vector';

# Exit
\q
```

---

### "Database connection failed"
**Problem:** PostgreSQL not running or wrong credentials

**Solution:**
```bash
# Check DATABASE_URL in .env
# Format: postgresql://username:password@host:port/database_name

# Example:
DATABASE_URL=postgresql://postgres:password@localhost:5432/mediflow

# Test connection:
psql postgresql://postgres:password@localhost:5432/mediflow
```

---

### "No embeddings generated"
**Problem:** Cohere API not responding

**Solution:**
1. Check COHERE_API_KEY is correct
2. Check API usage at https://dashboard.cohere.ai (not exceeded 100K/month)
3. Check logs for error message
4. Restart server

---

## 📊 ARCHITECTURE

```
Upload PDF/Image
    ↓
OCR Extraction (Tesseract or Google Vision)
    ├─ Extract text
    ├─ Parse patient/doctor/diagnosis
    ├─ Extract medications
    ↓
Cohere API (COHERE_API_KEY)
    ├─ Text → Vector (384 dims)
    ├─ Diagnosis → Vector
    ├─ Medications → Vector
    ↓
PostgreSQL + pgvector
    ├─ Store text + vectors
    ├─ Create HNSW indexes
    ↓
Search & Retrieval
    ├─ Semantic search
    ├─ Similar documents
    ├─ Medication synonyms
    ↓
Optional: Gemini AI Chat (GEMINI_API_KEY)
    └─ Answer medical questions
```

---

## 💰 MONTHLY COST

```
┌────────────────────────┬──────────────┐
│ Service                │ Cost         │
├────────────────────────┼──────────────┤
│ Cohere Embeddings      │ $0           │
│ (100K calls/month)     │ (FREE TIER)  │
├────────────────────────┼──────────────┤
│ PostgreSQL (self)      │ $0           │
│ (self-hosted)          │ (FREE)       │
├────────────────────────┼──────────────┤
│ Gemini AI Chat         │ $0           │
│ (free tier)            │ (FREE TIER)  │
├────────────────────────┼──────────────┤
│ Tesseract OCR          │ $0           │
│ (local)                │ (FREE)       │
├────────────────────────┼──────────────┤
│ TOTAL                  │ $0           │
│ (for typical usage)    │ (100% FREE)  │
└────────────────────────┴──────────────┘
```

*If you exceed Cohere 100K calls/month: $2 per million requests*
*If you use Google Vision: $1.50 per 1,000 images*
*If you scale to paid Gemini: $0.075 per 1M input tokens*

---

## 🔄 HOW TO UPGRADE

### If Cohere rate limit reached
Cohere offers paid tiers:
- Contact sales@cohere.ai
- $2 per million requests after free tier

### If need better OCR accuracy
Switch to Google Cloud Vision:
```env
USE_GOOGLE_VISION=true
GOOGLE_VISION_API_KEY=your-key
```

### If Gemini free tier limited
Switch to Cohere for AI:
- Also has free tier
- Integrated with embeddings

---

## 📞 SUPPORT

**Cohere Issues:** https://docs.cohere.ai
**PostgreSQL Issues:** https://www.postgresql.org/docs/
**Gemini Issues:** https://ai.google.dev/docs
**This System:** Check logs with `tail -f medical_extraction.log`

---

## 🎯 SUMMARY

**To get started:**
1. Get Cohere API key (5 min, free)
2. Add to `.env`
3. Install requirements
4. Start server
5. Upload documents

**That's it!** Everything else is FREE. 🎉
