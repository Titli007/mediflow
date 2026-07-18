# Medical Document Extraction System

> **An intelligent FastAPI system for extracting text from medical documents using OCR and AI**

[![FastAPI](https://img.shields.io/badge/FastAPI-v0.104-brightgreen)](https://fastapi.tiangolo.com/)
[![Python](https://img.shields.io/badge/Python-3.8+-blue)](https://www.python.org/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

## 🎯 Quick Overview

Extract structured medical data from prescriptions, MRI scans, X-rays, lab reports, and other medical documents with a single API call.

```bash
# Upload a document
curl -X POST "http://localhost:8000/api/documents/upload" \
  -F "file=@prescription.pdf" \
  -F "document_type=prescription"

# Check extraction status
curl "http://localhost:8000/api/documents/status/1"

# Get extracted data
curl "http://localhost:8000/api/documents/1/metadata"
```

---

## ✨ Features

- **🔄 Multiple OCR Engines**
  - Tesseract OCR (free, offline)
  - Google Cloud Vision (accurate, cloud-based)

- **📄 Document Types**
  - Prescriptions
  - MRI Reports
  - CT Scans
  - X-Ray Reports
  - Ultrasound Reports
  - Lab Reports
  - Generic Medical Documents

- **🧠 Smart Data Extraction**
  - Raw text extraction
  - Patient name identification
  - Doctor/Prescriber detection
  - Medication parsing with dosage
  - Diagnosis extraction
  - Medical findings

- **⚡ Production Ready**
  - Async background processing
  - Database persistence
  - Confidence scoring
  - Error handling
  - File validation
  - RESTful API with OpenAPI docs

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
cd backend
pip install -r requirements.txt
```

### 2. Install OCR Engine
```bash
# macOS
brew install tesseract

# Ubuntu/Debian
sudo apt-get install tesseract-ocr

# Windows (Download & Install)
# https://github.com/UB-Mannheim/tesseract/wiki
```

### 3. Start the Server
```bash
python -m uvicorn main:app --reload --port 8000
```

### 4. Visit Interactive API Docs
```
http://localhost:8000/docs
```

---

## 📚 Documentation

| Document | Purpose |
|----------|---------|
| **QUICKSTART.md** | 5-minute setup guide |
| **SETUP_GUIDE.md** | Complete configuration & deployment |
| **ARCHITECTURE.md** | System design & data flow |

---

## 🔌 API Endpoints

### Upload Document
```http
POST /api/documents/upload

Form Data:
  file: <binary>
  document_type: "prescription" | "mri" | "ct_scan" | ...
  user_id: 1
```

### Check Extraction Status
```http
GET /api/documents/status/{document_id}

Response:
{
  "document_id": 1,
  "status": "completed",
  "confidence_score": 0.87,
  "error_message": null
}
```

### Get Full Document
```http
GET /api/documents/{document_id}

Response:
{
  "id": 1,
  "file_name": "prescription.pdf",
  "document_type": "prescription",
  "extraction_status": "completed",
  "confidence_score": 0.87,
  "patient_name": "John Doe",
  "doctor_name": "Dr. Smith",
  "diagnosis": "Hypertension",
  "extracted_text": "..."
}
```

### Get Extracted Text
```http
GET /api/documents/{document_id}/text
```

### Get Structured Metadata
```http
GET /api/documents/{document_id}/metadata

Response:
{
  "patient_name": "John Doe",
  "doctor_name": "Dr. Smith",
  "diagnosis": "Hypertension",
  "medications": [
    {
      "name": "Lisinopril",
      "dosage": "10 mg",
      "frequency": "once daily"
    }
  ]
}
```

### List User's Documents
```http
GET /api/documents/user/{user_id}/all?skip=0&limit=20
```

### Delete Document
```http
DELETE /api/documents/{document_id}
```

---

## 🛠️ Configuration

Create `.env` file:
```env
# Database
DATABASE_URL=sqlite:///./test.db

# OCR Engine (choose one)
USE_TESSERACT=true
USE_GOOGLE_VISION=false

# File upload
UPLOAD_DIRECTORY=./uploads/medical_docs
MAX_FILE_SIZE=52428800  # 50MB

# Quality threshold
MIN_CONFIDENCE_SCORE=0.6
```

---

## 📊 Example Usage

### Python
```python
import requests

# Upload document
with open('prescription.pdf', 'rb') as f:
    files = {'file': f}
    data = {'document_type': 'prescription'}
    resp = requests.post(
        'http://localhost:8000/api/documents/upload',
        files=files, data=data
    )
    doc_id = resp.json()['document_id']

# Poll for extraction status
import time
while True:
    status_resp = requests.get(
        f'http://localhost:8000/api/documents/status/{doc_id}'
    )
    status = status_resp.json()['status']
    if status in ['completed', 'failed']:
        break
    time.sleep(2)

# Get results
results = requests.get(
    f'http://localhost:8000/api/documents/{doc_id}'
).json()

print(f"Patient: {results['patient_name']}")
print(f"Doctor: {results['doctor_name']}")
print(f"Confidence: {results['confidence_score']:.1%}")
```

### JavaScript/React
```javascript
async function uploadDocument(file, documentType) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('document_type', documentType);
  
  const uploadResp = await fetch(
    'http://localhost:8000/api/documents/upload',
    { method: 'POST', body: formData }
  );
  const { document_id } = await uploadResp.json();
  
  // Poll for status
  let status = 'pending';
  while (status === 'pending' || status === 'processing') {
    await new Promise(r => setTimeout(r, 2000));
    const statusResp = await fetch(
      `http://localhost:8000/api/documents/status/${document_id}`
    );
    status = (await statusResp.json()).status;
  }
  
  // Get results
  const results = await fetch(
    `http://localhost:8000/api/documents/${document_id}`
  );
  return results.json();
}
```

---

## 📦 Database Schema

### Users
| Column | Type | Notes |
|--------|------|-------|
| id | Integer | Primary Key |
| email | String | Unique, Indexed |
| phone | String | Optional |
| full_name | String | Optional |
| created_at | DateTime | Auto |

### Documents
| Column | Type | Notes |
|--------|------|-------|
| id | Integer | Primary Key |
| user_id | Integer | Foreign Key |
| file_name | String | Original filename |
| file_path | String | Storage path |
| file_size | Integer | Bytes |
| mime_type | String | Content type |
| document_type | Enum | prescription, mri, ... |
| extraction_status | Enum | pending, processing, completed, failed |
| extracted_text | Text | Full OCR text |
| extracted_metadata | JSON | Structured data |
| confidence_score | Float | 0-1 |
| extraction_error | Text | Error message |
| patient_name | String | Parsed from document |
| doctor_name | String | Parsed from document |
| diagnosis | String | Parsed from document |
| medication_names | JSON | Array of medications |
| uploaded_at | DateTime | Auto |
| extracted_at | DateTime | Completion time |

---

## 🎨 How It Works

### Image Preprocessing
1. Convert to grayscale
2. Apply CLAHE (contrast enhancement)
3. Denoise
4. Adaptive thresholding

### OCR Extraction
- **Tesseract**: Fast, offline, good for clear documents
- **Google Vision**: More accurate, handles complex layouts

### Data Parsing
- Regex patterns for structured fields
- Medication parsing (name, dosage, frequency)
- Date/phone/email extraction
- Diagnosis & findings identification

### Quality Scoring
- Based on OCR confidence
- Bonus for extracted content length
- Penalties for suspicious patterns

---

## 🔐 Security

- ✅ File type validation
- ✅ File size limits
- ✅ Unique filename generation (prevents path traversal)
- ✅ Database prepared statements
- ✅ Input validation (Pydantic)

**Production additions needed:**
- Authentication/Authorization
- HTTPS/TLS
- Rate limiting
- HIPAA compliance (if required)

---

## 📈 Performance

| Operation | Time |
|-----------|------|
| Image preprocessing | ~200ms |
| Tesseract OCR (per page) | 2-5s |
| Google Vision (per image) | 1-2s |
| Data parsing | ~100ms |
| Database query | ~5ms |

---

## 🐳 Docker Deployment

```dockerfile
FROM python:3.11-slim

RUN apt-get update && apt-get install -y tesseract-ocr

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .

CMD ["gunicorn", "-w", "4", "-k", "uvicorn.workers.UvicornWorker", \
     "main:app", "--bind", "0.0.0.0:8000"]
```

```bash
docker build -t medical-extractor .
docker run -p 8000:8000 -v uploads:/app/uploads medical-extractor
```

---

## 🐛 Troubleshooting

| Problem | Solution |
|---------|----------|
| "Tesseract not found" | Install from: https://github.com/UB-Mannheim/tesseract/wiki |
| Low confidence scores | Use higher quality images (300+ DPI) |
| Slow extraction | Use background tasks (already implemented) |
| PDF support missing | Install: `pip install pdf2image` |

---

## 📝 What's Extracted

### Always
- ✅ Raw text from document
- ✅ Confidence score
- ✅ Document type
- ✅ Upload timestamp

### Prescription
- 📋 Patient name
- 👨‍⚕️ Doctor/Prescriber name
- 💊 Medication names
- 📊 Dosages
- ⏱️ Frequency
- 📝 Instructions

### Medical Reports
- 👤 Patient information
- 🏥 Medical facility
- 🔬 Test results
- 📊 Findings
- 💬 Diagnosis

---

## 🚦 Status Codes

- **pending** - Uploaded, waiting to be processed
- **processing** - OCR in progress
- **completed** - Successfully extracted
- **failed** - Extraction failed (see error_message)

---

## 📞 Support

For detailed documentation:
- Read `QUICKSTART.md` for 5-minute setup
- Read `SETUP_GUIDE.md` for full configuration
- Read `ARCHITECTURE.md` for system design
- Check `test_api.py` for API examples

---

## 📄 License

MIT License - See LICENSE file

---

## 🎯 Next Steps

1. ✅ Complete QUICKSTART.md
2. ✅ Configure your OCR engine
3. ✅ Start the server
4. ✅ Visit `/docs` for interactive API testing
5. ✅ Integrate with your frontend
6. ✅ Deploy to production

---

**Made with ❤️ for medical data extraction**
