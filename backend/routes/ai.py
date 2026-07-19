from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from config.database import get_db
from models.user import User
from models.document import Document, ExtractionStatus
from routes.auth import get_current_user
from config.settings import GEMINI_MODEL
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import os
import requests
import json

router = APIRouter(prefix="/api/ai", tags=["ai"])

# Config
SECRET_KEY = os.getenv("SECRET_KEY", "mediflow-secure-development-secret-key-1298471")

class ChatQuery(BaseModel):
    query: str
    document_id: Optional[int] = None

class TermQuery(BaseModel):
    term: str

def call_gemini(prompt: str) -> Optional[str]:
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        return None
    try:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent?key={api_key}"
        headers = {"Content-Type": "application/json"}
        payload = {
            "contents": [
                {
                    "parts": [
                        {"text": prompt}
                    ]
                }
            ]
        }
        response = requests.post(url, headers=headers, json=payload, timeout=25)
        if response.status_code == 200:
            res_data = response.json()
            return res_data["candidates"][0]["content"]["parts"][0]["text"]
        else:
            print(f"Gemini API returned error {response.status_code}: {response.text}")
            return None
    except Exception as e:
        print(f"Exception calling Gemini API: {str(e)}")
        return None

# Dictionary of local medical definitions for fallback
MEDICAL_DICTIONARY = {
    "hba1c": "A blood test that measures your average blood sugar levels over the past 3 months. Normal: <5.7%, Prediabetes: 5.7%-6.4%, Diabetes: >=6.5%.",
    "hyperlipidemia": "A condition characterized by abnormally high levels of lipids (fats/cholesterol) in the blood, which can increase the risk of heart disease.",
    "ldl": "Low-Density Lipoprotein, often called 'bad cholesterol'. High levels can lead to plaque buildup in arteries. Optimal: <100 mg/dL.",
    "hdl": "High-Density Lipoprotein, often called 'good cholesterol'. Helps remove bad cholesterol from the bloodstream. Optimal: >40 mg/dL (men), >50 mg/dL (women).",
    "creatinine": "A waste product filtered by the kidneys. High levels in the blood suggest that the kidneys are not filtering waste effectively. Normal: 0.6-1.2 mg/dL.",
    "hemoglobin": "An iron-rich protein in red blood cells that carries oxygen from the lungs to the rest of the body. Low levels indicate anemia.",
    "tsh": "Thyroid Stimulating Hormone. Evaluates thyroid function. High levels suggest hypothyroidism (underactive thyroid), and low levels suggest hyperthyroidism (overactive thyroid)."
}

# Generic drug groupings for duplicate medicine checks
GENERIC_DRUG_GROUPS = {
    "paracetamol": ["paracetamol", "dolo", "crocin", "calpol", "acetaminophen", "combiflam"],
    "ibuprofen": ["ibuprofen", "advil", "motrin", "brufen", "combiflam"],
    "aspirin": ["aspirin", "ecosprin", "disprin"],
    "metformin": ["metformin", "glycomet", "glucophage"],
    "atorvastatin": ["atorvastatin", "lipitor", "storvas", "lipvas"],
    "amoxicillin": ["amoxicillin", "mox", "novamox"]
}

