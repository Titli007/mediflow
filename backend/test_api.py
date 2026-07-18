"""
Quick test script for the medical document extraction system
Run this to verify your setup is working correctly
"""

import requests
import json
from pathlib import Path

BASE_URL = "http://localhost:8000"

def test_health():
    """Test API health"""
    print("Testing API health...")
    response = requests.get(f"{BASE_URL}/health")
    print(f"✓ Health: {response.json()}")
    return response.status_code == 200

def test_root():
    """Test root endpoint"""
    print("\nTesting root endpoint...")
    response = requests.get(f"{BASE_URL}/")
    data = response.json()
    print(f"✓ API Title: {data['title']}")
    print(f"✓ Version: {data['version']}")
    print(f"✓ Available endpoints: {len(data['endpoints'])}")
    return response.status_code == 200

def test_upload_document(file_path, doc_type="prescription"):
    """Test document upload"""
    print(f"\nTesting document upload ({file_path})...")
    
    if not Path(file_path).exists():
        print(f"✗ File not found: {file_path}")
        return None
    
    with open(file_path, 'rb') as f:
        files = {'file': f}
        data = {
            'document_type': doc_type,
            'user_id': 1
        }
        response = requests.post(f"{BASE_URL}/api/documents/upload", files=files, data=data)
    
    if response.status_code == 200:
        result = response.json()
        print(f"✓ Upload successful")
        print(f"  Document ID: {result['document_id']}")
        print(f"  Status: {result['status']}")
        return result['document_id']
    else:
        print(f"✗ Upload failed: {response.text}")
        return None

def test_extraction_status(doc_id):
    """Check extraction status"""
    print(f"\nChecking extraction status for document {doc_id}...")
    response = requests.get(f"{BASE_URL}/api/documents/status/{doc_id}")
    
    if response.status_code == 200:
        result = response.json()
        print(f"✓ Status: {result['status']}")
        print(f"✓ Confidence: {result.get('confidence_score', 'N/A')}")
        if result.get('error_message'):
            print(f"✗ Error: {result['error_message']}")
        return result
    else:
        print(f"✗ Status check failed: {response.text}")
        return None

def test_get_document(doc_id):
    """Get complete document"""
    print(f"\nFetching document {doc_id}...")
    response = requests.get(f"{BASE_URL}/api/documents/{doc_id}")
    
    if response.status_code == 200:
        result = response.json()
        print(f"✓ File: {result['file_name']}")
        print(f"✓ Type: {result['document_type']}")
        print(f"✓ Status: {result['extraction_status']}")
        if result.get('patient_name'):
            print(f"✓ Patient: {result['patient_name']}")
        if result.get('doctor_name'):
            print(f"✓ Doctor: {result['doctor_name']}")
        return result
    else:
        print(f"✗ Failed to fetch document: {response.text}")
        return None

def test_get_text(doc_id):
    """Get extracted text"""
    print(f"\nGetting extracted text for document {doc_id}...")
    response = requests.get(f"{BASE_URL}/api/documents/{doc_id}/text")
    
    if response.status_code == 200:
        result = response.json()
        text = result.get('extracted_text', '')
        print(f"✓ Extracted text (first 200 chars):")
        print(f"  {text[:200]}...")
        return result
    else:
        print(f"✗ Failed to get text: {response.text}")
        return None

def test_get_metadata(doc_id):
    """Get structured metadata"""
    print(f"\nGetting metadata for document {doc_id}...")
    response = requests.get(f"{BASE_URL}/api/documents/{doc_id}/metadata")
    
    if response.status_code == 200:
        result = response.json()
        print(f"✓ Metadata extracted:")
        if result.get('patient_name'):
            print(f"  Patient: {result['patient_name']}")
        if result.get('doctor_name'):
            print(f"  Doctor: {result['doctor_name']}")
        if result.get('diagnosis'):
            print(f"  Diagnosis: {result['diagnosis']}")
        if result.get('medications'):
            print(f"  Medications: {len(result['medications'])} found")
            for med in result['medications'][:3]:
                print(f"    - {med.get('name')}")
        return result
    else:
        print(f"✗ Failed to get metadata: {response.text}")
        return None

def test_list_user_documents(user_id=1):
    """List all documents for user"""
    print(f"\nListing documents for user {user_id}...")
    response = requests.get(f"{BASE_URL}/api/documents/user/{user_id}/all?limit=10")
    
    if response.status_code == 200:
        result = response.json()
        print(f"✓ Total documents: {result['total']}")
        print(f"✓ Showing: {len(result['documents'])} documents")
        for doc in result['documents'][:3]:
            print(f"  - {doc['file_name']} ({doc['extraction_status']})")
        return result
    else:
        print(f"✗ Failed to list documents: {response.text}")
        return None

def test_delete_document(doc_id):
    """Delete a document"""
    print(f"\nDeleting document {doc_id}...")
    response = requests.delete(f"{BASE_URL}/api/documents/{doc_id}")
    
    if response.status_code == 200:
        print(f"✓ Document deleted successfully")
        return True
    else:
        print(f"✗ Failed to delete: {response.text}")
        return False

def run_full_workflow():
    """Run complete workflow test"""
    print("=" * 60)
    print("MEDICAL DOCUMENT EXTRACTION SYSTEM - TEST WORKFLOW")
    print("=" * 60)
    
    # Check API health
    if not test_health():
        print("\n✗ API is not running!")
        print("Start it with: python -m uvicorn main:app --reload")
        return
    
    if not test_root():
        print("\n✗ API root check failed")
        return
    
    if not test_list_user_documents():
        print("\n✗ Failed to list documents")
        return
    
    print("\n" + "=" * 60)
    print("All basic tests passed!")
    print("=" * 60)
    print("\nTo upload a document, place an image/PDF in the current directory")
    print("and call: test_upload_document('your_file.jpg', 'prescription')")

if __name__ == "__main__":
    try:
        run_full_workflow()
    except Exception as e:
        print(f"\n✗ Error: {str(e)}")
        print("Make sure the API is running on http://localhost:8000")
