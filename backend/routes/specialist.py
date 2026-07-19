from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from config.database import get_db
from models.user import User
from models.document import Document, ExtractionStatus
from routes.auth import get_current_user
from services.gemini_service import call_gemini
from typing import Dict, Any, List
import json

router = APIRouter(prefix="/api/specialists", tags=["specialists"])

DOCTORS_BY_SPECIALTY = {
    "Cardiology": [
        {"id": 101, "name": "Dr. John Carter", "hospital": "Jayadeva Institute of Cardiovascular Sciences, Bangalore", "slots": ["09:00", "11:30", "14:00"]},
        {"id": 102, "name": "Dr. Sarah Miller", "hospital": "Fortis Hospital, Bannerghatta Road, Bangalore", "slots": ["10:00", "13:00", "15:30"]}
    ],
    "Neurology": [
        {"id": 201, "name": "Dr. Helen Cho", "hospital": "NIMHANS, Hosur Road, Bangalore", "slots": ["09:30", "11:00", "14:30"]},
        {"id": 202, "name": "Dr. Robert Bruce", "hospital": "Apollo Hospitals, Bannerghatta Road, Bangalore", "slots": ["10:30", "13:30", "16:00"]}
    ],
    "Dermatology": [
        {"id": 301, "name": "Dr. Sarah Jenkins", "hospital": "Apollo Clinic, HSR Layout, Bangalore", "slots": ["08:30", "11:30", "15:00"]},
        {"id": 302, "name": "Dr. Emma Watson", "hospital": "Skin Care Clinic, Begur Road, Bangalore", "slots": ["09:00", "13:00", "16:30"]}
    ],
    "Orthopedics": [
        {"id": 401, "name": "Dr. Robert Chen", "hospital": "Jayashree Multi Speciality Hospital, Begur Road, Bangalore", "slots": ["09:00", "10:30", "14:00"]},
        {"id": 402, "name": "Dr. James Wilson", "hospital": "Fortis Hospital, Bannerghatta Road, Bangalore", "slots": ["11:00", "13:30", "15:30"]}
    ],
    "Pediatrics": [
        {"id": 501, "name": "Dr. Meera Kapoor", "hospital": "Narayana Health, HSR Layout, Bangalore", "slots": ["09:00", "12:00", "15:00"]},
        {"id": 502, "name": "Dr. David Tennant", "hospital": "Happy Kids Pediatric Clinic, Begur, Bangalore", "slots": ["10:00", "13:30", "16:00"]}
    ],
    "Gastroenterology": [
        {"id": 601, "name": "Dr. Alan Grant", "hospital": "St. John's Medical College Hospital, Bangalore", "slots": ["09:30", "12:30", "15:00"]},
        {"id": 602, "name": "Dr. Ellie Sattler", "hospital": "Apollo Hospitals, Bannerghatta Road, Bangalore", "slots": ["10:00", "14:00", "16:00"]}
    ],
    "General Medicine": [
        {"id": 701, "name": "Dr. Alice Vance", "hospital": "Begur Government Hospital, Begur, Bangalore", "slots": ["08:30", "11:00", "14:30"]},
        {"id": 702, "name": "Dr. Gordon Freeman", "hospital": "City Clinic, Begur Road, Bangalore", "slots": ["09:30", "13:30", "16:00"]}
    ]
}

@router.get("/recommend", response_model=Dict[str, Any])
def recommend_specialist(
    symptoms: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not symptoms.strip():
        raise HTTPException(status_code=400, detail="Symptoms parameter is required.")

    # 1. Fetch user medical history (diagnoses and findings)
    docs = db.query(Document).filter(
        Document.user_id == current_user.id,
        Document.extraction_status == ExtractionStatus.COMPLETED
    ).all()
    
    history_elements = []
    for d in docs:
        if d.diagnosis:
            history_elements.append(f"Diagnosis: {d.diagnosis}")
        if d.medical_findings:
            history_elements.append(f"Findings: {d.medical_findings}")
            
    history_str = "; ".join(history_elements) if history_elements else "No medical history available."

    # 2. Prompt Gemini for specialty recommendations
    prompt = f"""
    You are an expert medical triage assistant. Based on the patient's symptoms and their brief medical history, recommend the most appropriate clinical specialty/department and assign an urgency level.
    
    Symptoms: {symptoms}
    Medical History: {history_str}
    
    Choose a specialty from the following options:
    - Cardiology
    - Neurology
    - Dermatology
    - Orthopedics
    - Pediatrics
    - Gastroenterology
    - Ophthalmology
    - ENT
    - Pulmonology
    - General Medicine
    
    Choose an urgency level:
    - Emergency (Life-threatening symptoms, patient should go to the nearest ER immediately)
    - Urgent (Symptoms require quick evaluation, schedule within 24-48 hours)
    - Routine (Non-urgent symptoms, standard clinic checkup)
    
    Return ONLY a valid JSON object matching the following structure. Do not include markdown code block formatting, no extra explanation:
    {{
      "specialty": "Department Name",
      "urgency": "Emergency | Urgent | Routine",
      "rationale": "Brief 1-2 sentence explanation of the choice."
    }}
    """
    
    try:
        raw_res = call_gemini(prompt)
        raw_res = raw_res.replace("```json", "").replace("```", "").strip()
        rec_data = json.loads(raw_res)
    except Exception as e:
        rec_data = {
            "specialty": "General Medicine",
            "urgency": "Routine",
            "rationale": "Default specialist recommendation due to processing limitations."
        }

    # 3. Fetch matching doctors
    spec = rec_data.get("specialty", "General Medicine")
    if spec not in DOCTORS_BY_SPECIALTY:
        if spec in ["Ophthalmology", "ENT", "Pulmonology"]:
            spec = "General Medicine"
        else:
            spec = "General Medicine"
            
    doctors = DOCTORS_BY_SPECIALTY.get(spec, DOCTORS_BY_SPECIALTY["General Medicine"])

    return {
        "recommendation": rec_data,
        "doctors": doctors
    }
