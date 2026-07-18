COMPLETE INTEGRATION TEST - COHERE + PGVECTOR
==============================================

## ✅ STEP-BY-STEP VERIFICATION

### STEP 1: Verify Dependencies

```bash
# Check Python version (3.8+)
python --version

# Check installed packages
pip list | grep -E "cohere|sqlalchemy|pgvector|psycopg2"

# Expected output:
# cohere                 5.3.0
# sqlalchemy             2.0.23
# pgvector               0.2.4
# psycopg2-binary        2.9.9
```

### STEP 2: Set Up Environment

```bash
cd backend

# Copy example .env
cp .env.example .env

# Edit .env with your values:
# COHERE_API_KEY=your-key-from-https://cohere.ai
# DATABASE_URL=postgresql://user:password@localhost:5432/mediflow
```

### STEP 3: Verify Cohere Integration

```bash
python test_cohere_integration.py
```

Expected output:
```
[1] Checking COHERE_API_KEY... ✅ COHERE_API_KEY is set
[2] Checking cohere package... ✅ cohere package is installed
[3] Testing Cohere client... ✅ Cohere client initialized
[4] Testing embedding generation... ✅ Embedding generated successfully!
    Embedding dimensions: 384
[5] Testing EmbeddingService... ✅ EmbeddingService initialized
[6] Testing MedicalEmbeddingProcessor... ✅ All embeddings generated
[7] Checking PostgreSQL... ✅ pgvector extension installed
✅ ALL TESTS PASSED!
```

### STEP 4: Start PostgreSQL

**Option A: Local PostgreSQL**
```bash
# Start PostgreSQL service
# Windows: Services → PostgreSQL
# Mac: brew services start postgresql
# Linux: sudo service postgresql start

# Create database
psql -U postgres -c "CREATE DATABASE mediflow;"

# Install pgvector extension
psql -d mediflow -U postgres -c "CREATE EXTENSION IF NOT EXISTS vector;"
```

**Option B: Docker PostgreSQL**
```bash
docker run --name postgres-mediflow \
  -e POSTGRES_PASSWORD=password \
  -p 5432:5432 \
  -d postgres:15

# Wait 5 seconds for startup
sleep 5

# Create database and extension
docker exec postgres-mediflow psql -U postgres -c "CREATE DATABASE mediflow;"
docker exec postgres-mediflow psql -U postgres -d mediflow -c "CREATE EXTENSION IF NOT EXISTS vector;"
```

### STEP 5: Start FastAPI Server

```bash
python -m uvicorn main:app --reload
```

Expected console output:
```
INFO:     Uvicorn running on http://127.0.0.1:8000
INFO:     Database migrations started...
INFO:     Creating extension IF NOT EXISTS vector...
INFO:     Adding vector columns to documents table...
INFO:     Database initialization complete
INFO:     Application startup event triggered
✓ Cohere embedding service initialized (FREE: 100K calls/month)
```

### STEP 6: Create Test Medical Document

```bash
# Create a sample medical document
cat > backend/test_medical.txt << 'EOF'
PRESCRIPTION
Patient: John Smith
Date: 12/18/2024
Doctor: Dr. Jane Doe

DIAGNOSIS: Type 2 Diabetes Mellitus with Hypertension

MEDICATIONS:
1. Metformin 500mg - twice daily with meals
2. Lisinopril 10mg - once daily in the morning
3. Atorvastatin 20mg - once daily at bedtime

FINDINGS: Patient presents with elevated fasting glucose (156 mg/dL) and blood pressure (145/92 mmHg). 
A1C level indicates good diabetes control over past 3 months.

NOTES: Continue current medications. Schedule follow-up in 3 months.
EOF
```

### STEP 7: Upload Test Document via API

```bash
# Method 1: Using curl
curl -X POST "http://localhost:8000/api/documents/upload?user_id=1&document_type=prescription" \
  -F "file=@backend/test_medical.txt"

# Expected response:
{
  "document_id": 1,
  "file_name": "test_medical.txt",
  "status": "pending",
  "message": "Document uploaded. Extraction in progress..."
}
```

### STEP 8: Monitor Embedding Generation

Watch the logs for Cohere embedding calls:

