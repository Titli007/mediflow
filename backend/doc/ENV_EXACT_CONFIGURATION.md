EXACT .ENV CONFIGURATION REQUIRED
==================================

## Copy this to your D:\MediFlow\backend\.env file:

```
# ============================================
# REQUIRED API KEYS
# ============================================

# Cohere API Key - For embedding generation (converts text to vectors)
# Get from: https://cohere.ai
# Sign up → Copy API key → Paste here
COHERE_API_KEY=your-cohere-api-key-here

# Google Gemini API Key - For AI Chat, RAG, LLM features
# Get from: https://makersuite.google.com/app/apikey
# Click "Create API Key" → Copy → Paste here
GEMINI_API_KEY=your-gemini-api-key-here

# ============================================
# DATABASE CONFIGURATION
# ============================================

# PostgreSQL connection string
# Format: postgresql://username:password@host:port/database_name
DATABASE_URL=postgresql://user:password@localhost:5432/mediflow

# ============================================
# ENVIRONMENT
# ============================================

# Either 'development' or 'production'
ENVIRONMENT=development

# ============================================
# OCR CONFIGURATION (OPTIONAL)
# ============================================

# Use Google Cloud Vision for better OCR (costs money)
# Default: false (uses free Tesseract)
USE_GOOGLE_VISION=false

# Tesseract OCR path (if using local OCR)
TESSERACT_PATH=tesseract

# ============================================
# FILE UPLOAD
# ============================================

# Where to store uploaded medical documents
UPLOAD_DIRECTORY=./uploads/medical_docs

```

---

## STEP-BY-STEP SETUP

### 1️⃣ Get COHERE_API_KEY (5 minutes)
```
1. Go to https://cohere.ai
2. Click "Sign Up"
3. Create account (use your email)
4. Verify email
5. Go to dashboard → API Keys
6. Copy your key
7. Replace "your-cohere-api-key-here" in .env
```

### 2️⃣ Get GEMINI_API_KEY (3 minutes)
```
1. Go to https://makersuite.google.com/app/apikey
2. Click "Create API Key"
3. Copy the key
4. Replace "your-gemini-api-key-here" in .env
```

### 3️⃣ Set DATABASE_URL
```
Update with your PostgreSQL credentials:
DATABASE_URL=postgresql://postgres:yourpassword@localhost:5432/mediflow
```

---

## WHAT EACH API DOES

| API | Purpose | Status | Cost |
|-----|---------|--------|------|
| COHERE_API_KEY | Generate embeddings (text → vectors) | ✅ REQUIRED | FREE (100K/month) |
| GEMINI_API_KEY | AI Chat, RAG, LLM features | ✅ REQUIRED | FREE tier |

---

## VERIFY YOUR .env IS CORRECT

```bash
# After creating .env, run:
cd backend
python -c "import os; from dotenv import load_dotenv; load_dotenv(); print('COHERE:', 'SET' if os.getenv('COHERE_API_KEY') else 'NOT SET'); print('GEMINI:', 'SET' if os.getenv('GEMINI_API_KEY') else 'NOT SET')"
```

Should show:
```
COHERE: SET
GEMINI: SET
```

---

## START SERVER AFTER SETUP

```bash
cd backend
python -m uvicorn main:app --reload
```

---

**That's it! Your system is ready with all APIs configured.**
