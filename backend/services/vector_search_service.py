"""
Vector Search Service for pgvector similarity queries.
Implements semantic search using vector embeddings stored in PostgreSQL.
"""

import logging
from typing import List, Dict, Optional, Tuple
from sqlalchemy import text
from sqlalchemy.orm import Session
from models.document import Document
from config.logging_config import get_logger

logger = get_logger(__name__)


class VectorSearchService:
    """
    Service for performing vector similarity searches on medical documents.
    Uses pgvector extension in PostgreSQL for efficient similarity queries.
    """
    
    # Similarity threshold (0-1, where 1 is identical)
    MIN_SIMILARITY = 0.6
    
    @staticmethod
    def find_similar_documents(
        db: Session,
        document_id: int,
        embedding_field: str = "extracted_text_embedding",
        limit: int = 10,
        min_similarity: float = MIN_SIMILARITY,
        exclude_same_user: bool = False
    ) -> List[Dict]:
        """
        Find documents similar to a reference document using vector similarity.
        
        Args:
            db: Database session
            document_id: ID of reference document
            embedding_field: Which embedding to use (extracted_text, diagnosis, medication)
            limit: Maximum number of results to return
            min_similarity: Minimum cosine similarity score (0-1)
            exclude_same_user: If True, exclude documents from same patient
            
        Returns:
            List of similar documents with similarity scores
        """
        try:
            # Get reference document
            ref_doc = db.query(Document).filter(Document.id == document_id).first()
            
            if not ref_doc:
                logger.warning(f"Reference document {document_id} not found")
                return []
            
            # Check if embedding exists
            embedding = getattr(ref_doc, embedding_field, None)
            if embedding is None:
                logger.warning(
                    f"Document {document_id} has no {embedding_field} embedding"
                )
                return []
            
            # Build SQL query for vector similarity search
            # PostgreSQL pgvector uses <=> operator for cosine similarity distance
            query = f"""
                SELECT 
                    d.id,
                    d.file_name,
                    d.patient_name,
                    d.diagnosis,
                    d.document_type,
                    d.extraction_status,
                    d.confidence_score,
                    d.uploaded_at,
                    1 - (d.{embedding_field} <=> :embedding) as similarity_score
                FROM documents d
                WHERE d.id != :ref_doc_id
                    AND d.{embedding_field} IS NOT NULL
                    AND (1 - (d.{embedding_field} <=> :embedding)) >= :min_similarity
            """
            
            # Optionally exclude same-patient documents
            if exclude_same_user:
                query += f" AND d.user_id != :user_id"
            
            query += " ORDER BY similarity_score DESC LIMIT :limit"
            
            # Build parameters
            params = {
                "embedding": str(embedding),  # pgvector requires string format
                "ref_doc_id": document_id,
                "min_similarity": min_similarity,
                "limit": limit,
            }
            
            if exclude_same_user:
                params["user_id"] = ref_doc.user_id
            
            # Execute query
            results = db.execute(text(query), params).fetchall()
            
            # Format results
            similar_docs = []
            for row in results:
                similar_docs.append({
                    "id": row[0],
                    "file_name": row[1],
                    "patient_name": row[2],
                    "diagnosis": row[3],
                    "document_type": row[4],
                    "extraction_status": row[5],
                    "confidence_score": row[6],
                    "uploaded_at": row[7].isoformat() if row[7] else None,
                    "similarity_score": float(row[8]),
                })
            
            logger.info(
                f"Found {len(similar_docs)} documents similar to {document_id} "
                f"(field: {embedding_field}, min_sim: {min_similarity})"
            )
            
            return similar_docs
        
        except Exception as e:
            logger.error(f"Error finding similar documents: {str(e)}")
            return []
    
    @staticmethod
    def semantic_search(
        db: Session,
        query_embedding: List[float],
        user_id: int = None,
        embedding_field: str = "extracted_text_embedding",
        limit: int = 10,
        min_similarity: float = MIN_SIMILARITY
    ) -> List[Dict]:
        """
        Perform semantic search using a query embedding.
        
        Args:
            db: Database session
            query_embedding: Embedding vector from query text
            user_id: Optional user ID to filter by (None = search all)
            embedding_field: Which embedding field to search
            limit: Maximum number of results
            min_similarity: Minimum similarity score
            
        Returns:
            List of matching documents with scores
        """
        try:
            if query_embedding is None or len(query_embedding) == 0:
                logger.warning("Empty query embedding provided")
                return []
            
            # Build SQL query
            query = f"""
                SELECT 
                    d.id,
                    d.file_name,
                    d.patient_name,
                    d.diagnosis,
                    d.document_type,
                    d.extraction_status,
                    d.confidence_score,
                    d.uploaded_at,
                    d.extracted_text,
                    1 - (d.{embedding_field} <=> :embedding) as similarity_score
                FROM documents d
                WHERE d.{embedding_field} IS NOT NULL
                    AND (1 - (d.{embedding_field} <=> :embedding)) >= :min_similarity
            """
            
            params = {
                "embedding": str(query_embedding),
                "min_similarity": min_similarity,
            }
            
            # Filter by user if provided
            if user_id is not None:
                query += " AND d.user_id = :user_id"
                params["user_id"] = user_id
            
            query += " ORDER BY similarity_score DESC LIMIT :limit"
            params["limit"] = limit
            
            # Execute query
            results = db.execute(text(query), params).fetchall()
            
            # Format results
            search_results = []
            for row in results:
                search_results.append({
                    "id": row[0],
                    "file_name": row[1],
                    "patient_name": row[2],
                    "diagnosis": row[3],
                    "document_type": row[4],
                    "extraction_status": row[5],
                    "confidence_score": row[6],
                    "uploaded_at": row[7].isoformat() if row[7] else None,
                    "extracted_text_preview": (row[8][:300] + "...") if row[8] else None,
                    "similarity_score": float(row[9]),
                })
            
            logger.info(
                f"Semantic search returned {len(search_results)} results "
                f"(field: {embedding_field})"
            )
            
            return search_results
        
        except Exception as e:
            logger.error(f"Error in semantic search: {str(e)}")
            return []
    
    @staticmethod
    def find_medication_synonyms(
        db: Session,
        query_embedding: List[float],
        limit: int = 10,
        min_similarity: float = 0.7
    ) -> List[Dict]:
        """
        Find medication name variations using medication embedding similarity.
        
        Args:
            db: Database session
            query_embedding: Embedding of query medication name
            limit: Maximum number of results
            min_similarity: Minimum similarity score
            
        Returns:
            List of medications with similarity scores
        """
        try:
            if query_embedding is None or len(query_embedding) == 0:
                logger.warning("Empty query embedding for medication search")
                return []
            
            # SQL query for medication synonym search
            query = """
                SELECT DISTINCT
                    d.medication_names,
                    d.id,
                    d.file_name,
                    d.patient_name,
                    1 - (d.medication_embedding <=> :embedding) as similarity_score
                FROM documents d
                WHERE d.medication_embedding IS NOT NULL
                    AND d.medication_names IS NOT NULL
                    AND (1 - (d.medication_embedding <=> :embedding)) >= :min_similarity
                ORDER BY similarity_score DESC
                LIMIT :limit
            """
            
            params = {
                "embedding": str(query_embedding),
                "min_similarity": min_similarity,
                "limit": limit,
            }
            
            # Execute query
            results = db.execute(text(query), params).fetchall()
            
            # Parse and deduplicate medications
            import json
            seen_meds = set()
            med_results = []
            
            for row in results:
                try:
                    if row[0]:  # medication_names
                        meds = json.loads(row[0])
                        if isinstance(meds, list):
                            for med in meds:
                                med_name = med.get('name', str(med)) if isinstance(med, dict) else str(med)
                                if med_name not in seen_meds:
                                    seen_meds.add(med_name)
                                    med_results.append({
                                        "medication_name": med_name,
                                        "found_in_document": row[2],
                                        "patient": row[3],
                                        "similarity_score": float(row[4]),
                                    })
                except Exception as e:
                    logger.debug(f"Error parsing medications: {str(e)}")
            
            logger.info(f"Found {len(med_results)} medication variations")
            return med_results[:limit]
        
        except Exception as e:
            logger.error(f"Error finding medication synonyms: {str(e)}")
            return []
    
    @staticmethod
    def get_top_similar_for_ai_context(
        db: Session,
        user_id: int,
        limit: int = 5
    ) -> List[Dict]:
        """
        Get top similar documents for a user for AI context.
        Used by AI chat to get relevant context without keyword search.
        
        Args:
            db: Database session
            user_id: User ID
            limit: Number of documents to retrieve
            
        Returns:
            List of user's documents with embeddings
        """
        try:
            # Get user's documents with embeddings
            query = """
                SELECT 
                    d.id,
                    d.file_name,
                    d.extracted_text,
                    d.diagnosis,
                    d.medication_names,
                    d.extracted_text_embedding IS NOT NULL as has_embedding,
                    d.extracted_at
                FROM documents d
                WHERE d.user_id = :user_id
                    AND d.extraction_status = 'completed'
                ORDER BY d.extracted_at DESC
                LIMIT :limit
            """
            
            params = {
                "user_id": user_id,
                "limit": limit,
            }
            
            results = db.execute(text(query), params).fetchall()
            
            docs = []
            for row in results:
                docs.append({
                    "id": row[0],
                    "file_name": row[1],
                    "extracted_text": row[2][:500] if row[2] else None,
                    "diagnosis": row[3],
                    "medications": row[4],
                    "has_embedding": row[5],
                    "extracted_at": row[6].isoformat() if row[6] else None,
                })
            
            logger.info(f"Retrieved {len(docs)} documents for AI context (user {user_id})")
            return docs
        
        except Exception as e:
            logger.error(f"Error getting documents for AI context: {str(e)}")
            return []