```bash
# In separate terminal
tail -f medical_extraction.log
```

Expected log output:
```
2024-12-18 10:30:45 - routes.documents - INFO - Upload request received: test_medical.txt
2024-12-18 10:30:46 - routes.documents - INFO - Document record created: ID=1, Status=PENDING
2024-12-18 10:30:47 - routes.documents - INFO - Starting extraction for document_id=1
2024-12-18 10:30:48 - routes.documents - INFO - Extraction successful! Confidence: 98.5%
2024-12-18 10:30:49 - routes.documents - INFO - Generating embeddings via Cohere...
2024-12-18 10:30:50 - services.embedding_service - INFO - Cohere embedding service initialized
2024-12-18 10:30:51 - services.embedding_service - DEBUG - Successfully embedded text (245 chars)
2024-12-18 10:30:52 - services.embedding_service - INFO - Successfully generated all embeddings
2024-12-18 10:30:53 - routes.documents - INFO - Stored extracted_text_embedding (384 dims)
2024-12-18 10:30:54 - routes.documents - INFO - Stored diagnosis_embedding (384 dims)
2024-12-18 10:30:55 - routes.documents - INFO - Stored medication_embedding (384 dims)
2024-12-18 10:30:56 - routes.documents - INFO - Document 1 COMPLETED and saved to database (with embeddings)
```

### STEP 9: Verify Embeddings in Database

```bash
# Connect to PostgreSQL
psql -d mediflow -U postgres

# Check if embeddings were stored
SELECT id, file_name, 
       extracted_text_embedding IS NOT NULL as has_text_embedding,
       diagnosis_embedding IS NOT NULL as has_diagnosis_embedding,
       medication_embedding IS NOT NULL as has_medication_embedding,
       extraction_status
FROM documents;

# Expected output:
 id | file_name         | has_text_embedding | has_diagnosis_embedding | has_medication_embedding | extraction_status
----+-------------------+--------------------+------------------------+-------------------------+-------------------
  1 | test_medical.txt  | t                  | t                       | t                       | completed

# Check vector dimensions
SELECT id, 
       array_length(extracted_text_embedding, 1) as text_dims,
       array_length(diagnosis_embedding, 1) as diagnosis_dims,
       array_length(medication_embedding, 1) as medication_dims
FROM documents
WHERE id = 1;

# Expected output (all 384):
 id | text_dims | diagnosis_dims | medication_dims
----+-----------+----------------+-----------------
  1 |       384 |            384 |             384

# Exit psql
\q
```

### STEP 10: Test Vector Search API

```bash
# Test 1: Get document details (verify embeddings exist)
curl -X GET "http://localhost:8000/api/documents/1"

# Should show all extracted data

# Test 2: Search semantically
curl -X POST "http://localhost:8000/api/documents/search/semantic?user_id=1" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "diabetes medication treatment",
    "limit": 10
  }'

# Expected response: Document 1 should appear with high similarity score

# Test 3: Find similar documents (need 2 documents first)
curl -X GET "http://localhost:8000/api/documents/similar/1?limit=5"

# Expected: Empty or similar docs if any exist

# Test 4: Check medication synonyms
curl -X GET "http://localhost:8000/api/medications/check-synonyms?drug_name=metformin"

# Expected: Should find similar medication names
```

### STEP 11: Upload Another Document for Comparison

```bash
# Create second test document
cat > backend/test_medical2.txt << 'EOF'
PATIENT LAB REPORT
Patient: Jane Doe
Date: 12/18/2024
Doctor: Dr. James Wilson

DIAGNOSIS: Type 2 Diabetes with complications

TESTS:
Fasting Glucose: 158 mg/dL
A1C: 7.2%
LDL Cholesterol: 135 mg/dL
HDL Cholesterol: 38 mg/dL
Triglycerides: 180 mg/dL
Creatinine: 1.1 mg/dL

MEDICATIONS:
- Glucophage (Metformin) 1000mg daily
- Lisinopril 10mg daily
- Atorvastatin 20mg nightly

FINDINGS: Similar glucose control pattern to previous patient.
EOF

# Upload second document
curl -X POST "http://localhost:8000/api/documents/upload?user_id=1&document_type=lab_report" \
  -F "file=@backend/test_medical2.txt"
```

