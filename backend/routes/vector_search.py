"""
API routes for vector similarity search on medical documents.
Provides endpoints for semantic search, similar document finding, and medication synonym lookup.
"""

import logging
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional, List

from config.database import get_db
from config.logging_config import get_logger
from models.document import Document
from services.embedding_service import get_embedding_processor
from services.vector_search_service import VectorSearchService
from pydantic import BaseModel, Field
from datetime import datetime

logger = get_logger(__name__)
router = APIRouter(prefix="/api/documents", tags=["vector_search"])


# ============================================================================
# Request/Response Models
# ============================================================================

class SimilarDocumentResponse(BaseModel):
    """Response for similar documents"""
    id: int
    file_name: str
    patient_name: Optional[str] = None
    diagnosis: Optional[str] = None
    document_type: Optional[str] = None
    similarity_score: float = Field(..., ge=0, le=1, description="Cosine similarity (0-1)")
    uploaded_at: Optional[str] = None


class SimilarDocumentsListResponse(BaseModel):
    """Response for list of similar documents"""
    reference_document_id: int
    reference_file_name: str
    embedding_field: str = "extracted_text_embedding"
    total_found: int
    similar_documents: List[SimilarDocumentResponse]


class SemanticSearchRequest(BaseModel):
    """Request for semantic search"""
    query: str = Field(..., min_length=5, description="Medical query text")
    limit: int = Field(10, ge=1, le=50, description="Max results to return")
    min_similarity: float = Field(0.6, ge=0, le=1, description="Minimum similarity threshold")


class SemanticSearchResultResponse(BaseModel):
    """Individual search result"""
    id: int
    file_name: str
    patient_name: Optional[str] = None
    diagnosis: Optional[str] = None
    document_type: Optional[str] = None
    extracted_text_preview: Optional[str] = None
    similarity_score: float = Field(..., ge=0, le=1)
    uploaded_at: Optional[str] = None


class SemanticSearchResponse(BaseModel):
    """Response for semantic search"""
    query: str
    results_count: int
    embedding_field: str
    results: List[SemanticSearchResultResponse]


class MedicationSynonymResponse(BaseModel):
    """Individual medication synonym"""
    medication_name: str
    found_in_document: str
    patient: Optional[str] = None
    similarity_score: float = Field(..., ge=0, le=1)


class MedicationSynonymsResponse(BaseModel):
    """Response for medication synonym search"""
    query_medication: str
    total_found: int
    synonyms: List[MedicationSynonymResponse]


# ============================================================================
# Endpoints
# ============================================================================

@router.get("/similar/{document_id}", response_model=SimilarDocumentsListResponse)
async def find_similar_documents(
    document_id: int,
    embedding_field: str = Query(
        "extracted_text_embedding",
        description="Which embedding to use for similarity"
    ),
    limit: int = Query(10, ge=1, le=50),
    min_similarity: float = Query(0.6, ge=0, le=1),
    db: Session = Depends(get_db),
):
    """
    Find documents clinically similar to a reference document.
    
    Uses vector similarity on extracted text embeddings to find documents
    with similar medical content.
    
    **Query Parameters:**
    - `embedding_field`: Choose between:
      - `extracted_text_embedding` (full document similarity)
      - `diagnosis_embedding` (diagnosis similarity)
      - `medication_embedding` (medication similarity)
    - `limit`: Max number of results (1-50)
    - `min_similarity`: Minimum similarity score (0-1)
    
    **Returns:**
    List of similar documents ranked by similarity score (descending)
    """
    logger.info(
        f"[SIMILAR] Searching for similar docs to #{document_id} "
        f"(field: {embedding_field}, limit: {limit})"
    )
    
    try:
        # Validate embedding field
        valid_fields = [
            "extracted_text_embedding",
            "diagnosis_embedding",
            "medication_embedding"
        ]
        if embedding_field not in valid_fields:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid embedding_field. Must be one of: {valid_fields}"
            )
        
        # Check document exists
        doc = db.query(Document).filter(Document.id == document_id).first()
        if not doc:
            logger.warning(f"Document {document_id} not found")
            raise HTTPException(status_code=404, detail="Reference document not found")
        
        # Check embedding exists
        embedding = getattr(doc, embedding_field, None)
        if embedding is None:
            logger.warning(
                f"Document {document_id} has no {embedding_field} embedding"
            )
            raise HTTPException(
                status_code=400,
                detail=f"Reference document has no {embedding_field} embedding yet"
            )
        
        # Find similar documents
        similar_docs = VectorSearchService.find_similar_documents(
            db=db,
            document_id=document_id,
            embedding_field=embedding_field,
            limit=limit,
            min_similarity=min_similarity,
            exclude_same_user=False
        )
        
        logger.info(f"[SIMILAR] Found {len(similar_docs)} similar documents")
        
        return SimilarDocumentsListResponse(
            reference_document_id=document_id,
            reference_file_name=doc.file_name,
            embedding_field=embedding_field,
            total_found=len(similar_docs),
            similar_documents=[SimilarDocumentResponse(**doc) for doc in similar_docs]
        )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error finding similar documents: {str(e)}")
        raise HTTPException(status_code=500, detail="Error searching for similar documents")


