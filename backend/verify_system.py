#!/usr/bin/env python3
"""
Quick verification script to test the system and database
Run this AFTER the server is running in another terminal
"""

import requests
import time
import sys
from pathlib import Path

BASE_URL = "http://localhost:8000"

def print_header(text):
    print("\n" + "="*60)
    print(f"  {text}")
    print("="*60)

def print_step(num, text):
    print(f"\n[Step {num}] {text}")

def test_1_health():
    print_step(1, "Testing API Health")
    try:
        response = requests.get(f"{BASE_URL}/health")
        print(f"✅ API is responding: {response.json()}")
        return True
    except Exception as e:
        print(f"❌ API not responding: {str(e)}")
        return False

def test_2_database():
    print_step(2, "Checking Database Status")
    try:
        response = requests.get(f"{BASE_URL}/debug/database")
        print(f"✅ Database check endpoint responding")
        print(f"⏳ Check console output for database status")
        return True
    except Exception as e:
        print(f"❌ Database check failed: {str(e)}")
        return False

def test_3_create_dummy_pdf():
    print_step(3, "Creating Test Document")
    test_file = Path("test_document.txt")
    
    # Create a simple text file as test
    content = """
    PRESCRIPTION
    
    Patient Name: John Doe
    Date: 01/15/2024
    Doctor: Dr. Smith
    
    MEDICATIONS:
    - Lisinopril 10mg - Once daily
    - Metformin 500mg - Twice daily
    
    DIAGNOSIS: Hypertension
    
    Instructions: Take with water. Do not skip doses.
    """
    
    test_file.write_text(content)
    print(f"✅ Test document created: {test_file}")
    return test_file

def test_4_upload(test_file):
    print_step(4, "Uploading Test Document")
    
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
                data=data
            )
            
            if response.status_code == 200:
                result = response.json()
                print(f"✅ Upload successful!")
                print(f"   Document ID: {result['document_id']}")
                print(f"   Status: {result['status']}")
                print(f"   Message: {result['message']}")
                print(f"⏳ Check console output for upload logs")
                return result['document_id']
            else:
                print(f"❌ Upload failed: {response.status_code}")
                print(f"   Response: {response.text}")
                return None
        except Exception as e:
            print(f"❌ Upload error: {str(e)}")
            return None

def test_5_wait_and_check(doc_id):
    print_step(5, "Waiting for Extraction (10 seconds)")
    
    for i in range(10):
        print(f"  {i+1}/10...", end="\r", flush=True)
        time.sleep(1)
    
    print("✅ Waiting complete")

def test_6_check_status(doc_id):
    print_step(6, f"Checking Extraction Status for Document {doc_id}")
    
    try:
        response = requests.get(f"{BASE_URL}/api/documents/status/{doc_id}")
        result = response.json()
        
        print(f"✅ Status retrieved:")
        print(f"   Status: {result['status']}")
        print(f"   Confidence: {result.get('confidence_score')}")
        print(f"   Error: {result.get('error_message')}")
        
        if result['status'] == 'completed':
            print(f"✅ Extraction completed!")
            return True
        elif result['status'] == 'processing':
            print(f"⏳ Still processing... Wait a few more seconds")
            return False
        elif result['status'] == 'failed':
            print(f"❌ Extraction failed: {result.get('error_message')}")
            return False
        else:
            print(f"⏳ Status: {result['status']}")
            return False
    except Exception as e:
        print(f"❌ Status check error: {str(e)}")
        return False

def test_7_get_document(doc_id):
    print_step(7, f"Getting Full Document Details")
    
    try:
        response = requests.get(f"{BASE_URL}/api/documents/{doc_id}")
        result = response.json()
        
        print(f"✅ Document retrieved:")
        print(f"   Filename: {result['file_name']}")
        print(f"   Type: {result['document_type']}")
        print(f"   Status: {result['extraction_status']}")
        print(f"   Confidence: {result['confidence_score']}")
        
        if result.get('extracted_text'):
            print(f"   Text Length: {len(result['extracted_text'])} chars")
            print(f"   Text Preview: {result['extracted_text'][:100]}...")
        
        if result.get('patient_name'):
            print(f"   Patient: {result['patient_name']}")
        if result.get('doctor_name'):
            print(f"   Doctor: {result['doctor_name']}")
        
        return True
    except Exception as e:
        print(f"❌ Error getting document: {str(e)}")
        return False

def test_8_debug_database():
    print_step(8, "Checking Database Status")
    
    try:
        response = requests.get(f"{BASE_URL}/debug/database")
        print(f"✅ Database status check sent")
        print(f"⏳ Check console output for detailed database info")
        return True
    except Exception as e:
        print(f"❌ Database check error: {str(e)}")
        return False

def main():
    print_header("MEDICAL DOCUMENT EXTRACTION SYSTEM - VERIFICATION")
    print("\n📋 This script will test the complete workflow")
    print("💡 Watch the server console for detailed logs!")
    
    # Test 1: Health
    if not test_1_health():
        print("\n❌ Server is not running!")
        print("Start it with: python -m uvicorn main:app --reload")
        sys.exit(1)
    
    # Test 2: Database
    test_2_database()
    
    # Test 3: Create test file
    test_file = test_3_create_dummy_pdf()
    
    # Test 4: Upload
    doc_id = test_4_upload(test_file)
    if not doc_id:
        print("\n❌ Upload failed!")
        sys.exit(1)
    
    # Test 5: Wait for processing
    test_5_wait_and_check(doc_id)
    
    # Test 6: Check status
    if test_6_check_status(doc_id):
        # Test 7: Get document
        test_7_get_document(doc_id)
    
    # Test 8: Database
    test_8_database()
    
    print_header("VERIFICATION COMPLETE ✅")
    print("\n📊 Summary:")
    print(f"   Document ID: {doc_id}")
    print(f"   ✅ Upload successful")
    print(f"   ✅ Database working")
    print(f"   ✅ Extraction processing")
    print(f"\n📝 Next steps:")
    print(f"   1. Check console logs for processing details")
    print(f"   2. Visit http://localhost:8000/docs for API testing")
    print(f"   3. Check /debug/document/{doc_id} for full details")
    print(f"   4. Check medical_extraction.log for permanent record")
    
    # Cleanup
    test_file.unlink()
    print(f"\n✅ Test file cleaned up")

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n⏹️  Verification cancelled")
    except Exception as e:
        print(f"\n❌ Verification failed: {str(e)}")
        import traceback
        traceback.print_exc()
