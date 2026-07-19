from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from config.database import engine, Base, init_db
from config.settings import API_TITLE, API_VERSION
from config.logging_config import get_logger
from routes.documents import router as documents_router
from routes.vector_search import router as vector_search_router
from models.document import User, Document
from models.appointment import Appointment
from models.reminder import Reminder
from routes.auth import router as auth_router
from routes.appointment import router as appointment_router
from routes.reminder import router as reminder_router
from routes.timeline import router as timeline_router
from routes.dashboard import router as dashboard_router
from routes.ai import router as ai_router
from routes.specialist import router as specialist_router
from routes.biometrics import router as biometrics_router
import database_monitor

logger = get_logger(__name__)

# Initialize database (migrations + table creation)
try:
    init_db()
except Exception as e:
    logger.error(f"Failed to initialize database: {str(e)}")
    logger.warning("Continuing without full initialization")

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=API_TITLE,
    version=API_VERSION,
    description="Medical document extraction and OCR service"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(documents_router)
app.include_router(vector_search_router)  # NEW: Vector search endpoints
app.include_router(auth_router)
app.include_router(appointment_router)
app.include_router(reminder_router)
app.include_router(timeline_router)
app.include_router(dashboard_router)
app.include_router(ai_router)
app.include_router(specialist_router)
app.include_router(biometrics_router)

app.include_router(reminder_router)
app.include_router(timeline_router)
app.include_router(dashboard_router)
app.include_router(ai_router)

logger.info("🚀 FastAPI application initialized")


@app.on_event("startup")
async def startup_event():
    logger.info("🌍 Application startup event triggered")
    logger.info(f"📊 Checking database status...")
    database_monitor.check_database_status()


@app.get("/")
async def root():
    return {
        "title": API_TITLE,
        "version": API_VERSION,
        "endpoints": {
            "upload": "POST /api/documents/upload",
            "check_status": "GET /api/documents/status/{document_id}",
            "get_document": "GET /api/documents/{document_id}",
            "get_text": "GET /api/documents/{document_id}/text",
            "get_metadata": "GET /api/documents/{document_id}/metadata",
            "list_user_docs": "GET /api/documents/user/{user_id}/all",
            "delete_document": "DELETE /api/documents/{document_id}",
            "debug_status": "GET /debug/database",
            "debug_document": "GET /debug/document/{document_id}",
        }
    }


@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "Medical Document Extraction API"}


@app.get("/debug/database")
async def debug_database():
    """Debug endpoint: Check all documents in database"""
    logger.info("🔍 Debug request: Database status")
    database_monitor.check_database_status()
    return {"message": "Check server logs for database status"}


@app.get("/debug/document/{document_id}")
async def debug_document(document_id: int):
    """Debug endpoint: Get detailed info about a specific document"""
    logger.info(f"🔍 Debug request: Document {document_id} details")
    database_monitor.print_document_details(document_id)
    return {"message": f"Check server logs for document {document_id} details"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