@router.post("/search/semantic", response_model=SemanticSearchResponse)
async def semantic_search(
    request: SemanticSearchRequest,
    user_id: int = Query(..., ge=1, description="User ID to filter results"),
    embedding_field: str = Query(
        "extracted_text_embedding",
        description="Which embedding to search"
    ),
    db: Session = Depends(get_db),
):
    """
    Perform semantic search using natural language query.
    
    Converts query to embedding and finds similar documents.
    This is more powerful than keyword search as it understands medical concepts.
    
    **Example queries:**
    - "chest pain with shortness of breath"
    - "elevated blood pressure"
    - "diabetic complications"
    
    **Query Parameters:**
    - `user_id`: Filter results to this user only
    - `embedding_field`: Which embedding to search
    
    **Returns:**
    Top matching documents ranked by semantic similarity
    """
    logger.info(
        f"[SEMANTIC] Search query: '{request.query[:50]}...' "
        f"(user: {user_id}, field: {embedding_field})"
    )
    
    try:
        # Get embedding processor
        processor = get_embedding_processor()
        
        if not processor.service.is_available():
            logger.error("Embedding service not available")
            raise HTTPException(
                status_code=503,
                detail="Embedding service temporarily unavailable"
            )
        
        # Generate embedding for query
        logger.debug("Generating embedding for query...")
        query_embedding = processor.service.embed_text(request.query)
        
        if query_embedding is None:
            logger.warning("Failed to generate query embedding")
            raise HTTPException(
                status_code=500,
                detail="Failed to generate embedding for query"
            )
        
        # Perform search
        logger.debug("Performing vector similarity search...")
        results = VectorSearchService.semantic_search(
            db=db,
            query_embedding=query_embedding,
            user_id=user_id,
            embedding_field=embedding_field,
            limit=request.limit,
            min_similarity=request.min_similarity
        )
        
        logger.info(f"[SEMANTIC] Found {len(results)} results")
        
        return SemanticSearchResponse(
            query=request.query,
            results_count=len(results),
            embedding_field=embedding_field,
            results=[SemanticSearchResultResponse(**r) for r in results]
        )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in semantic search: {str(e)}")
        raise HTTPException(status_code=500, detail="Error performing semantic search")


@router.get("/medications/check-synonyms", response_model=MedicationSynonymsResponse)
async def check_medication_synonyms(
    drug_name: str = Query(..., min_length=2, description="Medication name to search"),
    limit: int = Query(10, ge=1, le=50, description="Max results"),
    min_similarity: float = Query(0.7, ge=0, le=1, description="Minimum similarity"),
    db: Session = Depends(get_db),
):
    """
    Find medication name variations and synonyms using semantic similarity.
    
    Useful for:
    - Finding generic/brand name pairs (e.g., "aspirin" ↔ "acetylsalicylic acid")
    - Detecting duplicate medications with different names
    - Understanding medication naming conventions
    
    **Example queries:**
    - "aspirin" → finds "acetylsalicylic acid", "ASA"
    - "metformin" → finds "glucophage", other names
    - "ibuprofen" → finds "advil", "motrin"
    
    **Returns:**
    List of medication names with similarity scores
    """
    logger.info(f"[MEDICATIONS] Searching synonyms for: {drug_name}")
    
    try:
        # Get embedding processor
        processor = get_embedding_processor()
        
        if not processor.service.is_available():
            logger.error("Embedding service not available")
            raise HTTPException(
                status_code=503,
                detail="Embedding service temporarily unavailable"
            )
        
        # Generate embedding for query drug name
        logger.debug(f"Generating embedding for drug: {drug_name}")
        query_embedding = processor.service.embed_text(drug_name)
        
        if query_embedding is None:
            logger.warning("Failed to generate embedding for drug name")
            raise HTTPException(
                status_code=500,
                detail="Failed to generate embedding for medication name"
            )
        
        # Find similar medications
        logger.debug("Searching for medication synonyms...")
        synonyms = VectorSearchService.find_medication_synonyms(
            db=db,
            query_embedding=query_embedding,
            limit=limit,
            min_similarity=min_similarity
        )
        
        logger.info(f"[MEDICATIONS] Found {len(synonyms)} synonym variations")
        
        return MedicationSynonymsResponse(
            query_medication=drug_name,
            total_found=len(synonyms),
            synonyms=[MedicationSynonymResponse(**s) for s in synonyms]
        )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error checking medication synonyms: {str(e)}")
        raise HTTPException(status_code=500, detail="Error checking medication synonyms")


@router.get("/health/vector-search")
async def vector_search_health(db: Session = Depends(get_db)):
    """
    Health check endpoint for vector search service.
    Verifies that:
    - Embedding service is available
    - PostgreSQL connection is working
    - pgvector extension is installed
    """
    logger.debug("Vector search health check")
    
    try:
        # Check embedding service
        processor = get_embedding_processor()
        embedding_available = processor.service.is_available()
        
        # Check database connection and pgvector
        pgvector_enabled = False
        try:
            result = db.execute("SELECT 1 FROM pg_extension WHERE extname = 'vector'")
            pgvector_enabled = result.fetchone() is not None
        except Exception as e:
            logger.warning(f"Could not check pgvector extension: {str(e)}")
        
        # Check if any documents have embeddings
        doc_with_embedding = db.query(Document).filter(
            Document.extracted_text_embedding.isnot(None)
        ).first()
        has_embeddings = doc_with_embedding is not None
        
        health_status = {
            "status": "healthy" if embedding_available and pgvector_enabled else "degraded",
            "embedding_service_available": embedding_available,
            "pgvector_enabled": pgvector_enabled,
            "documents_with_embeddings": has_embeddings,
            "message": "All vector search services operational" if embedding_available else "Embedding service not available"
        }
        
        logger.info(f"Vector search health: {health_status['status']}")
        return health_status
    
    except Exception as e:
        logger.error(f"Vector search health check failed: {str(e)}")
        return {
            "status": "unhealthy",
            "error": str(e),
            "message": "Vector search service error"
        }
