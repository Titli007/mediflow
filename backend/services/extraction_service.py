import os
import json
import re
from typing import Optional, Dict, List, Tuple
from PIL import Image
import pytesseract
import cv2
import numpy as np
from datetime import datetime
from config.settings import (
    USE_TESSERACT,
    USE_GOOGLE_VISION,
    TESSERACT_PATH,
    GOOGLE_VISION_API_KEY,
    MIN_CONFIDENCE_SCORE,
)
from config.logging_config import get_logger

logger = get_logger(__name__)

# Set tesseract path for Windows
if os.name == 'nt':
    pytesseract.pytesseract.pytesseract_cmd = TESSERACT_PATH


class OCRExtractor:
    """Base OCR extractor for medical documents"""

    @staticmethod
    def preprocess_image(image_path: str) -> np.ndarray:
        """Preprocess image for better OCR accuracy"""
        image = cv2.imread(image_path)
        if image is None:
            raise ValueError(f"Could not read image: {image_path}")
        
        # Convert to grayscale
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        
        # Apply CLAHE (Contrast Limited Adaptive Histogram Equalization)
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        enhanced = clahe.apply(gray)
        
        # Denoise
        denoised = cv2.fastNlMeansDenoising(enhanced)
        
        # Thresholding
        _, thresh = cv2.threshold(denoised, 150, 255, cv2.THRESH_BINARY)
        
        return thresh

    @staticmethod
    def extract_text_tesseract(image_path: str) -> Tuple[str, float]:
        """Extract text using Tesseract OCR"""
        try:
            # Try with preprocessing first
            try:
                preprocessed = OCRExtractor.preprocess_image(image_path)
                # Save preprocessed image temporarily
                temp_path = image_path.replace(".", "_temp.")
                cv2.imwrite(temp_path, preprocessed)
                text = pytesseract.image_to_string(temp_path, lang='eng')
                os.remove(temp_path)
            except Exception:
                # Fallback to direct OCR
                text = pytesseract.image_to_string(image_path, lang='eng')
            
            # Get confidence data
            data = pytesseract.image_to_data(image_path, output_type=pytesseract.Output.DICT, lang='eng')
            confidences = [int(conf) for conf in data['conf'] if int(conf) > 0]
            avg_confidence = sum(confidences) / len(confidences) / 100 if confidences else 0.5
            
            return text, min(avg_confidence, 1.0)
        except Exception as e:
            raise Exception(f"Tesseract OCR error: {str(e)}")

    @staticmethod
    def extract_text_google_vision(image_path: str) -> Tuple[str, float]:
        """Extract text using Google Cloud Vision API"""
        if not USE_GOOGLE_VISION or not GOOGLE_VISION_API_KEY:
            raise ValueError("Google Vision API is not configured")
        
        try:
            from google.cloud import vision
            client = vision.ImageAnnotatorClient()
            
            with open(image_path, "rb") as image_file:
                content = image_file.read()
            
            image = vision.Image(content=content)
            response = client.text_detection(image=image)
            
            if response.text_annotations:
                full_text = response.text_annotations[0].text
                # Calculate average confidence from individual annotations
                confidences = [annotation.confidence for annotation in response.text_annotations[1:] if annotation.confidence > 0]
                avg_confidence = sum(confidences) / len(confidences) if confidences else 0.8
                return full_text, avg_confidence
            else:
                return "", 0.0
        except Exception as e:
            raise Exception(f"Google Vision API error: {str(e)}")

    @staticmethod
    def extract_text(image_path: str) -> Tuple[str, float]:
        """Extract text using configured OCR engine"""
        if USE_GOOGLE_VISION:
            return OCRExtractor.extract_text_google_vision(image_path)
        elif USE_TESSERACT:
            return OCRExtractor.extract_text_tesseract(image_path)
        else:
            raise ValueError("No OCR engine configured. Enable TESSERACT or GOOGLE_VISION")


