import os
import uuid
from datetime import datetime
from fastapi import APIRouter, UploadFile, File, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from config.database import get_db
from config.settings import UPLOAD_DIRECTORY, ALLOWED_EXTENSIONS, MAX_FILE_SIZE
from config.logging_config import get_logger
from models.document import Document, DocumentType, ExtractionStatus, User
from schemas.document import (
    DocumentResponseSchema,
    DocumentListSchema,
    ExtractionStatusSchema,
    DocumentUploadSchema,
)
from services.extraction_service import DocumentExtractor
import json

router = APIRouter(prefix="/api/documents", tags=["documents"])
logger = get_logger(__name__)


def ensure_upload_directory():
    """Create upload directory if it doesn't exist"""
    os.makedirs(UPLOAD_DIRECTORY, exist_ok=True)


def validate_file(file: UploadFile) -> bool:
    """Validate file type and size"""
    if file.size and file.size > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail=f"File too large. Max size: {MAX_FILE_SIZE / 1024 / 1024}MB")
    
    file_ext = file.filename.split(".")[-1].lower()
    if file_ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type. Allowed: {', '.join(ALLOWED_EXTENSIONS)}"
        )
    
    return True


async def process_document_extraction(
    document_id: int,
    file_path: str,
    doc_type: str,
    db: Session
):
    """Background task to process document extraction"""
    logger.info(f"🔄 Starting extraction for document_id={document_id}")
    logger.debug(f"   File path: {file_path}")
    logger.debug(f"   Document type: {doc_type}")
    
    try:
        db_document = db.query(Document).filter(Document.id == document_id).first()
        if not db_document:
            logger.error(f"❌ Document {document_id} not found in database!")
            return
        
        logger.info(f"✅ Document record found in DB: {db_document.file_name}")
        
        # Update status to processing
        db_document.extraction_status = ExtractionStatus.PROCESSING
        db.commit()
        logger.info(f"📝 Updated status to PROCESSING for document_id={document_id}")
        
        # Extract text based on file type
        file_ext = file_path.split(".")[-1].lower()
        logger.info(f"🔍 File extension: {file_ext}")
        
        if file_ext == "pdf":
            logger.info(f"📄 Processing PDF file...")
            result = DocumentExtractor.extract_from_pdf(file_path, doc_type)
        else:
            logger.info(f"🖼️  Processing image file...")
            result = DocumentExtractor.extract_from_image(file_path, doc_type)
        
        logger.debug(f"   Extraction result: success={result.get('success')}, confidence={result.get('confidence_score')}")
        
        if result["success"]:
            logger.info(f"✅ Extraction successful! Confidence: {result['confidence_score']:.1%}")
            
            # Update document with extracted data
            db_document.extracted_text = result["extracted_text"]
            db_document.confidence_score = result["confidence_score"]
            db_document.extraction_status = ExtractionStatus.COMPLETED
            db_document.extracted_at = datetime.utcnow()
            
            # Store structured data
            structured_data = result.get("structured_data", {})
            db_document.extracted_metadata = json.dumps(structured_data)
            
            logger.info(f"📊 Extracted metadata: {list(structured_data.keys())}")
            
            # Update specific fields if available
            if structured_data.get("patient_name"):
                db_document.patient_name = structured_data["patient_name"]
                logger.info(f"   Patient: {structured_data['patient_name']}")
            if structured_data.get("doctor_name"):
                db_document.doctor_name = structured_data["doctor_name"]
                logger.info(f"   Doctor: {structured_data['doctor_name']}")
            if structured_data.get("diagnosis"):
                db_document.diagnosis = structured_data["diagnosis"]
                logger.info(f"   Diagnosis: {structured_data['diagnosis'][:50]}...")
            if structured_data.get("findings"):
                db_document.medical_findings = structured_data["findings"]
                logger.info(f"   Findings: {structured_data['findings'][:50]}...")
            if structured_data.get("medications"):
                db_document.medication_names = json.dumps(structured_data["medications"])
                logger.info(f"   Medications: {len(structured_data['medications'])} found")
            
            # Generate and store embeddings using Cohere
            logger.info(f"🔄 Generating embeddings via Cohere...")
            try:
                from services.embedding_service import get_embedding_processor
                
                processor = get_embedding_processor()
                
                if processor.service.is_available():
                    embeddings = processor.process_document_embeddings(
                        extracted_text=result["extracted_text"],
                        diagnosis=structured_data.get("diagnosis"),
                        findings=structured_data.get("findings"),
                        medications=structured_data.get("medications_json"),  # Pass as is
                        dosages=structured_data.get("dosages_json")
                    )
                    
                    # Store embeddings in database
                    if embeddings.get("extracted_text_embedding"):
                        db_document.extracted_text_embedding = embeddings["extracted_text_embedding"]
                        logger.info(f"✅ Stored extracted_text_embedding (384 dims)")
                    
                    if embeddings.get("diagnosis_embedding"):
                        db_document.diagnosis_embedding = embeddings["diagnosis_embedding"]
                        logger.info(f"✅ Stored diagnosis_embedding (384 dims)")
                    
                    if embeddings.get("medication_embedding"):
                        db_document.medication_embedding = embeddings["medication_embedding"]
                        logger.info(f"✅ Stored medication_embedding (384 dims)")
                else:
                    logger.warning(f"⚠️  Cohere embedding service not available, skipping embeddings")
            
            except Exception as e:
                logger.error(f"❌ Error generating embeddings: {str(e)}")
            
            db.commit()
            logger.info(f"✅ Document {document_id} COMPLETED and saved to database (with embeddings)")

        else:
            logger.error(f"❌ Extraction failed: {result.get('error', 'Unknown error')}")
            db_document.extraction_status = ExtractionStatus.FAILED
            db_document.extraction_error = result.get("error", "Unknown error")
            db.commit()
            logger.error(f"❌ Document {document_id} marked as FAILED in database")
    
    except Exception as e:
        logger.exception(f"💥 Exception during extraction for document_id={document_id}")
        db_document = db.query(Document).filter(Document.id == document_id).first()
        if db_document:
            db_document.extraction_status = ExtractionStatus.FAILED
            db_document.extraction_error = str(e)
            db.commit()
            logger.error(f"❌ Document {document_id} marked as FAILED due to exception")


