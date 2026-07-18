"""
Database monitoring and debugging utilities
"""

import json
from config.database import SessionLocal
from models.document import Document, User, ExtractionStatus
from sqlalchemy import func
from config.logging_config import get_logger

logger = get_logger(__name__)


def check_database_status():
    """Check database and document status"""
    db = SessionLocal()
    try:
        # Count documents by status
        logger.info("\n" + "="*60)
        logger.info("📊 DATABASE STATUS CHECK")
        logger.info("="*60)
        
        total_docs = db.query(func.count(Document.id)).scalar() or 0
        pending = db.query(func.count(Document.id)).filter(Document.extraction_status == ExtractionStatus.PENDING).scalar() or 0
        processing = db.query(func.count(Document.id)).filter(Document.extraction_status == ExtractionStatus.PROCESSING).scalar() or 0
        completed = db.query(func.count(Document.id)).filter(Document.extraction_status == ExtractionStatus.COMPLETED).scalar() or 0
        failed = db.query(func.count(Document.id)).filter(Document.extraction_status == ExtractionStatus.FAILED).scalar() or 0
        total_users = db.query(func.count(User.id)).scalar() or 0
        
        logger.info(f"\n📈 STATISTICS:")
        logger.info(f"   Total Users: {total_users}")
        logger.info(f"   Total Documents: {total_docs}")
        logger.info(f"   ├─ ⏳ PENDING: {pending}")
        logger.info(f"   ├─ 🔄 PROCESSING: {processing}")
        logger.info(f"   ├─ ✅ COMPLETED: {completed}")
        logger.info(f"   └─ ❌ FAILED: {failed}")
        
        # Get all documents
        logger.info(f"\n📋 ALL DOCUMENTS:")
        documents = db.query(Document).all()
        if documents:
            for doc in documents:
                logger.info(f"\n   Document ID: {doc.id}")
                logger.info(f"   ├─ Filename: {doc.file_name}")
                logger.info(f"   ├─ Status: {doc.extraction_status.value}")
                logger.info(f"   ├─ User ID: {doc.user_id}")
                logger.info(f"   ├─ File Size: {doc.file_size} bytes")
                logger.info(f"   ├─ Confidence: {doc.confidence_score}")
                logger.info(f"   ├─ Uploaded: {doc.uploaded_at}")
                logger.info(f"   ├─ Extracted: {doc.extracted_at}")
                if doc.extracted_text:
                    logger.info(f"   ├─ Text Length: {len(doc.extracted_text)} chars")
                    logger.info(f"   ├─ Text Preview: {doc.extracted_text[:100]}...")
                if doc.patient_name:
                    logger.info(f"   ├─ Patient: {doc.patient_name}")
                if doc.doctor_name:
                    logger.info(f"   ├─ Doctor: {doc.doctor_name}")
                if doc.extraction_error:
                    logger.info(f"   └─ Error: {doc.extraction_error}")
        else:
            logger.info("   (No documents found)")
        
        logger.info("\n" + "="*60)
        
    finally:
        db.close()


def print_document_details(document_id: int):
    """Print detailed information about a specific document"""
    db = SessionLocal()
    try:
        document = db.query(Document).filter(Document.id == document_id).first()
        
        if not document:
            logger.error(f"❌ Document {document_id} not found in database!")
            return
        
        logger.info("\n" + "="*60)
        logger.info(f"📄 DOCUMENT DETAILS (ID: {document_id})")
        logger.info("="*60)
        
        logger.info(f"\n📋 BASIC INFO:")
        logger.info(f"   Filename: {document.file_name}")
        logger.info(f"   File Path: {document.file_path}")
        logger.info(f"   File Size: {document.file_size} bytes")
        logger.info(f"   MIME Type: {document.mime_type}")
        logger.info(f"   Document Type: {document.document_type.value}")
        
        logger.info(f"\n🔄 STATUS:")
        logger.info(f"   Status: {document.extraction_status.value}")
        logger.info(f"   Uploaded At: {document.uploaded_at}")
        logger.info(f"   Extracted At: {document.extracted_at}")
        logger.info(f"   Confidence Score: {document.confidence_score}")
        
        if document.extraction_error:
            logger.info(f"\n❌ ERROR:")
            logger.info(f"   {document.extraction_error}")
        
        if document.extracted_text:
            logger.info(f"\n📝 EXTRACTED TEXT ({len(document.extracted_text)} chars):")
            logger.info(f"   {document.extracted_text[:200]}...")
        
        logger.info(f"\n👤 EXTRACTED DATA:")
        logger.info(f"   Patient Name: {document.patient_name}")
        logger.info(f"   Patient DOB: {document.patient_dob}")
        logger.info(f"   Doctor Name: {document.doctor_name}")
        logger.info(f"   Diagnosis: {document.diagnosis}")
        logger.info(f"   Medical Findings: {document.medical_findings}")
        
        if document.medication_names:
            logger.info(f"\n💊 MEDICATIONS:")
            try:
                meds = json.loads(document.medication_names)
                for med in meds:
                    logger.info(f"   • {med}")
            except:
                logger.info(f"   {document.medication_names}")
        
        if document.extracted_metadata:
            logger.info(f"\n📊 EXTRACTED METADATA:")
            try:
                metadata = json.loads(document.extracted_metadata)
                for key, value in metadata.items():
                    if isinstance(value, str) and len(value) > 100:
                        logger.info(f"   {key}: {value[:100]}...")
                    else:
                        logger.info(f"   {key}: {value}")
            except:
                logger.info(f"   {document.extracted_metadata}")
        
        logger.info("\n" + "="*60)
        
    finally:
        db.close()


if __name__ == "__main__":
    check_database_status()
