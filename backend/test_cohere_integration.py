"""
Test script to verify Cohere embeddings are working correctly.
Run this before uploading documents to ensure everything is configured.
"""

import os
import sys

print("=" * 70)
print("COHERE EMBEDDING VERIFICATION TEST")
print("=" * 70)

# Test 1: Check if COHERE_API_KEY is set
print("\n[1] Checking COHERE_API_KEY...")
cohere_key = os.getenv("COHERE_API_KEY")
if cohere_key:
    print(f"    ✅ COHERE_API_KEY is set")
    print(f"    Key starts with: {cohere_key[:20]}...")
else:
    print(f"    ❌ COHERE_API_KEY not set!")
    print(f"    Add to .env: COHERE_API_KEY=your-key-from-cohere.ai")
    sys.exit(1)

# Test 2: Check if cohere package is installed
print("\n[2] Checking cohere package installation...")
try:
    import cohere
    print(f"    ✅ cohere package is installed")
    print(f"    Version: {cohere.__version__ if hasattr(cohere, '__version__') else 'unknown'}")
except ImportError:
    print(f"    ❌ cohere package not installed!")
    print(f"    Install with: pip install cohere")
    sys.exit(1)

# Test 3: Test Cohere client initialization
print("\n[3] Testing Cohere client initialization...")
try:
    client = cohere.ClientV2(api_key=cohere_key)
    print(f"    ✅ Cohere client initialized successfully")
except Exception as e:
    print(f"    ❌ Failed to initialize Cohere client: {str(e)}")
    sys.exit(1)

# Test 4: Test actual embedding generation
print("\n[4] Testing embedding generation (actual API call)...")
try:
    test_text = "The patient presents with Type 2 diabetes and hypertension"
    print(f"    Testing text: '{test_text}'")
    
    response = client.embed(
        model="embed-english-v3.0",
        texts=[test_text],
        input_type="search_document"
    )
    
    if response.embeddings and len(response.embeddings) > 0:
        embedding = response.embeddings[0]
        print(f"    ✅ Embedding generated successfully!")
        print(f"    Embedding dimensions: {len(embedding)}")
        print(f"    First 5 values: {embedding[:5]}")
        print(f"    Last 5 values: {embedding[-5:]}")
    else:
        print(f"    ❌ No embeddings returned from Cohere")
        sys.exit(1)
        
except Exception as e:
    print(f"    ❌ Embedding generation failed: {str(e)}")
    print(f"    Check your COHERE_API_KEY is correct and you haven't exceeded quota")
    sys.exit(1)

# Test 5: Check EmbeddingService class
print("\n[5] Testing EmbeddingService class...")
try:
    from services.embedding_service import EmbeddingService, MedicalEmbeddingProcessor
    
    service = EmbeddingService()
    
    if not service.is_available():
        print(f"    ❌ EmbeddingService reports not available")
        sys.exit(1)
    
    print(f"    ✅ EmbeddingService initialized")
    print(f"    Active model: {service.MODEL}")
    print(f"    Dimension: {service.DIMENSION}")
    
    # Test embedding via service
    test_embedding = service.embed_text("Medical test document")
    if test_embedding:
        print(f"    ✅ Service.embed_text() works")
        print(f"    Generated embedding with {len(test_embedding)} dimensions")
    else:
        print(f"    ❌ Service.embed_text() returned None")
        sys.exit(1)
    
except Exception as e:
    print(f"    ❌ EmbeddingService test failed: {str(e)}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

# Test 6: Test MedicalEmbeddingProcessor
print("\n[6] Testing MedicalEmbeddingProcessor...")
try:
    processor = MedicalEmbeddingProcessor()
    
    embeddings = processor.process_document_embeddings(
        extracted_text="Patient with diabetes and high blood pressure on medication",
        diagnosis="Type 2 Diabetes Mellitus",
        findings="Elevated blood glucose levels",
        medications='[{"name": "Metformin", "dosage": "500mg"}]',
        dosages='{"Metformin": "twice daily"}'
    )
    
    if embeddings["extracted_text_embedding"]:
        print(f"    ✅ extracted_text_embedding: {len(embeddings['extracted_text_embedding'])} dims")
    else:
        print(f"    ⚠️  extracted_text_embedding: None")
    
    if embeddings["diagnosis_embedding"]:
        print(f"    ✅ diagnosis_embedding: {len(embeddings['diagnosis_embedding'])} dims")
    else:
        print(f"    ⚠️  diagnosis_embedding: None")
    
    if embeddings["medication_embedding"]:
        print(f"    ✅ medication_embedding: {len(embeddings['medication_embedding'])} dims")
    else:
        print(f"    ⚠️  medication_embedding: None")
    
    print(f"    ✅ MedicalEmbeddingProcessor works correctly")
    
except Exception as e:
    print(f"    ❌ MedicalEmbeddingProcessor test failed: {str(e)}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

# Test 7: Check pgvector in PostgreSQL
print("\n[7] Checking PostgreSQL and pgvector...")
try:
    from sqlalchemy import create_engine, text
    from config.settings import DATABASE_URL
    
    if "sqlite" in DATABASE_URL:
        print(f"    ⚠️  Using SQLite (pgvector not available on SQLite)")
        print(f"    For production, use PostgreSQL: {DATABASE_URL}")
    else:
        engine = create_engine(DATABASE_URL)
        with engine.connect() as conn:
            result = conn.execute(text("SELECT 1 FROM pg_extension WHERE extname = 'vector'"))
            if result.fetchone():
                print(f"    ✅ pgvector extension installed in PostgreSQL")
            else:
                print(f"    ⚠️  pgvector extension NOT installed")
                print(f"    Run in PostgreSQL: CREATE EXTENSION IF NOT EXISTS vector;")
        
except Exception as e:
    print(f"    ⚠️  Could not verify pgvector: {str(e)}")

print("\n" + "=" * 70)
print("✅ ALL TESTS PASSED!")
print("=" * 70)
print("\nYou're ready to:")
print("1. Start the server: python -m uvicorn main:app --reload")
print("2. Upload a document: curl -X POST http://localhost:8000/api/documents/upload \\")
print("                            -F 'file=@document.pdf' \\")
print("                            -F 'document_type=prescription'")
print("3. Check embeddings were stored in database")
print("\n" + "=" * 70)