class MedicalDataExtractor:
    """Extract structured medical data from OCR text"""

    # Regex patterns for common medical terms
    PATTERNS = {
        "patient_name": [
            r"Patient Name[:\s]*([A-Za-z\s]+)",
            r"Name[:\s]*([A-Za-z\s]+)",
            r"Patient[:\s]*([A-Za-z\s]+)(?=\n|Date|DOB|Age)",
        ],
        "doctor_name": [
            r"Doctor[:\s]*([A-Za-z\s.]+)",
            r"Physician[:\s]*([A-Za-z\s.]+)",
            r"Dr\.?\s+([A-Za-z\s.]+)",
            r"Prescriber[:\s]*([A-Za-z\s.]+)",
        ],
        "date": [
            r"Date[:\s]*(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})",
            r"(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})",
        ],
        "medications": [
            r"(?:Medication|Rx|Prescription)[:\s]*([A-Za-z0-9\s,\-\(\)]+)",
        ],
        "dosage": [
            r"(\d+(?:\.\d+)?)\s*(?:mg|ml|g|IU|mcg|units)",
            r"(\d+(?:\.\d+)?)\s*(?:tablet|capsule|drop|injection)",
        ],
        "frequency": [
            r"(?:every|once|twice|[0-9]+\s*times?)\s*(?:daily|day|hour|week|month)",
            r"(?:morning|afternoon|evening|night|bedtime)",
        ],
        "diagnosis": [
            r"Diagnosis[:\s]*([^:]*?)(?=\n|Treatment|Medication|$)",
            r"Chief Complaint[:\s]*([^:]*?)(?=\n|Diagnosis|$)",
        ],
        "findings": [
            r"Findings[:\s]*([^:]*?)(?=\n|Impression|Conclusion|$)",
            r"Impression[:\s]*([^:]*?)(?=\n|$)",
        ],
    }

    @staticmethod
    def extract_medications(text: str) -> List[Dict]:
        """Extract medication information from text"""
        medications = []
        
        # Look for common medication patterns
        medication_lines = re.findall(
            r"^.*?(?:Rx|Medication|Drug)[:\s]*(.+?)$",
            text,
            re.MULTILINE | re.IGNORECASE
        )
        
        for line in medication_lines:
            med_parts = re.split(r'[,;]', line)
            for part in med_parts:
                part = part.strip()
                if part and len(part) > 2:
                    medications.append({
                        "name": part[:100],
                        "dosage": None,
                        "frequency": None,
                    })
        
        return medications[:10]  # Limit to 10 medications

    @staticmethod
    def parse_date(date_str: str) -> Optional[datetime]:
        """Parse date string to datetime"""
        if not date_str:
            return None
        
        date_formats = [
            "%d/%m/%Y", "%m/%d/%Y", "%d-%m-%Y", "%m-%d-%Y",
            "%Y-%m-%d", "%d.%m.%Y", "%Y/%m/%d",
        ]
        
        for fmt in date_formats:
            try:
                return datetime.strptime(date_str.strip(), fmt)
            except ValueError:
                continue
        
        return None

    @staticmethod
    def extract_structured_data(text: str, doc_type: str = "other") -> Dict:
        """Extract structured medical data from OCR text"""
        extracted = {
            "patient_name": None,
            "doctor_name": None,
            "date": None,
            "diagnosis": None,
            "findings": None,
            "medications": [],
            "raw_text_preview": text[:500],
        }
        
        text_lower = text.lower()
        
        # Extract patient name
        for pattern in MedicalDataExtractor.PATTERNS["patient_name"]:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                extracted["patient_name"] = match.group(1).strip()[:100]
                break
        
        # Extract doctor name
        for pattern in MedicalDataExtractor.PATTERNS["doctor_name"]:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                extracted["doctor_name"] = match.group(1).strip()[:100]
                break
        
        # Extract date
        for pattern in MedicalDataExtractor.PATTERNS["date"]:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                date_obj = MedicalDataExtractor.parse_date(match.group(1))
                if date_obj:
                    extracted["date"] = date_obj.isoformat()
                break
        
        # Extract medications (for prescriptions)
        if doc_type == "prescription" or "medication" in text_lower or "rx" in text_lower:
            extracted["medications"] = MedicalDataExtractor.extract_medications(text)
        
        # Extract diagnosis
        for pattern in MedicalDataExtractor.PATTERNS["diagnosis"]:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                diagnosis = match.group(1).strip()
                extracted["diagnosis"] = diagnosis[:300]
                break
        
        # Extract findings (for imaging reports)
        if doc_type in ["mri", "ct_scan", "x_ray", "ultrasound"]:
            for pattern in MedicalDataExtractor.PATTERNS["findings"]:
                match = re.search(pattern, text, re.IGNORECASE)
                if match:
                    findings = match.group(1).strip()
                    extracted["findings"] = findings[:500]
                    break
        
        return extracted


