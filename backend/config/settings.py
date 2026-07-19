import os
from dotenv import load_dotenv

load_dotenv()

# Database
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./test.db")

# File uploads
UPLOAD_DIRECTORY = os.getenv("UPLOAD_DIRECTORY", "./uploads/medical_docs")
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB
ALLOWED_EXTENSIONS = {"pdf", "jpg", "jpeg", "png", "gif", "bmp", "tiff"}

# AI/OCR
GOOGLE_VISION_API_KEY = os.getenv("GOOGLE_VISION_API_KEY", "")
USE_GOOGLE_VISION = os.getenv("USE_GOOGLE_VISION", "false").lower() == "true"
USE_TESSERACT = os.getenv("USE_TESSERACT", "true").lower() == "true"
TESSERACT_PATH = os.getenv("TESSERACT_PATH", "tesseract")  # Windows: "C:\\Program Files\\Tesseract-OCR\\tesseract.exe"
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-3.1-flash-lite")

# API
API_TITLE = "Medical Document Extraction API"
API_VERSION = "1.0.0"

# Extraction confidence thresholds
MIN_CONFIDENCE_SCORE = 0.6