@router.post("/chat")
def ai_chat(query_in: ChatQuery, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if query_in.document_id:
        # Retrieve only the specified completed document
        documents = db.query(Document).filter(
            Document.user_id == current_user.id,
            Document.id == query_in.document_id,
            Document.extraction_status == ExtractionStatus.COMPLETED
        ).all()
        if not documents:
            return {
                "answer": "The specified document could not be found or has not finished processing yet."
            }
    else:
        # Retrieve all completed documents for context
        documents = db.query(Document).filter(
            Document.user_id == current_user.id,
            Document.extraction_status == ExtractionStatus.COMPLETED
        ).all()
    
    if not documents:
        return {
            "answer": "You haven't uploaded any successfully processed medical documents yet. Please upload your reports or prescriptions first so I can help answer your questions!"
        }
        
    # Consolidate text context
    context = ""
    for doc in documents:
        context += f"--- Document: {doc.file_name} (Type: {doc.document_type.value if doc.document_type else 'other'}, Date: {doc.document_date or doc.uploaded_at}) ---\n"
        if doc.extracted_text:
            context += doc.extracted_text[:1200] + "\n\n"  # limit length of each doc context to avoid token limits
            
    # Try calling Gemini
    if query_in.document_id:
        doc = documents[0]
        prompt = f"""You are MediFlow's AI Medical Assistant. The user is asking a question specifically about the document: '{doc.file_name}' ({doc.document_type.value if doc.document_type else 'other'}).
Use ONLY the context of this specific document to answer their question.
Be empathetic, clear, and professional. Add a medical disclaimer stating that this is an AI interpretation and the patient should consult a doctor.

Context for '{doc.file_name}':
{doc.extracted_text or "No text extracted."}

Question:
{query_in.query}
"""
    else:
        prompt = f"""You are MediFlow's AI Medical Assistant. Use the patient's medical records context below to answer their question.
Be empathetic, clear, and professional. Add a medical disclaimer stating that this is an AI interpretation and the patient should consult a doctor.

Context:
{context}

Question:
{query_in.query}
"""
    answer = call_gemini(prompt)
    
    if answer:
        return {"answer": answer}
        
    # Fallback keyword matching
    query_lower = query_in.query.lower()
    matching_fragments = []
    
    for doc in documents:
        if doc.extracted_text:
            text = doc.extracted_text
            # Simple keyword search
            for keyword in query_lower.split():
                if len(keyword) > 3 and keyword in text.lower():
                    # Extract fragment
                    idx = text.lower().find(keyword)
                    start = max(0, idx - 150)
                    end = min(len(text), idx + 200)
                    matching_fragments.append(f"...{text[start:end]}...")
                    break
                    
    if matching_fragments:
        answer_text = "Based on a search of your uploaded records:\n\n"
        answer_text += "\n\n".join(matching_fragments[:3])
        answer_text += "\n\n*Note: This is a keyword search fallback response. For complete medical advice, please consult your physician.*"
    else:
        answer_text = f"I searched your {len(documents)} uploaded document(s) but could not find direct references related to '{query_in.query}'. Could you please rephrase your query?"
        
    return {"answer": answer_text}

@router.get("/summary")
def get_ai_summary(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    documents = db.query(Document).filter(
        Document.user_id == current_user.id,
        Document.extraction_status == ExtractionStatus.COMPLETED
    ).all()
    
    if not documents:
        return {
            "summary": "No completed medical documents found. Please upload medical records to generate a comprehensive profile summary."
        }
        
    # Consolidate clinical data
    diagnoses = [doc.diagnosis for doc in documents if doc.diagnosis]
    findings = [doc.medical_findings for doc in documents if doc.medical_findings]
    
    medications = set()
    for doc in documents:
        if doc.medication_names:
            try:
                meds_data = json.loads(doc.medication_names)
                if isinstance(meds_data, list):
                    for med in meds_data:
                        if isinstance(med, dict) and med.get("name"):
                            medications.add(med["name"])
                        elif isinstance(med, str):
                            medications.add(med)
            except Exception:
                pass

    context = ""
    for doc in documents:
        context += f"- Report: {doc.file_name} ({doc.document_type.value}), Diagnosis: {doc.diagnosis}, Findings: {doc.medical_findings}\n"
        if doc.extracted_text:
            context += f"  Text snippet: {doc.extracted_text[:400]}\n"

    prompt = f"""You are a clinical summarizer. Create a clear, structured Patient Health Profile Summary using the medical reports below.
Break it down into:
1. Current Problems & Diagnoses
2. Active Medications
3. Important Findings/Labs
4. General Recommendations
Add a medical disclaimer at the bottom.

Reports Context:
{context}
"""
    summary = call_gemini(prompt)
    if summary:
        return {"summary": summary}
        
    # Fallback summary
    fallback = f"### Patient Medical Profile Summary\n\n"
    fallback += f"**Patient Name:** {current_user.full_name or 'N/A'}\n"
    fallback += f"**Associated Email:** {current_user.email}\n\n"
    
    fallback += "#### Diagnoses Found:\n"
    if diagnoses:
        for diag in set(diagnoses):
            fallback += f"- {diag}\n"
    else:
        fallback += "- No active diagnoses found in records.\n"
        
    fallback += "\n#### Medications Found:\n"
    if medications:
        for med in medications:
            fallback += f"- {med}\n"
    else:
        fallback += "- No medications extracted.\n"
        
    fallback += "\n#### Clinical Findings:\n"
    if findings:
        for find in set(findings):
            fallback += f"- {find}\n"
    else:
        fallback += "- No significant imaging or lab findings listed.\n"
        
    fallback += "\n\n*Note: This is an automatically aggregated profile. Consult your doctor for an official review.*"
    return {"summary": fallback}

@router.post("/explain")
def explain_medical_term(query_in: TermQuery):
    term_clean = query_in.term.strip().lower()
    
    # Try calling Gemini first
    prompt = f"Explain the medical term '{query_in.term}' in simple terms for a patient to understand. Include normal reference ranges or standard interpretations if applicable. Keep it concise."
    explanation = call_gemini(prompt)
    if explanation:
        return {
            "term": query_in.term,
            "explanation": explanation
        }
        
    # Fallback to local dictionary
    explanation_text = MEDICAL_DICTIONARY.get(
        term_clean,
        f"'{query_in.term}' is a medical term. For detailed clinical analysis, standard reference ranges, and definitions, please consult with your healthcare specialist."
    )
    return {
        "term": query_in.term,
        "explanation": explanation_text
    }

@router.get("/recommend-specialist")
def recommend_specialist(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    documents = db.query(Document).filter(
        Document.user_id == current_user.id,
        Document.extraction_status == ExtractionStatus.COMPLETED
    ).all()
    
    if not documents:
        return {
            "recommendations": "No document records found to analyze. Please upload medical records first.",
            "disclaimer": "This is not a medical diagnosis."
        }
        
    combined_clinical_text = " ".join([
        f"{doc.diagnosis or ''} {doc.medical_findings or ''} {doc.extracted_text or ''}" 
        for doc in documents
    ]).lower()
    
    # Try calling Gemini
    prompt = f"""Review the following clinical text and recommend possible medical specialists the patient might consult.
Explain the reason for each specialist recommendation based on their reports.
Keep it objective, emphasize that this is NOT a diagnosis, and add a strict medical disclaimer.

Clinical Context:
{combined_clinical_text[:2000]}
"""
    recommendation = call_gemini(prompt)
    if recommendation:
        return {
            "recommendations": recommendation,
            "disclaimer": "Disclaimer: Recommendations are provided for educational purposes. Always consult a general physician for formal referrals."
        }
        
    # Local matching logic
    recommendations_list = []
    
    rules = [
        ({"heart", "cardio", "ecg", "chest pain", "angina"}, "Cardiologist", "Your reports mention cardiac terms or symptoms like chest pain/ECG findings."),
        ({"diabetes", "sugar", "hba1c", "thyroid", "tsh", "goiter", "endocrine"}, "Endocrinologist", "Your reports indicate metabolic markers, HbA1c, or thyroid test listings."),
        ({"kidney", "creatinine", "renal", "egfr"}, "Nephrologist", "Markers related to kidney filtration or elevated creatinine levels were observed."),
        ({"brain", "mri", "neurology", "numbness", "stroke", "seizure"}, "Neurologist", "Neurological symptoms, numbness, or MRI scan results were detected."),
        ({"bone", "fracture", "x-ray", "joint", "back pain", "spine"}, "Orthopedist", "Orthopedic conditions, skeletal x-rays, or joint findings were noted."),
        ({"cough", "lung", "asthma", "pneumonia", "breathing"}, "Pulmonologist", "Pulmonary symptoms, lung reports, or respiration-related indicators.")
    ]
    
    for keywords, specialist, reason in rules:
        for kw in keywords:
            if kw in combined_clinical_text:
                recommendations_list.append(f"**{specialist}**:\n{reason}\n")
                break
                
    if recommendations_list:
        recs_text = "Based on a review of your uploaded reports, you might consider consulting:\n\n" + "\n".join(recommendations_list)
    else:
        recs_text = "No specific markers were flagged for specialized consultations. Please consult your primary care doctor (General Practitioner) for general health guidance."
        
    return {
        "recommendations": recs_text,
        "disclaimer": "Disclaimer: AI specialist suggestions are for educational guidance and do not replace a physician's referral."
    }

@router.get("/duplicate-medications")
def check_duplicate_medications(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    documents = db.query(Document).filter(
        Document.user_id == current_user.id,
        Document.extraction_status == ExtractionStatus.COMPLETED
    ).all()
    
    # Extract all medications
    all_meds = []
    for doc in documents:
        if doc.medication_names:
            try:
                meds_data = json.loads(doc.medication_names)
                if isinstance(meds_data, list):
                    for med in meds_data:
                        name = ""
                        if isinstance(med, dict) and med.get("name"):
                            name = med["name"]
                        elif isinstance(med, str):
                            name = med
                        if name:
                            all_meds.append({
                                "name": name.strip().lower(),
                                "doc_id": doc.id,
                                "doc_name": doc.file_name
                            })
            except Exception:
                pass
                
    if len(all_meds) < 2:
        return {
            "has_warnings": False,
            "warnings": [],
            "message": "Fewer than two active medications found. No duplicates detected."
        }
        
    # Check for duplicates using generic groupings
    warnings = []
    for i in range(len(all_meds)):
        for j in range(i + 1, len(all_meds)):
            med1 = all_meds[i]
            med2 = all_meds[j]
            
            # Skip if they came from the exact same document (usually doctor listing alternatives is fine)
            if med1["doc_id"] == med2["doc_id"]:
                continue
                
            # Direct name match
            if med1["name"] == med2["name"]:
                warnings.append({
                    "medication_1": med1["name"].capitalize(),
                    "medication_2": med2["name"].capitalize(),
                    "document_1": med1["doc_name"],
                    "document_2": med2["doc_name"],
                    "reason": "Exact same medication name found on two different documents."
                })
                continue
                
            # Generic group match
            for group, names in GENERIC_DRUG_GROUPS.items():
                is_med1_in = any(n in med1["name"] for n in names)
                is_med2_in = any(n in med2["name"] for n in names)
                
                if is_med1_in and is_med2_in:
                    warnings.append({
                        "medication_1": med1["name"].capitalize(),
                        "medication_2": med2["name"].capitalize(),
                        "document_1": med1["doc_name"],
                        "document_2": med2["doc_name"],
                        "reason": f"Both medicines likely contain the same active generic ingredient ({group.capitalize()})."
                    })
                    break
                    
    has_warnings = len(warnings) > 0
    return {
        "has_warnings": has_warnings,
        "warnings": warnings,
        "message": "Potential medication duplicates flagged. Please consult your physician before combining these." if has_warnings else "No duplicate medications detected."
    }