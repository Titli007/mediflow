# Medical Document Extraction System - Complete Setup Guide

## Overview

This is a **production-ready FastAPI system** for extracting text from medical documents (prescriptions, MRI scans, CT reports, X-rays, lab reports) using OCR and AI.

### Key Features

✅ **Multiple OCR Engines:**
- Tesseract OCR (free, fast)
- Google Cloud Vision API (more accurate)

✅ **Document Types Supported:**
- Prescriptions
- MRI Reports
- CT Scans
- X-Ray Reports
- Ultrasound Reports
- Lab Reports
- Generic Medical Documents

✅ **Advanced Extraction:**
- Raw text extraction
- Structured data parsing (patient name, doctor, medications, diagnosis)
- Confidence scoring
- Image preprocessing for better accuracy

✅ **Production Features:**
- Background processing (async extraction)
- Database persistence (SQLAlchemy ORM)
- RESTful API
- File validation
- Error handling

---

## Installation & Setup

### 1. Prerequisites

- Python 3.8+
- FFmpeg or pdf2image (for PDF support)

### 2. Install Dependencies

```bash
cd backend
pip install -r requirements.txt
```

### 3. Setup OCR Engine

#### Option A: Tesseract (Recommended for quick start)

**Windows:**
```bash
# Download installer: https://github.com/UB-Mannheim/tesseract/wiki
# Or use chocolatey:
choco install tesseract
# Update TESSERACT_PATH in .env to: C:\Program Files\Tesseract-OCR\tesseract.exe
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt-get install tesseract-ocr
```

**macOS:**
```bash
brew install tesseract
```

#### Option B: Google Cloud Vision API

1. Create a Google Cloud project
2. Enable Vision API
3. Create a service account and download credentials JSON
4. Set environment variables:
   ```bash
   export GOOGLE_APPLICATION_CREDENTIALS="/path/to/credentials.json"
   ```
5. Update .env:
   ```
   USE_GOOGLE_VISION=true
   GOOGLE_VISION_API_KEY=your-api-key
   ```

### 4. Configure Environment

```bash
# Copy example env
cp .env.example .env

# Edit .env with your settings
# - Database URL (SQLite by default)
# - OCR choice (Tesseract or Google Vision)
# - Upload directory
# - Max file size
```

### 5. Initialize Database

```bash
# Database will auto-create on first run (SQLAlchemy)
# For PostgreSQL/MySQL, create the database first
```

---

## Running the Application

### Development Server

```bash
cd backend
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Production Server

```bash
# Using Gunicorn + Uvicorn (recommended)
pip install gunicorn
gunicorn -w 4 -k uvicorn.workers.UvicornWorker main:app --bind 0.0.0.0:8000
```

### Check Health

```bash
curl http://localhost:8000/health
```

---

## API Endpoints

### 1. Upload Document

**Endpoint:** `POST /api/documents/upload`

**Request:**
```bash
curl -X POST "http://localhost:8000/api/documents/upload" \
  -F "file=@prescription.pdf" \
  -F "document_type=prescription" \
  -F "user_id=1"
