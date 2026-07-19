from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class DocumentUploadSchema(BaseModel):
    document_type: str = Field(..., description="Type: prescription, mri, ct_scan, x_ray, ultrasound, lab_report, other")
    description: Optional[str] = None


class ExtractionResult(BaseModel):
    extracted_text: str
    confidence_score: float = Field(..., ge=0, le=1)
    metadata: Optional[dict] = None


class MedicationSchema(BaseModel):
    name: str
    dosage: Optional[str] = None
    frequency: Optional[str] = None
    duration: Optional[str] = None
    instructions: Optional[str] = None


class PrescriptionExtractedSchema(BaseModel):
    patient_name: Optional[str] = None
    doctor_name: Optional[str] = None
    date: Optional[datetime] = None
    medications: List[MedicationSchema] = []
    notes: Optional[str] = None
    raw_text: str


class DocumentResponseSchema(BaseModel):
    id: int
    file_name: str
    document_type: str
    extraction_status: str
    confidence_score: Optional[float] = None
    uploaded_at: datetime
    extracted_at: Optional[datetime] = None
    extracted_text: Optional[str] = None
    patient_name: Optional[str] = None
    doctor_name: Optional[str] = None
    diagnosis: Optional[str] = None
    medical_findings: Optional[str] = None
    medication_names: Optional[str] = None
    
    class Config:
        from_attributes = True


class DocumentListSchema(BaseModel):
    total: int
    documents: List[DocumentResponseSchema]


class ExtractionStatusSchema(BaseModel):
    document_id: int
    status: str
    confidence_score: Optional[float] = None
    error_message: Optional[str] = None
