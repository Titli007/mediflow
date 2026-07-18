API KEYS REFERENCE
==================

## 🔑 REQUIRED API KEYS

### 1. COHERE API KEY (REQUIRED - for embeddings)

**Purpose:** Convert medical text into vectors for semantic search

**Sign Up:**
1. Go to https://cohere.ai
2. Click "Sign Up" (free account)
3. Verify email
4. Go to Dashboard → API Keys
5. Copy your API key

**Example Key Format:**
```
cohere_api_key_a1b2c3d4e5f6g7h8i9j0
```

**Add to .env:**
```
COHERE_API_KEY=cohere_api_key_a1b2c3d4e5f6g7h8i9j0
```

**Free Tier:**
- 100,000 API calls per month
- Each document = 3 calls (text + diagnosis + medications)
- Free for ~33,000 documents/month

**Paid Tier (if needed):**
- $2 per million additional requests

---

### 2. GEMINI API KEY (OPTIONAL - for AI chat)

**Purpose:** Answer medical questions using AI (optional feature)

**Sign Up:**
1. Go to https://makersuite.google.com/app/apikey
2. Click "Create API key"
3. Copy your API key

**Example Key Format:**
```
AIzaSyD_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5
```

**Add to .env (optional):**
```
GEMINI_API_KEY=AIzaSyD_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5
```

**Free Tier:**
- Good for testing
- 60 requests per minute
- Works well for medical Q&A

**When NOT needed:**
- System works 100% fine without it
- Document extraction: ✓ Works
- Vector search: ✓ Works
- Semantic similarity: ✓ Works
- Only AI chat needs it

---

### 3. GOOGLE CLOUD VISION KEY (OPTIONAL - for better OCR)

**Purpose:** Better text recognition (uses Cloud Vision instead of local Tesseract)

**Sign Up:**
1. Go to https://console.cloud.google.com
2. Create a new project
3. Enable "Cloud Vision API"
4. Go to "Credentials" → "Create Service Account"
5. Download JSON key file

**Add to .env (if using):**
```
USE_GOOGLE_VISION=true
GOOGLE_VISION_API_KEY=your-json-key-here
```

**Cost:**
- 1,000 images/month free
- $1.50 per 1,000 images after free tier

**When NOT needed:**
- Default Tesseract works well (~85-90% accuracy)
- Use this only if you need 95-98% accuracy

---

## .env FILE EXAMPLE

Create `backend/.env`:

```
# ============ REQUIRED ============
COHERE_API_KEY=cohere_api_key_your_key_here
DATABASE_URL=postgresql://user:password@localhost:5432/mediflow

# ============ OPTIONAL ============
GEMINI_API_KEY=AIzaSyD_your_key_here

# ============ OPTIONAL OCR ============
USE_GOOGLE_VISION=false
GOOGLE_VISION_API_KEY=your-google-key

# ============ DEFAULT ============
UPLOAD_DIRECTORY=./uploads/medical_docs
TESSERACT_PATH=tesseract
```

---

## ✅ SETUP CHECKLIST

- [ ] Get Cohere API key from https://cohere.ai (REQUIRED)
- [ ] Add COHERE_API_KEY to .env
- [ ] Get Gemini key from https://makersuite.google.com/app/apikey (OPTIONAL)
- [ ] Add GEMINI_API_KEY to .env (optional)
- [ ] PostgreSQL installed and running
- [ ] DATABASE_URL set in .env
- [ ] pip install -r requirements.txt
- [ ] python -m uvicorn main:app --reload
- [ ] Visit http://localhost:8000/docs

---

## 🧪 TEST API KEYS

### Test Cohere Key
```bash
curl -X POST "http://localhost:8000/api/documents/upload" \
  -F "file=@test.pdf" \
  -F "document_type=prescription"
```

Check logs for:
```
Cohere embedding service initialized
Successfully generated all embeddings
```

If error:
- Check COHERE_API_KEY is correct
- Check internet connection
- Check API usage at https://dashboard.cohere.ai

### Test Gemini Key (optional)
```bash
curl -X POST "http://localhost:8000/api/ai/chat" \
  -H "Content-Type: application/json" \
  -d '{"query": "What is diabetes?"}'
```

If error or not needed:
- System works without it
- All other features work fine

---

## 💡 KEY DETAILS

| Key | Required? | Cost | Gets From |
|-----|-----------|------|-----------|
| COHERE_API_KEY | YES | FREE (100K/mo) | https://cohere.ai |
| GEMINI_API_KEY | NO | FREE (tier) | https://makersuite.google.com |
| GOOGLE_VISION_API_KEY | NO | PAID ($1.50/1K) | https://console.cloud.google.com |
| DATABASE_URL | YES | FREE (self) | PostgreSQL setup |

---

## 🚨 TROUBLESHOOTING

### "COHERE_API_KEY not set"
```
Solution: Add key to .env and restart server
```

### "Invalid Cohere API key"
```
Check: Copy key again from https://dashboard.cohere.ai
       Restart server
```

### "Cohere quota exceeded"
```
You've used >100K calls this month
Solution: Upgrade to Cohere paid tier or wait for next month
Cost: $2 per million additional requests
```

### "Gemini key not working"
```
Check: Key is optional, system works without it
       If you want AI chat, verify key at https://makersuite.google.com
       Restart server
```

---

## 📊 COST ESTIMATE

### Minimal Setup (REQUIRED only)
```
Cohere: FREE tier (100K calls/month)
PostgreSQL: FREE (self-hosted)
Tesseract: FREE (local)
TOTAL: $0/month
```

### With AI Chat
```
Cohere: FREE tier
Gemini: FREE tier (60 req/min)
TOTAL: $0/month
```

### High Volume (>100K calls/month)
```
Cohere: $2 per million requests after free tier
PostgreSQL: $50/month (managed)
Total: ~$15-50/month depending on volume
```

---

## 📌 QUICK START

```bash
# 1. Get Cohere key (5 minutes)
# Go to https://cohere.ai, sign up free, copy key

# 2. Create .env
echo "COHERE_API_KEY=your-key-here" > backend/.env
echo "DATABASE_URL=postgresql://user:pass@localhost:5432/mediflow" >> backend/.env

# 3. Install & Run
pip install -r requirements.txt
python -m uvicorn main:app --reload

# 4. Done! System is ready
```

---

**That's all you need!** Everything else is built-in. 🚀
