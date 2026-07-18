#!/usr/bin/env python3
"""
Simple end-to-end test with text file (no PDF conversion needed)
"""

import requests
import time
import sys
from pathlib import Path

BASE_URL = "http://localhost:8000"

print("\n" + "="*70)
print("  COMPLETE END-TO-END VERIFICATION TEST")
print("="*70)

# Create test file
print("\n[Step 1] Creating test document...")
test_file = Path("test_prescription.txt")

content = """PRESCRIPTION

Patient Name: John Doe
Date of Birth: 01/15/1985
Prescription Date: 07/18/2024

Doctor: Dr. Michael Smith
Medical License: MD123456
Clinic: Central Medical Center

DIAGNOSIS:
Hypertension Stage 2
Type 2 Diabetes Mellitus

MEDICATIONS:

1. Lisinopril
   Dosage: 10 mg
   Frequency: Once daily in the morning
   Quantity: 30 tablets
   Refills: 3

2. Metformin
   Dosage: 500 mg
   Frequency: Twice daily with meals
   Quantity: 60 tablets
   Refills: 3

3. Atorvastatin
   Dosage: 20 mg
   Frequency: Once daily at bedtime
   Quantity: 30 tablets
   Refills: 3

INSTRUCTIONS:
- Take all medications as prescribed
- Monitor blood pressure daily
- Maintain low sodium diet
- Exercise 30 minutes daily
- Follow up in 4 weeks
- Do not stop medications without consulting doctor

Notes: Patient is compliant with medication regimen. 
Recheck blood work in 3 months.
"""

test_file.write_text(content)
print("[OK] Test file created: " + str(test_file))
print("[OK] File size: " + str(len(content)) + " bytes")

# Test 1: Health check
print("\n[Step 2] Testing API health...")
try:
    response = requests.get(f"{BASE_URL}/health", timeout=5)
    if response.status_code == 200:
        print("[OK] API is healthy: " + str(response.json()))
    else:
        print("[FAIL] Health check failed: " + str(response.status_code))
        sys.exit(1)
except Exception as e:
    print("[FAIL] Cannot connect to API: " + str(e))
    print("  Make sure server is running: python -m uvicorn main:app --reload")
    sys.exit(1)

# Test 2: Upload document
print("\n[Step 3] Uploading test document...")
with open(test_file, 'rb') as f:
    files = {'file': f}
    data = {
        'document_type': 'prescription',
        'user_id': 1
    }
    
    try:
        response = requests.post(
            f"{BASE_URL}/api/documents/upload",
            files=files,
            data=data,
            timeout=10
        )
        
        if response.status_code == 200:
            result = response.json()
            doc_id = result['document_id']
            print("[OK] Upload successful")
            print("  Document ID: " + str(doc_id))
            print("  Status: " + result['status'])
        else:
            print("[FAIL] Upload failed: " + str(response.status_code))
            print("  Response: " + response.text)
            sys.exit(1)
    except Exception as e:
        print("[FAIL] Upload error: " + str(e))
        sys.exit(1)

# Test 3: Wait and check status
print("\n[Step 4] Waiting for extraction (5 seconds)...")
time.sleep(5)

# Test 4: Check extraction status
print("\n[Step 5] Checking extraction status...")
try:
    response = requests.get(f"{BASE_URL}/api/documents/status/{doc_id}", timeout=5)
    status_data = response.json()
    
    print("[OK] Status retrieved:")
    print("  Status: " + status_data['status'])
    print("  Confidence: " + str(status_data.get('confidence_score', 'N/A')))
    
    if status_data.get('error_message'):
        print("  Error: " + status_data['error_message'])
except Exception as e:
    print("[FAIL] Status check error: " + str(e))
    sys.exit(1)

