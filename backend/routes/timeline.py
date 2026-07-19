from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from config.database import get_db
from models.user import User
from models.document import Document
from models.appointment import Appointment
from models.reminder import Reminder
from routes.auth import get_current_user
from typing import List, Dict, Any
from datetime import datetime

router = APIRouter(prefix="/api/timeline", tags=["timeline"])

@router.get("/", response_model=List[Dict[str, Any]])
def get_user_timeline(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    timeline_events = []
    
    # 1. Fetch documents
    documents = db.query(Document).filter(Document.user_id == current_user.id).all()
    for doc in documents:
        event_date = doc.document_date or doc.uploaded_at
        
        # User-friendly title and subtitle
        doc_type_str = doc.document_type.value if doc.document_type else "other"
        doc_type_display = doc_type_str.replace("_", " ").title()
        title = f"{doc_type_display} ({doc.file_name})"
        
        # Dynamic description that cleans out empty or N/A values
        desc_parts = []
        diag_clean = (doc.diagnosis or "").strip().lower()
        if diag_clean and diag_clean not in ("n/a", "none", "null"):
            desc_parts.append(f"Diagnosis: {doc.diagnosis}")
            
        find_clean = (doc.medical_findings or "").strip().lower()
        if find_clean and find_clean not in ("n/a", "none", "null"):
            desc_parts.append(f"Findings: {doc.medical_findings}")
            
        description = " | ".join(desc_parts) if desc_parts else "No specific diagnosis or findings extracted."
        
        timeline_events.append({
            "id": f"doc_{doc.id}",
            "reference_id": doc.id,
            "type": "document",
            "date": event_date,
            "title": title,
            "subtitle": doc_type_display,
            "description": description,
            "status": doc.extraction_status.value
        })
        
    # 2. Fetch appointments
    appointments = db.query(Appointment).filter(Appointment.user_id == current_user.id).all()
    for appt in appointments:
        timeline_events.append({
            "id": f"appt_{appt.id}",
            "reference_id": appt.id,
            "type": "appointment",
            "date": appt.appointment_date,
            "title": f"Appointment with {appt.doctor_name}",
            "subtitle": appt.hospital_name or "Clinic",
            "description": f"Reason: {appt.reason or 'Consultation'}",
            "status": appt.status
        })
        
    # 3. Fetch reminders (as timeline events for when they were created)
    reminders = db.query(Reminder).filter(Reminder.user_id == current_user.id).all()
    for rem in reminders:
        timeline_events.append({
            "id": f"rem_{rem.id}",
            "reference_id": rem.id,
            "type": "reminder",
            "date": rem.created_at,
            "title": f"Reminder set: {rem.title}",
            "subtitle": f"{rem.reminder_type.capitalize()} Reminder",
            "description": f"Time: {rem.reminder_time} ({rem.frequency})",
            "status": "active" if rem.is_active else "inactive"
        })
        
    # Sort timeline by date descending (most recent first)
    # We use a custom key to handle datetime comparisons, ensuring no None errors
    timeline_events.sort(key=lambda x: x["date"] or datetime.min, reverse=True)
    
    return timeline_events