```

**Parameters:**
- `file` (required): Medical document file
- `document_type` (optional): prescription, mri, ct_scan, x_ray, ultrasound, lab_report, other
- `user_id` (optional): User ID (default: 1)

**Response:**
```json
{
  "document_id": 1,
  "file_name": "prescription.pdf",
  "status": "pending",
  "message": "Document uploaded. Extraction in progress..."
}
```

---

### 2. Check Extraction Status

**Endpoint:** `GET /api/documents/status/{document_id}`

```bash
curl http://localhost:8000/api/documents/status/1
```

**Response:**
```json
{
  "document_id": 1,
  "status": "completed",  // pending, processing, completed, failed
  "confidence_score": 0.87,
  "error_message": null
}
```

---

### 3. Get Full Document

**Endpoint:** `GET /api/documents/{document_id}`

```bash
curl http://localhost:8000/api/documents/1
```

**Response:**
```json
{
  "id": 1,
  "file_name": "prescription.pdf",
  "document_type": "prescription",
  "extraction_status": "completed",
  "confidence_score": 0.87,
  "uploaded_at": "2024-01-15T10:30:00",
  "extracted_at": "2024-01-15T10:35:00",
  "extracted_text": "Patient Name: John Doe...",
  "patient_name": "John Doe",
  "doctor_name": "Dr. Smith",
  "diagnosis": "Hypertension"
}
```

---

### 4. Get Extracted Text

**Endpoint:** `GET /api/documents/{document_id}/text`

```bash
curl http://localhost:8000/api/documents/1/text
```

**Response:**
```json
{
  "document_id": 1,
  "extracted_text": "PRESCRIPTION...",
  "confidence_score": 0.87,
  "status": "completed"
}
```

---

### 5. Get Structured Metadata

**Endpoint:** `GET /api/documents/{document_id}/metadata`

```bash
curl http://localhost:8000/api/documents/1/metadata
```

**Response:**
```json
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
      "frequency": "once daily"
    }
  ],
  "metadata": {
    "date": "2024-01-15",
    "patient_name": "John Doe",
    "doctor_name": "Dr. Smith"
  }
}
```

---

### 6. Get User's Documents

**Endpoint:** `GET /api/documents/user/{user_id}/all`

```bash
curl http://localhost:8000/api/documents/user/1/all?skip=0&limit=20
```

**Response:**
```json
{
  "total": 5,
  "documents": [
    {
      "id": 1,
      "file_name": "prescription.pdf",
      "document_type": "prescription",
      "extraction_status": "completed",
      "confidence_score": 0.87,
      "uploaded_at": "2024-01-15T10:30:00",
      "extracted_at": "2024-01-15T10:35:00"
    }
  ]
}
```

---

### 7. Delete Document

**Endpoint:** `DELETE /api/documents/{document_id}`

```bash
curl -X DELETE http://localhost:8000/api/documents/1
```

**Response:**
```json
{
  "message": "Document deleted successfully"
}
```

---

## Database Schema

### Users Table
```
id (PK)
email (unique)
phone
full_name
created_at
```

### Documents Table
```
id (PK)
user_id (FK)
file_name
file_path
file_size
mime_type
document_type (enum)
document_date
extraction_status (enum)
extracted_text (large text)
extracted_metadata (JSON)
confidence_score (0-1)
extraction_error
patient_name
patient_dob
doctor_name
medication_names (JSON)
dosage_instructions (JSON)
diagnosis
medical_findings
uploaded_at
extracted_at
updated_at
```

---

## Frontend Integration Example

### React/Vue Component for Upload

```javascript
// JavaScript/React example
async function uploadDocument(file, documentType) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('document_type', documentType);
  formData.append('user_id', 1);
  
  const response = await fetch('http://localhost:8000/api/documents/upload', {
    method: 'POST',
    body: formData
  });
  
  const data = await response.json();
  console.log('Document ID:', data.document_id);
  
  // Poll for extraction status
  let status = 'pending';
  while (status !== 'completed' && status !== 'failed') {
    await new Promise(resolve => setTimeout(resolve, 2000));
    const statusResponse = await fetch(
      `http://localhost:8000/api/documents/status/${data.document_id}`
    );
    const statusData = await statusResponse.json();
    status = statusData.status;
    console.log('Status:', status);
  }
  
  // Get final results
  const finalResponse = await fetch(
    `http://localhost:8000/api/documents/${data.document_id}`
  );
  return finalResponse.json();
}
```

---

## Configuration Options

### Database Options

**SQLite (Development):**
```env
DATABASE_URL=sqlite:///./test.db
```

**PostgreSQL (Production):**
```env
DATABASE_URL=postgresql://user:password@localhost:5432/medical_docs
```

**MySQL:**
```env
DATABASE_URL=mysql://user:password@localhost:3306/medical_docs
```

### OCR Quality Settings

```env
# Lower = faster, Higher = more accurate
# Tesseract languages available: eng, fra, deu, spa, ita, jpn, etc.
USE_TESSERACT=true
USE_GOOGLE_VISION=false
MIN_CONFIDENCE_SCORE=0.6  # Reject if confidence < 60%
```

---

## Performance Tips

### 1. Image Preprocessing
The system automatically:
- Converts to grayscale
- Applies contrast enhancement (CLAHE)
- Removes noise
- Applies thresholding

### 2. Async Processing
- Uploads return immediately
- Extraction happens in background
- Use polling or webhooks for status

### 3. Database Indexing
```python
# Add indexes for common queries
db_document.query.filter(Document.user_id == user_id).all()
db_document.query.filter(Document.extraction_status == 'completed').all()
```

### 4. Caching
Consider caching extracted text:
```python
from functools import lru_cache

@lru_cache(maxsize=100)
def get_extracted_text(doc_id):
    return document.extracted_text
```

---

## Troubleshooting

### Issue: Tesseract not found

**Solution:**
```bash
# Windows
pip install pytesseract
# Then install Tesseract OCR from: https://github.com/UB-Mannheim/tesseract/wiki

# Update .env
TESSERACT_PATH=C:\\Program Files\\Tesseract-OCR\\tesseract.exe
```

### Issue: Low confidence scores

**Solution:**
- Ensure good image quality (300+ DPI)
- Crop to document area
- Increase preprocessing: brightness, contrast
- Consider Google Vision API for complex documents

### Issue: Slow extraction

**Solution:**
- Use background tasks (already implemented)
- Optimize image size (compress large PDFs)
- Increase worker processes: `gunicorn -w 8 ...`

### Issue: Out of memory

**Solution:**
```python
# Limit concurrent extractions
from concurrent.futures import ThreadPoolExecutor
executor = ThreadPoolExecutor(max_workers=2)
```

---

## Production Deployment

### Docker Setup

```dockerfile
FROM python:3.11-slim

RUN apt-get update && apt-get install -y tesseract-ocr

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .

CMD ["gunicorn", "-w", "4", "-k", "uvicorn.workers.UvicornWorker", "main:app", "--bind", "0.0.0.0:8000"]
```

### Environment Variables (Production)

```bash
DATABASE_URL=postgresql://user:password@prod-db:5432/medical_docs
USE_GOOGLE_VISION=true
GOOGLE_VISION_API_KEY=sk-xxx
UPLOAD_DIRECTORY=/var/medical_uploads
```

---

## Testing

```bash
# Test document upload and extraction
python test_extraction.py

# Pytest for API endpoints
pytest tests/test_api.py -v
```

---

## License

MIT License - See LICENSE file

---

## Support & Contributions

For issues, questions, or contributions, please contact your development team.