@router.post("/upload")
async def upload_document(
    file: UploadFile = File(...),
    document_type: str = "other",
    user_id: int = 1,  # In production, get from auth token
    background_tasks: BackgroundTasks = BackgroundTasks(),
    db: Session = Depends(get_db),
):
    """
    Upload a medical document (prescription, MRI, CT scan, etc.)
    
    Returns: Document ID and extraction status
    """
    logger.info(f"📥 Upload request received: {file.filename}")
    logger.debug(f"   User ID: {user_id}, Document Type: {document_type}")
    
    ensure_upload_directory()
    validate_file(file)
    
    # Verify user exists or create dummy user
    logger.debug(f"🔍 Checking if user {user_id} exists...")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        logger.info(f"👤 Creating new user: {user_id}")
        user = User(id=user_id, email=f"user_{user_id}@example.com")
        db.add(user)
        db.commit()
        logger.info(f"✅ User {user_id} created")
    else:
        logger.debug(f"✅ User {user_id} already exists")
    
    # Generate unique filename
    file_ext = file.filename.split(".")[-1]
    unique_filename = f"{uuid.uuid4()}.{file_ext}"
    file_path = os.path.join(UPLOAD_DIRECTORY, unique_filename)
    logger.info(f"💾 Saving file to: {file_path}")
    
    # Save file
    try:
        with open(file_path, "wb") as buffer:
            content = await file.read()
            buffer.write(content)
            file_size = len(content)
        logger.info(f"✅ File saved successfully: {file_size} bytes")
    except Exception as e:
        logger.error(f"❌ Failed to save file: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to save file: {str(e)}")
    
    # Create document record
    logger.info(f"📝 Creating document record in database...")
    db_document = Document(
        user_id=user_id,
        file_name=file.filename,
        file_path=file_path,
        file_size=file_size,
        mime_type=file.content_type,
        document_type=DocumentType(document_type) if document_type in [dt.value for dt in DocumentType] else DocumentType.OTHER,
        extraction_status=ExtractionStatus.PENDING,
    )
    
    db.add(db_document)
    db.commit()
    db.refresh(db_document)
    logger.info(f"✅ Document record created: ID={db_document.id}, Status=PENDING")
    logger.debug(f"   Document details: {db_document.file_name}, {db_document.file_size} bytes")
    
    # Start background extraction task
    logger.info(f"🔄 Queueing background extraction task for document {db_document.id}...")
    background_tasks.add_task(
        process_document_extraction,
        db_document.id,
        file_path,
        document_type,
        db,
    )
    logger.info(f"✅ Background task queued successfully")
    
    response = {
        "document_id": db_document.id,
        "file_name": db_document.file_name,
        "status": db_document.extraction_status.value,
        "message": "Document uploaded. Extraction in progress..."
    }
    logger.info(f"📤 Returning response: {response}")
    return response


