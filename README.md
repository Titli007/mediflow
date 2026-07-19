# MediFlow

MediFlow is a medical document workflow app with a FastAPI backend and a React + TypeScript frontend. It supports document upload, OCR/extraction, patient record tracking, appointments, reminders, timeline views, and AI-assisted consultation features.

## Project Structure

- `backend/` - FastAPI service, database models, OCR/extraction logic, AI routes, and API endpoints
- `frontend/` - Vite + React application for the patient-facing UI

## Features

- Medical document upload and extraction
- OCR support with Tesseract and Google Vision
- Vector search and AI-assisted document querying
- Authentication and user dashboard
- Appointments, reminders, and timeline views
- Frontend API integration with token-based auth

## Tech Stack

- Backend: FastAPI, SQLAlchemy, Pydantic, Uvicorn
- AI/OCR: Tesseract, Google Cloud Vision, Gemini, Cohere, pgvector
- Frontend: React 19, TypeScript, Vite, Tailwind CSS, Zustand, Axios

## Prerequisites

- Python 3.10+ recommended
- Node.js 18+ recommended
- Tesseract OCR installed if you want local OCR support
- A `.env` file in `backend/` for API keys and database settings

## Quick Start

### 1. Start the backend

```bash
cd backend
pip install -r requirements.txt
python -m uvicorn main:app --reload --port 8000
```

The API will be available at `http://localhost:8000`.

### 2. Start the frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend will usually run at `http://localhost:5173`.

## Backend Environment

Create `backend/.env` and set the values you need. Common variables include:

```env
DATABASE_URL=sqlite:///./test.db
UPLOAD_DIRECTORY=./uploads/medical_docs
MAX_FILE_SIZE=52428800
USE_TESSERACT=true
USE_GOOGLE_VISION=false
TESSERACT_PATH=tesseract
GOOGLE_VISION_API_KEY=
GEMINI_MODEL=gemini-3.1-flash-lite
MIN_CONFIDENCE_SCORE=0.6
```

## Frontend Notes

- The frontend talks to `http://localhost:8000` by default.
- Authentication tokens are stored in `localStorage` under `mediflow_token`.
- Main app routes include dashboard, documents, appointments, reminders, timeline, and AI consult.

## Useful Backend Endpoints

- `POST /api/documents/upload`
- `GET /api/documents/status/{document_id}`
- `GET /api/documents/{document_id}`
- `GET /api/documents/{document_id}/text`
- `GET /api/documents/{document_id}/metadata`
- `GET /health`

## Development Notes

- Backend documentation is in `backend/doc/`
- Frontend source is in `frontend/src/`
- Build output for the frontend goes to `frontend/dist/`

## License

No license file is currently present in the repository.
