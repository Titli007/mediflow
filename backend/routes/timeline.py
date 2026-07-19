from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from config.database import get_db
from models.user import User
from models.document import Document, DocumentType, ExtractionStatus
from models.appointment import Appointment
from routes.auth import get_current_user
from typing import List, Dict, Any
from datetime import datetime
import json

router = APIRouter(prefix="/api/timeline", tags=["timeline"])

@router.get("/", response_model=List[Dict[str, Any]])
def get_user_timeline(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    timeline_events = []
    
    # 1. Fetch completed documents for clinical extraction
    documents = db.query(Document).filter(
        Document.user_id == current_user.id,
        Document.extraction_status == ExtractionStatus.COMPLETED
    ).all()
    
    for doc in documents:
        event_date = doc.document_date or doc.uploaded_at
        doc_type = doc.document_type
        
        # A. Document as a Consultation or Test
        if doc_type == DocumentType.PRESCRIPTION:
            # Prescriptions are Consultations
            timeline_events.append({
                "id": f"consult_doc_{doc.id}",
                "reference_id": doc.id,
                "type": "consultation",
                "date": event_date,
                "title": f"Prescription from {doc.doctor_name or 'Doctor'}",
                "subtitle": "Consultation",
                "description": doc.medical_findings or f"Medications prescribed in {doc.file_name}"
            })
        elif doc_type in (DocumentType.MRI, DocumentType.CT_SCAN, DocumentType.X_RAY, DocumentType.ULTRASOUND, DocumentType.LAB_REPORT):
            # Diagnostic scans and blood work are Tests
            doc_type_display = doc_type.value.replace("_", " ").title()
            timeline_events.append({
                "id": f"test_doc_{doc.id}",
                "reference_id": doc.id,
                "type": "test",
                "date": event_date,
                "title": f"{doc_type_display} Done",
                "subtitle": "Diagnostic Test",
                "description": doc.medical_findings or f"Test results and metrics from {doc.file_name}"
            })
            
        # B. Extract Medications from Document
        if doc.medication_names:
            try:
                meds = json.loads(doc.medication_names)
                for idx, med in enumerate(meds):
                    med_name = med.get("name") if isinstance(med, dict) else med
                    if not med_name:
                        continue
                    dosage = med.get("dosage") if isinstance(med, dict) else None
                    frequency = med.get("frequency") if isinstance(med, dict) else None
                    
                    subtitle_parts = []
                    if dosage: subtitle_parts.append(dosage)
                    if frequency: subtitle_parts.append(frequency)
                    
                    timeline_events.append({
                        "id": f"med_{doc.id}_{idx}",
                        "reference_id": doc.id,
                        "type": "medication",
                        "date": event_date,
                        "title": f"Started Medication: {med_name}",
                        "subtitle": " | ".join(subtitle_parts) if subtitle_parts else "Active Medication",
                        "description": f"Prescribed by {doc.doctor_name or 'Healthcare Provider'} (File: {doc.file_name})"
                    })
            except Exception:
                pass
                
        # C. Extract Treatments & Diagnoses
        diag_clean = (doc.diagnosis or "").strip().lower()
        if diag_clean and diag_clean not in ("n/a", "none", "null"):
            timeline_events.append({
                "id": f"diag_doc_{doc.id}",
                "reference_id": doc.id,
                "type": "treatment",
                "date": event_date,
                "title": f"Diagnosed with {doc.diagnosis}",
                "subtitle": "Clinical Diagnosis / Condition",
                "description": f"Extracted from report: {doc.file_name} by {doc.doctor_name or 'Physician'}"
            })

    # 2. Fetch Appointments (Consultations)
    appointments = db.query(Appointment).filter(Appointment.user_id == current_user.id).all()
    for appt in appointments:
        timeline_events.append({
            "id": f"appt_{appt.id}",
            "reference_id": appt.id,
            "type": "consultation",
            "date": appt.appointment_date,
            "title": f"Consultation with {appt.doctor_name}",
            "subtitle": appt.hospital_name or "Clinic Visit",
            "description": f"Reason: {appt.reason or 'Follow-up Consultation'}"
        })
        
    # Sort timeline by date descending (most recent first)
    timeline_events.sort(key=lambda x: x["date"] or datetime.min, reverse=True)
    
    return timeline_events