class DocumentExtractor:
    """Main document extraction service"""

    @staticmethod
    def extract_from_image(image_path: str, doc_type: str = "other") -> Dict:
        """Extract text and metadata from image file"""
        result = {
            "success": False,
            "extracted_text": "",
            "confidence_score": 0.0,
            "structured_data": {},
            "error": None,
        }
        
        try:
            # Check file exists
            if not os.path.exists(image_path):
                raise FileNotFoundError(f"File not found: {image_path}")
            
            # Extract text using OCR
            text, confidence = OCRExtractor.extract_text(image_path)
            
            if not text or confidence < MIN_CONFIDENCE_SCORE:
                result["error"] = f"Low confidence extraction: {confidence:.2%}"
                return result
            
            result["extracted_text"] = text
            result["confidence_score"] = confidence
            
            # Extract structured data
            structured_data = MedicalDataExtractor.extract_structured_data(text, doc_type)
            result["structured_data"] = structured_data
            result["success"] = True
            
        except Exception as e:
            result["error"] = str(e)
        
        return result

    @staticmethod
    def extract_from_pdf(pdf_path: str, doc_type: str = "other") -> Dict:
        """Extract text from PDF file"""
        result = {
            "success": False,
            "extracted_text": "",
            "confidence_score": 0.0,
            "structured_data": {},
            "error": None,
        }
        
        try:
            import fitz
            doc = fitz.open(pdf_path)
            if len(doc) == 0:
                result["error"] = "Empty PDF file"
                return result
            
            # Extract text from all pages
            text = ""
            for page in doc:
                text += page.get_text() + "\n"
            
            text = text.strip()
            
            if text:
                result["extracted_text"] = text
                result["confidence_score"] = 1.0
                result["structured_data"] = MedicalDataExtractor.extract_structured_data(text, doc_type)
                result["success"] = True
            else:
                logger.info("PDF has no selectable text, rendering first page to image for OCR...")
                page = doc[0]
                pix = page.get_pixmap(dpi=150)
                temp_image_path = pdf_path.replace(".pdf", "_temp.png")
                pix.save(temp_image_path)
                
                # Extract from image
                result = DocumentExtractor.extract_from_image(temp_image_path, doc_type)
                if os.path.exists(temp_image_path):
                    os.remove(temp_image_path)
        except Exception as e:
            logger.exception(f"Exception during PDF extraction: {str(e)}")
            result["error"] = str(e)
        
        return result

    @staticmethod
    def add_embeddings_to_result(result: Dict) -> Dict:
        """
        Add vector embeddings to extraction result.
        Converts extracted text, diagnosis, and medications to embeddings.
        
        Args:
            result: Extraction result from extract_from_image or extract_from_pdf
            
        Returns:
            Updated result with embeddings added
        """
        if not result.get("success"):
            # Don't bother embedding if extraction failed
            logger.debug("Skipping embedding generation (extraction failed)")
            return result
        
        try:
            from services.embedding_service import get_embedding_processor
            
            processor = get_embedding_processor()
            
            if not processor.service.is_available():
                logger.warning("Embedding service not available, skipping embeddings")
                return result
            
            # Extract components for embedding
            extracted_text = result.get("extracted_text", "")
            structured_data = result.get("structured_data", {})
            
            diagnosis = structured_data.get("diagnosis")
            findings = structured_data.get("findings")
            medications = result.get("medications")  # Will be set by caller
            dosages = result.get("dosages")  # Will be set by caller
            
            # Generate embeddings
            logger.debug("Generating embeddings for extracted content...")
            embeddings = processor.process_document_embeddings(
                extracted_text=extracted_text,
                diagnosis=diagnosis,
                findings=findings,
                medications=medications,
                dosages=dosages,
            )
            
            # Add to result
            result["embeddings"] = embeddings
            logger.info("Successfully generated embeddings")
            
        except Exception as e:
            logger.error(f"Error generating embeddings: {str(e)}")
            result["embeddings"] = {
                "extracted_text_embedding": None,
                "diagnosis_embedding": None,
                "medication_embedding": None,
            }
        
        return result