@router.get("/status/{document_id}")
async def get_extraction_status(
    document_id: int,
    db: Session = Depends(get_db),
):
    """Get extraction status of a document"""
    logger.info(f"🔍 Status check for document_id={document_id}")
    document = db.query(Document).filter(Document.id == document_id).first()
    
    if not document:
        logger.warning(f"⚠️  Document {document_id} not found in database")
        raise HTTPException(status_code=404, detail="Document not found")
    
    logger.info(f"✅ Document found: status={document.extraction_status.value}, confidence={document.confidence_score}")
    
    response = ExtractionStatusSchema(
        document_id=document.id,
        status=document.extraction_status.value,
        confidence_score=document.confidence_score,
        error_message=document.extraction_error,
    )
    logger.debug(f"📤 Status response: {response}")
    return response


@router.get("/{document_id}", response_model=DocumentResponseSchema)
async def get_document(
    document_id: int,
    db: Session = Depends(get_db),
):
    """Get complete document with extracted data"""
    document = db.query(Document).filter(Document.id == document_id).first()
    
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    return DocumentResponseSchema.from_orm(document)


@router.get("/user/{user_id}/all", response_model=DocumentListSchema)
async def get_user_documents(
    user_id: int,
    skip: int = 0,
    limit: int = 20,
    db: Session = Depends(get_db),
):
    """Get all documents for a user"""
    documents = db.query(Document).filter(Document.user_id == user_id).offset(skip).limit(limit).all()
    total = db.query(Document).filter(Document.user_id == user_id).count()
    
    return DocumentListSchema(
        total=total,
        documents=[DocumentResponseSchema.from_orm(doc) for doc in documents]
    )


@router.delete("/{document_id}")
async def delete_document(
    document_id: int,
    db: Session = Depends(get_db),
):
    """Delete a document and its file"""
    document = db.query(Document).filter(Document.id == document_id).first()
    
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    # Delete file
    try:
        if os.path.exists(document.file_path):
            os.remove(document.file_path)
    except Exception as e:
        print(f"Warning: Could not delete file {document.file_path}: {str(e)}")
    
    # Delete database record
    db.delete(document)
    db.commit()
    
    return {"message": "Document deleted successfully"}


@router.get("/{document_id}/text")
async def get_extracted_text(
    document_id: int,
    db: Session = Depends(get_db),
):
    """Get extracted text from a document"""
    document = db.query(Document).filter(Document.id == document_id).first()
    
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    if not document.extracted_text:
        raise HTTPException(status_code=400, detail="Document text not yet extracted")
    
    return {
        "document_id": document.id,
        "extracted_text": document.extracted_text,
        "confidence_score": document.confidence_score,
        "status": document.extraction_status.value,
    }


@router.get("/{document_id}/metadata")
async def get_extracted_metadata(
    document_id: int,
    db: Session = Depends(get_db),
):
    """Get structured metadata from a document"""
    document = db.query(Document).filter(Document.id == document_id).first()
    
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    metadata = {}
    if document.extracted_metadata:
        try:
            metadata = json.loads(document.extracted_metadata)
        except json.JSONDecodeError:
            pass
    
    return {
        "document_id": document.id,
        "patient_name": document.patient_name,
        "doctor_name": document.doctor_name,
        "diagnosis": document.diagnosis,
        "findings": document.medical_findings,
        "medications": json.loads(document.medication_names) if document.medication_names else [],
        "metadata": metadata,
    }
