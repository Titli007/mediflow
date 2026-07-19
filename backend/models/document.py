from sqlalchemy import Column, Integer, String, Text, DateTime, Float, ForeignKey, Enum as SQLEnum
from pgvector.sqlalchemy import Vector
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from config.database import Base



class DocumentType(str, enum.Enum):
    PRESCRIPTION = "prescription"
    MRI = "mri"
    CT_SCAN = "ct_scan"
    X_RAY = "x_ray"
    ULTRASOUND = "ultrasound"
    LAB_REPORT = "lab_report"
    OTHER = "other"


class ExtractionStatus(str, enum.Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    phone = Column(String, nullable=True)
    full_name = Column(String, nullable=True)
    hashed_password = Column(String, nullable=True)  # Nullable for auto-created mock users
    created_at = Column(DateTime, default=datetime.utcnow)
    
    documents = relationship("Document", back_populates="owner")


class Document(Base):
    __tablename__ = "documents"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # File metadata
    file_name = Column(String, nullable=False)
    file_path = Column(String, nullable=False)
    file_size = Column(Integer)  # in bytes
    mime_type = Column(String)
    
    # Document information
    document_type = Column(SQLEnum(DocumentType), default=DocumentType.OTHER)
    document_date = Column(DateTime, nullable=True)  # Date on the document
    
    # Extraction info
    extraction_status = Column(SQLEnum(ExtractionStatus), default=ExtractionStatus.PENDING)
    extracted_text = Column(Text, nullable=True)
    extracted_metadata = Column(Text, nullable=True)  # JSON string
    confidence_score = Column(Float, nullable=True)  # 0-1
    extraction_error = Column(Text, nullable=True)
    
    # Structured medical data
    patient_name = Column(String, nullable=True)
    patient_dob = Column(DateTime, nullable=True)
    doctor_name = Column(String, nullable=True)
    diagnosis = Column(Text, nullable=True)
    medical_findings = Column(Text, nullable=True)
    medication_names = Column(Text, nullable=True)  # JSON array
    dosage_instructions = Column(Text, nullable=True)  # JSON
    # Vector embeddings for semantic search (pgvector)
    extracted_text_embedding = Column(Vector(1024), nullable=True)
    diagnosis_embedding = Column(Vector(1024), nullable=True)
    medication_embedding = Column(Vector(1024), nullable=True)



    # Timestamps
    uploaded_at = Column(DateTime, default=datetime.utcnow)
    extracted_at = Column(DateTime, nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    owner = relationship("User", back_populates="documents")
    
    def to_dict(self):
        return {
            "id": self.id,
            "file_name": self.file_name,
            "document_type": self.document_type.value if self.document_type else None,
            "extraction_status": self.extraction_status.value if self.extraction_status else None,
            "confidence_score": self.confidence_score,
            "uploaded_at": self.uploaded_at.isoformat() if self.uploaded_at else None,
            "extracted_at": self.extracted_at.isoformat() if self.extracted_at else None,
        }