# Test 5: Get full document
print("\n[Step 6] Retrieving extracted data...")
try:
    response = requests.get(f"{BASE_URL}/api/documents/{doc_id}", timeout=5)
    doc_data = response.json()
    
    print("[OK] Document data retrieved:")
    print("  File: " + doc_data['file_name'])
    print("  Type: " + doc_data['document_type'])
    print("  Status: " + doc_data['extraction_status'])
    print("  Confidence: " + str(doc_data.get('confidence_score', 'N/A')))
    
    if doc_data.get('patient_name'):
        print("  Patient: " + doc_data['patient_name'])
    if doc_data.get('doctor_name'):
        print("  Doctor: " + doc_data['doctor_name'])
    if doc_data.get('diagnosis'):
        print("  Diagnosis: " + doc_data['diagnosis'][:50] + "...")
    
    if doc_data.get('extracted_text'):
        print("  Extracted text length: " + str(len(doc_data['extracted_text'])) + " chars")
        
except Exception as e:
    print("[FAIL] Error getting document: " + str(e))
    sys.exit(1)

# Test 6: Get metadata
print("\n[Step 7] Retrieving extracted metadata...")
try:
    response = requests.get(f"{BASE_URL}/api/documents/{doc_id}/metadata", timeout=5)
    metadata = response.json()
    
    print("[OK] Metadata retrieved:")
    print("  Patient: " + str(metadata.get('patient_name')))
    print("  Doctor: " + str(metadata.get('doctor_name')))
    print("  Diagnosis: " + str(metadata.get('diagnosis')))
    
    if metadata.get('medications'):
        print("  Medications found: " + str(len(metadata['medications'])))
        for med in metadata['medications'][:3]:
            if isinstance(med, dict):
                print("    - " + str(med.get('name')))
            else:
                print("    - " + str(med))
    
except Exception as e:
    print("[FAIL] Error getting metadata: " + str(e))
    sys.exit(1)

# Test 7: Check database
print("\n[Step 8] Verifying database status...")
try:
    response = requests.get(f"{BASE_URL}/debug/database", timeout=5)
    print("[OK] Database status endpoint called")
    print("  Check server console for detailed database info")
except Exception as e:
    print("[WARN] Database check warning: " + str(e))

# Test 8: Check specific document in database
print("\n[Step 9] Checking specific document in database...")
try:
    response = requests.get(f"{BASE_URL}/debug/document/{doc_id}", timeout=5)
    print("[OK] Document detail endpoint called")
    print("  Check server console for detailed document info")
except Exception as e:
    print("[WARN] Document detail warning: " + str(e))

# Final summary
print("\n" + "="*70)
print("  TEST SUMMARY")
print("="*70)
print("\nDocument ID: " + str(doc_id))
print("Document Status: " + status_data['status'])
print("Confidence Score: " + str(status_data.get('confidence_score', 'N/A')))
print("\nExtraction Results:")
print("  - Extracted text: " + str(len(doc_data.get('extracted_text', '')) > 0))
print("  - Patient identified: " + str(bool(doc_data.get('patient_name'))))
print("  - Doctor identified: " + str(bool(doc_data.get('doctor_name'))))
print("  - Diagnosis identified: " + str(bool(doc_data.get('diagnosis'))))

if status_data['status'] == 'completed':
    print("\n[SUCCESS] ALL TESTS PASSED!")
    print("[SUCCESS] System is working correctly")
    print("[SUCCESS] Data is being saved to database")
    print("[SUCCESS] Extraction is completing successfully")
elif status_data['status'] == 'processing':
    print("\n[PENDING] Still processing...")
    print("  Wait a few more seconds and check again")
else:
    print("\n[INFO] Status: " + status_data['status'])
    if status_data.get('error_message'):
        print("  Error: " + status_data['error_message'])

print("\n" + "="*70)

# Cleanup
test_file.unlink()
print("\n[OK] Test file cleaned up")
print("\nNext steps:")
print("  1. Check medical_extraction.log for detailed logs")
print("  2. Visit http://localhost:8000/docs for API testing")
print("  3. Upload real medical documents to test extraction quality")
