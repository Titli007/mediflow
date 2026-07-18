"""
Utility functions for medical document processing
"""

import json
from typing import Dict, List, Optional
from datetime import datetime


class DocumentUtils:
    """Utility functions for document handling"""
    
    @staticmethod
    def format_extracted_data(raw_text: str, doc_type: str) -> Dict:
        """Format extracted data for API response"""
        return {
            "raw_text": raw_text,
            "document_type": doc_type,
            "extraction_timestamp": datetime.utcnow().isoformat(),
            "text_length": len(raw_text),
            "lines_count": len(raw_text.split('\n')),
        }
    
    @staticmethod
    def clean_text(text: str) -> str:
        """Clean extracted text"""
        # Remove extra whitespace
        lines = [line.strip() for line in text.split('\n')]
        lines = [line for line in lines if line]
        return '\n'.join(lines)
    
    @staticmethod
    def extract_phone_numbers(text: str) -> List[str]:
        """Extract phone numbers from text"""
        import re
        pattern = r'\b\d{3}[-.]?\d{3}[-.]?\d{4}\b'
        matches = re.findall(pattern, text)
        return list(set(matches))
    
    @staticmethod
    def extract_emails(text: str) -> List[str]:
        """Extract email addresses from text"""
        import re
        pattern = r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
        matches = re.findall(pattern, text)
        return list(set(matches))
    
    @staticmethod
    def extract_dates(text: str) -> List[str]:
        """Extract date patterns from text"""
        import re
        pattern = r'\b\d{1,2}[-/]\d{1,2}[-/]\d{2,4}\b'
        matches = re.findall(pattern, text)
        return list(set(matches))
    
    @staticmethod
    def extract_numbers(text: str) -> List[str]:
        """Extract numeric values from text"""
        import re
        pattern = r'\b\d+(?:\.\d+)?\b'
        matches = re.findall(pattern, text)
        return list(set(matches))[:20]  # Limit to first 20


class MedicationParser:
    """Parse medication information from text"""
    
    COMMON_DOSAGE_UNITS = [
        'mg', 'mcg', 'g', 'kg', 'ml', 'l', 'iu', 'units', 
        'tablet', 'capsule', 'drop', 'spray', 'injection'
    ]
    
    COMMON_FREQUENCIES = [
        'once daily', 'twice daily', 'three times daily',
        'every morning', 'every evening', 'at bedtime',
        'as needed', 'twice a week', 'once a week'
    ]
    
    @staticmethod
    def parse_medication_line(line: str) -> Dict:
        """Parse a single medication line"""
        import re
        
        med_info = {
            "name": "",
            "dosage": "",
            "frequency": "",
            "duration": "",
        }
        
        # Try to extract medication name (usually the first word/phrase)
        parts = line.split(',')
        if parts:
            med_info["name"] = parts[0].strip()[:100]
        
        # Look for dosage
        for unit in MedicationParser.COMMON_DOSAGE_UNITS:
            pattern = rf'(\d+(?:\.\d+)?)\s*{unit}'
            match = re.search(pattern, line, re.IGNORECASE)
            if match:
                med_info["dosage"] = match.group(0)
                break
        
        # Look for frequency
        for freq in MedicationParser.COMMON_FREQUENCIES:
            if freq.lower() in line.lower():
                med_info["frequency"] = freq
                break
        
        return med_info


class DiagnosisExtractor:
    """Extract diagnosis and clinical findings"""
    
    DIAGNOSIS_KEYWORDS = [
        'diagnosis', 'diagnosed with', 'condition', 'disorder',
        'syndrome', 'disease', 'illness', 'patient has'
    ]
    
    FINDING_KEYWORDS = [
        'finding', 'findings', 'impression', 'conclusion',
        'result', 'results', 'noted', 'revealed', 'showed',
        'evidence', 'indicates'
    ]
    
    @staticmethod
    def extract_diagnosis(text: str) -> Optional[str]:
        """Extract diagnosis from text"""
        import re
        
        text_lower = text.lower()
        
        for keyword in DiagnosisExtractor.DIAGNOSIS_KEYWORDS:
            pattern = rf'{keyword}[:\s]*([^.!?\n]+)'
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                return match.group(1).strip()[:300]
        
        return None
    
    @staticmethod
    def extract_findings(text: str) -> Optional[str]:
        """Extract medical findings from text"""
        import re
        
        text_lower = text.lower()
        
        for keyword in DiagnosisExtractor.FINDING_KEYWORDS:
            pattern = rf'{keyword}[:\s]*([^.!?\n]+)'
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                return match.group(1).strip()[:500]
        
        return None


class QualityMetrics:
    """Calculate quality metrics for extracted data"""
    
    @staticmethod
    def calculate_text_quality_score(text: str, confidence_score: float) -> float:
        """Calculate overall quality score"""
        if not text:
            return 0.0
        
        quality = confidence_score
        
        # Bonus for text length (indicates more content extracted)
        if len(text) > 100:
            quality += 0.05
        if len(text) > 500:
            quality += 0.05
        
        # Penalty for suspicious patterns
        if text.count('?') > len(text) * 0.1:  # Too many unknown chars
            quality -= 0.1
        
        return min(quality, 1.0)
    
    @staticmethod
    def is_high_quality(confidence_score: float, text_length: int) -> bool:
        """Determine if extraction is high quality"""
        return confidence_score > 0.8 and text_length > 200
    
    @staticmethod
    def get_quality_level(score: float) -> str:
        """Get human-readable quality level"""
        if score >= 0.9:
            return "Excellent"
        elif score >= 0.75:
            return "Good"
        elif score >= 0.6:
            return "Fair"
        elif score >= 0.4:
            return "Poor"
        else:
            return "Very Poor"


class ReportFormatter:
    """Format extracted data into readable reports"""
    
    @staticmethod
    def format_prescription_report(data: Dict) -> str:
        """Format prescription data as readable report"""
        report = []
        report.append("=" * 60)
        report.append("PRESCRIPTION REPORT")
        report.append("=" * 60)
        
        if data.get('patient_name'):
            report.append(f"\nPatient: {data['patient_name']}")
        if data.get('doctor_name'):
            report.append(f"Doctor: {data['doctor_name']}")
        if data.get('date'):
            report.append(f"Date: {data['date']}")
        
        if data.get('medications'):
            report.append("\nMEDICATIONS:")
            for med in data['medications']:
                med_line = f"  • {med.get('name', 'Unknown')}"
                if med.get('dosage'):
                    med_line += f" - {med['dosage']}"
                if med.get('frequency'):
                    med_line += f" ({med['frequency']})"
                report.append(med_line)
        
        if data.get('notes'):
            report.append(f"\nNotes: {data['notes']}")
        
        report.append("\n" + "=" * 60)
        return '\n'.join(report)
    
    @staticmethod
    def format_lab_report(data: Dict) -> str:
        """Format lab report data"""
        report = []
        report.append("=" * 60)
        report.append("LAB REPORT")
        report.append("=" * 60)
        
        if data.get('patient_name'):
            report.append(f"\nPatient: {data['patient_name']}")
        if data.get('date'):
            report.append(f"Date: {data['date']}")
        
        if data.get('findings'):
            report.append(f"\nFindings:\n{data['findings']}")
        
        report.append("\n" + "=" * 60)
        return '\n'.join(report)
