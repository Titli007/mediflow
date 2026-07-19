import os
import json
import requests
from typing import Optional, Dict
from config.logging_config import get_logger

logger = get_logger(__name__)

def call_gemini(prompt: str) -> str:
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("GEMINI_API_KEY environment variable is not set")
    try:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key={api_key}"
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
            err_msg = f"Gemini API returned error {response.status_code}: {response.text}"
            logger.error(err_msg)
            raise Exception(err_msg)
    except Exception as e:
        logger.exception(f"Exception calling Gemini API: {str(e)}")
        raise

def extract_medical_data(text: str, doc_type: str = "other") -> Dict:
    """
    Extract patient name, doctor name, date, diagnosis, findings, medications,
    biometrics, and follow-up appointments from medical document text using Gemini.
    """
    prompt = f"""You are a clinical document parser. Analyze the medical text below and extract structured medical information.
Return ONLY a valid JSON object matching the schema below. Do not include markdown code block formatting (like ```json), no commentary, no extra text.

JSON Schema:
{{
  "patient_name": "string or null",
  "doctor_name": "string or null",
  "date": "YYYY-MM-DD or null",
  "diagnosis": "string or null",
  "findings": "string or null",
  "medications": [
    {{
      "name": "string",
      "dosage": "string or null",
      "frequency": "string or null"
    }}
  ],
  "biometrics": {{
    "heart_rate": int or null (in bpm),
    "blood_pressure_systolic": int or null (in mmHg),
    "blood_pressure_diastolic": int or null (in mmHg),
    "blood_glucose": int or null (in mg/dL),
    "hba1c": float or null (in %),
    "cholesterol": int or null (in mg/dL)
  }},
  "appointments": [
    {{
      "doctor_name": "string or null",
      "hospital_name": "string or null",
      "appointment_date": "YYYY-MM-DDTHH:MM:SS or YYYY-MM-DD or null",
      "reason": "string or null"
    }}
  ]
}}

Document Text:
{text}
"""
    response_text = call_gemini(prompt)
    if not response_text:
        raise Exception("Gemini returned an empty response")

    # Clean response text (remove markdown block if Gemini included it)
    clean_text = response_text.strip()
    if clean_text.startswith("```"):
        lines = clean_text.splitlines()
        if lines[0].startswith("```"):
            lines = lines[1:]
        if lines[-1].startswith("```"):
            lines = lines[:-1]
        clean_text = "\n".join(lines).strip()

    try:
        data = json.loads(clean_text)
        return data
    except Exception as e:
        logger.error(f"Failed to parse Gemini JSON output: {str(e)}\nRaw response: {response_text}")
        raise Exception(f"Failed to parse Gemini JSON output: {str(e)}")
