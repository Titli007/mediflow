from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from config.database import get_db
from models.user import User
from models.document import Document, ExtractionStatus
from models.appointment import Appointment
from models.reminder import Reminder
from routes.auth import get_current_user
from typing import Dict, Any, List
from datetime import datetime
import json

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])

@router.get("/", response_model=Dict[str, Any])
def get_user_dashboard(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # 1. Fetch recent documents (last 5)
    recent_docs = db.query(Document).filter(
        Document.user_id == current_user.id
    ).order_by(Document.uploaded_at.desc()).limit(5).all()
    
    recent_docs_list = []
    for doc in recent_docs:
        recent_docs_list.append({
            "id": doc.id,
            "file_name": doc.file_name,
            "document_type": doc.document_type.value if doc.document_type else "other",
            "uploaded_at": doc.uploaded_at,
            "status": doc.extraction_status.value,
            "confidence_score": doc.confidence_score
        })

    # 2. Fetch upcoming appointments
    now = datetime.utcnow()
    upcoming_appts = db.query(Appointment).filter(
        Appointment.user_id == current_user.id,
        Appointment.appointment_date >= now,
        Appointment.status != "cancelled"
    ).order_by(Appointment.appointment_date.asc()).all()
    
    upcoming_appts_list = []
    for appt in upcoming_appts:
        upcoming_appts_list.append({
            "id": appt.id,
            "doctor_name": appt.doctor_name,
            "hospital_name": appt.hospital_name,
            "appointment_date": appt.appointment_date,
            "reason": appt.reason,
            "status": appt.status
        })

    # 3. Fetch active reminders
    active_reminders = db.query(Reminder).filter(
        Reminder.user_id == current_user.id,
        Reminder.is_active == True
    ).order_by(Reminder.reminder_time.asc()).all()
    
    active_reminders_list = []
    for rem in active_reminders:
        active_reminders_list.append({
            "id": rem.id,
            "reminder_type": rem.reminder_type,
            "title": rem.title,
            "reminder_time": rem.reminder_time,
            "frequency": rem.frequency
        })

    # 4. Extract current medications list from documents
    # We fetch all completed prescriptions and extract their medication list
    documents = db.query(Document).filter(
        Document.user_id == current_user.id,
        Document.extraction_status == ExtractionStatus.COMPLETED
    ).all()
    
    medications = set()
    for doc in documents:
        if doc.medication_names:
            try:
                # Can be a JSON array of strings or list of dicts
                meds_data = json.loads(doc.medication_names)
                if isinstance(meds_data, list):
                    for med in meds_data:
                        if isinstance(med, dict) and med.get("name"):
                            medications.add(med["name"])
                        elif isinstance(med, str):
                            medications.add(med)
            except Exception:
                pass
                
    # 5. Extract biometric trends from completed documents
    biometric_trends = []
    for doc in documents:
        if doc.extracted_metadata:
            try:
                meta = json.loads(doc.extracted_metadata)
                biometrics = meta.get("biometrics")
                if biometrics and any(v is not None for v in biometrics.values()):
                    date_val = doc.document_date or doc.uploaded_at or datetime.utcnow()
                    date_str = date_val.strftime("%Y-%m-%d")
                    biometric_trends.append({
                        "date": date_str,
                        "heart_rate": biometrics.get("heart_rate"),
                        "blood_pressure_systolic": biometrics.get("blood_pressure_systolic"),
                        "blood_pressure_diastolic": biometrics.get("blood_pressure_diastolic"),
                        "blood_glucose": biometrics.get("blood_glucose"),
                        "hba1c": biometrics.get("hba1c"),
                        "cholesterol": biometrics.get("cholesterol"),
                        "document_name": doc.file_name
                    })
            except Exception:
                pass
    
    # Sort biometric trends by date ascending
    biometric_trends.sort(key=lambda x: x["date"])
                
    # 6. Fetch statistics
    total_docs = db.query(Document).filter(Document.user_id == current_user.id).count()
    total_appts = db.query(Appointment).filter(Appointment.user_id == current_user.id).count()
    total_rems = db.query(Reminder).filter(Reminder.user_id == current_user.id).count()
    
    completed_docs = db.query(Document).filter(
        Document.user_id == current_user.id,
        Document.extraction_status == ExtractionStatus.COMPLETED
    ).count()
    
    failed_docs = db.query(Document).filter(
        Document.user_id == current_user.id,
        Document.extraction_status == ExtractionStatus.FAILED
    ).count()

    return {
        "user_info": {
            "id": current_user.id,
            "email": current_user.email,
            "full_name": current_user.full_name
        },
        "stats": {
            "total_documents": total_docs,
            "total_appointments": total_appts,
            "total_reminders": total_rems,
            "completed_extractions": completed_docs,
            "failed_extractions": failed_docs
        },
        "recent_documents": recent_docs_list,
        "upcoming_appointments": upcoming_appts_list,
        "active_reminders": active_reminders_list,
        "current_medications": list(medications),
        "biometric_trends": biometric_trends
    }
