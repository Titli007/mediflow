# Quick Start Guide

## 5-Minute Setup

### 1. Install Dependencies
```bash
cd backend
pip install -r requirements.txt
```

### 2. Setup Tesseract (choose your OS)

**Windows:**
```bash
# Using Chocolatey:
choco install tesseract
# Or download: https://github.com/UB-Mannheim/tesseract/wiki
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt-get install tesseract-ocr
```

**macOS:**
```bash
brew install tesseract
```

### 3. Create .env file
```bash
cp .env.example .env
# Edit .env if needed (defaults work fine for local development)
```

### 4. Start the Server
```bash
python -m uvicorn main:app --reload --port 8000
```

### 5. Test It
Visit: http://localhost:8000/docs (Interactive API documentation)

---

## Test Upload

### Using cURL:
```bash
curl -X POST "http://localhost:8000/api/documents/upload" \
  -H "accept: application/json" \
  -F "file=@test_prescription.png" \
  -F "document_type=prescription"
```

### Using Python:
```python
import requests

with open('test_prescription.png', 'rb') as f:
    files = {'file': f}
    data = {'document_type': 'prescription'}
    response = requests.post(
        'http://localhost:8000/api/documents/upload',
        files=files,
        data=data
    )
    doc_id = response.json()['document_id']
    print(f"Document ID: {doc_id}")
```

### Check Status:
```bash
curl "http://localhost:8000/api/documents/status/1"
```

---

## Available Document Types

- `prescription` - Medication prescriptions
- `mri` - MRI scan reports
- `ct_scan` - CT scan reports
- `x_ray` - X-ray reports
- `ultrasound` - Ultrasound reports
- `lab_report` - Lab test results
- `other` - Generic medical documents

---

## API Endpoints Summary

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/documents/upload` | Upload a document |
| GET | `/api/documents/status/{id}` | Check extraction status |
| GET | `/api/documents/{id}` | Get full document data |
| GET | `/api/documents/{id}/text` | Get raw extracted text |
| GET | `/api/documents/{id}/metadata` | Get structured metadata |
| GET | `/api/documents/user/{id}/all` | List user's documents |
| DELETE | `/api/documents/{id}` | Delete a document |

---

## Interactive API Docs

Once the server is running:

- **Swagger UI:** http://localhost:8000/docs
- **ReDoc:** http://localhost:8000/redoc

These provide interactive testing of all endpoints!

---

## What Gets Extracted?

For each document, the system extracts:

✅ **Raw Text** - Full text from the document
✅ **Patient Name** - Identified from document
✅ **Doctor Name** - Prescriber information
✅ **Medications** - Medication names and dosages
✅ **Diagnosis** - Medical diagnosis
✅ **Findings** - Medical findings (for imaging)
✅ **Confidence Score** - Accuracy rating (0-1)

---

## Troubleshooting

### Q: I get "Tesseract not found" error
**A:** Install Tesseract OCR for your OS (see step 2 above)

### Q: Extraction returns 0% confidence
**A:** The image quality is too low. Try:
- Higher resolution images
- Better lighting
- Scanner instead of photo

### Q: Very slow extraction
**A:** Processing happens in background. Check status with:
```bash
curl "http://localhost:8000/api/documents/status/{doc_id}"
```

### Q: Want to use Google Vision API?
**A:** Update .env:
```
USE_GOOGLE_VISION=true
GOOGLE_VISION_API_KEY=your-key-here
```

---

## Next Steps

1. Read `SETUP_GUIDE.md` for detailed configuration
2. Check `test_api.py` for comprehensive examples
3. Integrate with your frontend
4. Deploy using Docker (see SETUP_GUIDE.md)

---

## Support

For detailed information, see:
- `SETUP_GUIDE.md` - Complete documentation
- `backend/requirements.txt` - All dependencies
- `.env.example` - Configuration options