### STEP 12: Test Similar Documents Feature

```bash
# Now find documents similar to document 1
curl -X GET "http://localhost:8000/api/documents/similar/1?limit=10"

# Expected: Document 2 should appear with high similarity (0.8+)
# because both mention Type 2 Diabetes with Metformin

# Response example:
{
  "reference_document_id": 1,
  "reference_file_name": "test_medical.txt",
  "similar_documents": [
    {
      "id": 2,
      "file_name": "test_medical2.txt",
      "patient_name": "Jane Doe",
      "diagnosis": "Type 2 Diabetes with complications",
      "similarity_score": 0.87
    }
  ]
}
```

### STEP 13: Test Medication Synonym Matching

```bash
# Find medication variations
curl -X GET "http://localhost:8000/api/medications/check-synonyms?drug_name=metformin&limit=10"

# Expected: Both documents mention metformin/glucophage
# Response should find both variations
```

---

## 📊 VERIFICATION CHECKLIST

- [ ] test_cohere_integration.py runs successfully
- [ ] All 7 tests in verification script pass
- [ ] PostgreSQL running
- [ ] pgvector extension installed
- [ ] Server starts without errors
- [ ] Document upload returns 200 status
- [ ] Logs show "Cohere embedding service initialized"
- [ ] Logs show "Successfully generated all embeddings"
- [ ] Embeddings stored in database (384 dimensions)
- [ ] SELECT query shows embeddings are NOT NULL
- [ ] Semantic search returns results
- [ ] Similar documents API works
- [ ] Medication synonym matching works

---

## 🔍 DATABASE QUERIES FOR VERIFICATION

```sql
-- Check documents table exists
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name = 'documents';

-- Check vector columns exist
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_name = 'documents' AND column_name LIKE '%embedding%';

-- Check pgvector extension
SELECT * FROM pg_extension WHERE extname = 'vector';

-- Count documents with embeddings
SELECT 
  COUNT(*) as total_docs,
  SUM(CASE WHEN extracted_text_embedding IS NOT NULL THEN 1 ELSE 0 END) as with_embeddings,
  SUM(CASE WHEN diagnosis_embedding IS NOT NULL THEN 1 ELSE 0 END) as with_diagnosis,
  SUM(CASE WHEN medication_embedding IS NOT NULL THEN 1 ELSE 0 END) as with_medications
FROM documents;

-- View all documents with their embedding status
SELECT 
  id, 
  file_name, 
  extraction_status,
  COALESCE(array_length(extracted_text_embedding, 1), 0) as text_dims,
  COALESCE(array_length(diagnosis_embedding, 1), 0) as diag_dims,
  COALESCE(array_length(medication_embedding, 1), 0) as med_dims
FROM documents
ORDER BY id DESC;
```

---

## ✅ SUCCESS CRITERIA

✅ Cohere API key is valid and working
✅ EmbeddingService initializes without errors
✅ Embeddings are generated (384 dimensions)
✅ Embeddings are stored in PostgreSQL
✅ pgvector indexes exist
✅ Semantic search returns results
✅ Similar documents feature works
✅ Logs show all Cohere API calls succeeding
✅ No errors in medical_extraction.log

---

## 🚨 TROUBLESHOOTING

If embeddings are NULL in database:
```
1. Check logs for "Cohere embedding service" message
2. If not initialized, check COHERE_API_KEY is set
3. Run: python test_cohere_integration.py
4. Check Cohere API quota at https://dashboard.cohere.ai
```

If pgvector vectors have wrong dimensions (not 384):
```
1. Cohere model might have changed
2. Check: SELECT MODEL from EmbeddingService
3. Verify model is "embed-english-v3.0"
```

If semantic search returns empty:
```
1. Ensure documents have embeddings (check database)
2. Query embedding must be same dimensions (384)
3. Check min_similarity threshold (default 0.6)
```

---

## 📈 EXPECTED PERFORMANCE

- Embedding generation: ~200-300ms per document via Cohere API
- Database storage: <10ms
- Semantic search: <10ms per query
- Similar documents: <50ms for 10K documents
- Memory usage: ~500MB for 10K documents

---

**All tests passing means your system is production-ready!** 🎉
