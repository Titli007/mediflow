"""
Embedding Service for generating vector embeddings using Cohere API.
Converts medical text into semantic vectors for similarity search.
Free tier: 100,000 API calls per month
"""

import logging
import os
from typing import Optional, List, Dict
import asyncio
from concurrent.futures import ThreadPoolExecutor

logger = logging.getLogger(__name__)


class EmbeddingService:
    """
    Service for generating embeddings using Cohere API.
    Uses embed-english-v3.0 model optimized for medical documents.
    """
    
    # Cohere API configuration
    MODEL = "embed-english-v3.0"
    DIMENSION = 1024
    MAX_CHARS_PER_REQUEST = 8000
    
    def __init__(self):
        """Initialize the embedding service with Cohere API key."""
        self.api_key = os.getenv("COHERE_API_KEY")
        self.available = False
        
        if not self.api_key:
            logger.warning(
                "COHERE_API_KEY not set. Embedding service will not work. "
                "Get free key from: https://cohere.ai"
            )
            return
        
        # Import here to handle case where cohere is not installed
        try:
            import cohere
            self.client = cohere.ClientV2(api_key=self.api_key)
            self.available = True
            logger.info("Cohere embedding service initialized (FREE: 100K calls/month)")
        except ImportError:
            logger.error("cohere package not installed. Run: pip install cohere")
        except Exception as e:
            logger.error(f"Failed to initialize Cohere client: {str(e)}")
    
    def is_available(self) -> bool:
        """Check if embedding service is available."""
        return self.available
    
    def truncate_text(self, text: str, max_length: int = 8000) -> str:
        """
        Truncate text to reasonable length to avoid token limits.
        
        Args:
            text: Text to truncate
            max_length: Maximum number of characters
            
        Returns:
            Truncated text
        """
        if not text:
            return ""
        
        if len(text) > max_length:
            logger.debug(f"Truncating text from {len(text)} to {max_length} chars")
            return text[:max_length]
        
        return text
    
    def embed_text(self, text: str) -> Optional[List[float]]:
        """
        Generate embedding for a single text using Cohere API.
        
        Args:
            text: Text to embed
            
        Returns:
            Embedding vector (384 dimensions) or None if failed
        """
        if not self.is_available():
            logger.warning("Embedding service not available. Returning None.")
            return None
        
        if not text or not text.strip():
            logger.debug("Empty text provided for embedding")
            return None
        
        try:
            # Truncate text to avoid character limits
            text = self.truncate_text(text.strip())
            
            # Call Cohere API
            response = self.client.embed(
                model=self.MODEL,
                texts=[text],
                input_type="search_document"
            )
            
            # Extract embedding from response
            if response.embeddings and response.embeddings.float_ and len(response.embeddings.float_) > 0:
                embedding = response.embeddings.float_[0]
                
                if len(embedding) != self.DIMENSION:
                    logger.warning(
                        f"Unexpected embedding dimension: {len(embedding)} "
                        f"(expected {self.DIMENSION})"
                    )
                
                logger.debug(f"Successfully embedded text ({len(text)} chars)")
                return embedding
            else:
                logger.error("No embeddings returned from Cohere")
                raise Exception("No embeddings returned from Cohere")
        
        except Exception as e:
            logger.error(f"Failed to generate embedding: {str(e)}")
            raise e
    
    def embed_batch(self, texts: List[str]) -> List[Optional[List[float]]]:
        """
        Generate embeddings for multiple texts.
        
        Args:
            texts: List of texts to embed
            
        Returns:
            List of embedding vectors (same order as input)
        """
        if not self.is_available():
            logger.warning("Embedding service not available. Returning None values.")
            return [None] * len(texts)
        
        if not texts:
            return []
        
        try:
            # Truncate all texts
            texts = [self.truncate_text(text.strip()) for text in texts]
            # Filter out empty texts but keep track of original indices
            indexed_texts = [(i, text) for i, text in enumerate(texts) if text]
            
            if not indexed_texts:
                logger.warning("All texts are empty")
                return [None] * len(texts)
            
            # Call Cohere API with batch
            response = self.client.embed(
                model=self.MODEL,
                texts=[text for _, text in indexed_texts],
                input_type="search_document"
            )
            
            # Reconstruct results in original order
            results = [None] * len(texts)
            for i, embedding in enumerate(response.embeddings.float_):
                original_idx = indexed_texts[i][0]
                results[original_idx] = embedding
            
            logger.debug(f"Successfully embedded {len(indexed_texts)} texts in batch")
            return results
        
        except Exception as e:
            logger.error(f"Failed to generate batch embeddings: {str(e)}")
            raise e
    
    async def embed_text_async(self, text: str) -> Optional[List[float]]:
        """
        Asynchronously generate embedding for a single text.
        Runs in thread pool to avoid blocking.
        
        Args:
            text: Text to embed
            
        Returns:
            Embedding vector or None if failed
        """
        loop = asyncio.get_event_loop()
        with ThreadPoolExecutor() as pool:
            return await loop.run_in_executor(pool, self.embed_text, text)
    
    async def embed_batch_async(self, texts: List[str]) -> List[Optional[List[float]]]:
        """
        Asynchronously generate embeddings for multiple texts.
        Runs in thread pool to avoid blocking.
        
        Args:
            texts: List of texts to embed
            
        Returns:
            List of embeddings or None values if failed
        """
        loop = asyncio.get_event_loop()
        with ThreadPoolExecutor() as pool:
            return await loop.run_in_executor(pool, self.embed_batch, texts)


class MedicalEmbeddingProcessor:
    """
    Specialized processor for medical document embeddings.
    Handles extraction of relevant text components and generates focused embeddings.
    """
    
    def __init__(self):
        """Initialize the processor with embedding service."""
        self.service = EmbeddingService()
    
    def get_text_for_embedding(self, extracted_text: str) -> str:
        """
        Extract and clean text for embedding.
        
        Args:
            extracted_text: Raw extracted text from OCR
            
        Returns:
            Cleaned text suitable for embedding
        """
        if not extracted_text:
            return ""
        
        # Remove excessive whitespace
        lines = [line.strip() for line in extracted_text.split('\n')]
        lines = [line for line in lines if line and len(line) > 5]
        
        # Join back together
        text = '\n'.join(lines)
        
        # Limit to reasonable size
        return text[:8000]
    
    def get_diagnosis_for_embedding(self, diagnosis: str, findings: str) -> str:
        """
        Combine diagnosis and findings for embedding.
        
        Args:
            diagnosis: Diagnosis text
            findings: Medical findings text
            
        Returns:
            Combined text for embedding
        """
        parts = []
        
        if diagnosis:
            parts.append(f"Diagnosis: {diagnosis}")
        
        if findings:
            parts.append(f"Findings: {findings}")
        
        return " ".join(parts)
    
    def get_medications_for_embedding(self, medication_text: str, dosage_text: str) -> str:
        """
        Combine medication information for embedding.
        
        Args:
            medication_text: Medication names (usually JSON array string)
            dosage_text: Dosage instructions (usually JSON string)
            
        Returns:
            Combined text for embedding
        """
        import json
        parts = []
        
        # Parse medications
        try:
            if medication_text:
                if isinstance(medication_text, str):
                    meds = json.loads(medication_text)
                    if isinstance(meds, list):
                        med_names = []
                        for med in meds:
                            if isinstance(med, dict) and 'name' in med:
                                med_names.append(med['name'])
                            elif isinstance(med, str):
                                med_names.append(med)
                        if med_names:
                            parts.append(f"Medications: {', '.join(med_names)}")
                else:
                    parts.append(f"Medications: {medication_text}")
        except (json.JSONDecodeError, Exception) as e:
            logger.debug(f"Could not parse medications: {str(e)}")
            if medication_text:
                parts.append(f"Medications: {medication_text[:500]}")
        
        # Parse dosages
        try:
            if dosage_text:
                if isinstance(dosage_text, str):
                    dosages = json.loads(dosage_text)
                    if isinstance(dosages, dict):
                        dosage_strs = [f"{k}: {v}" for k, v in dosages.items()]
                        if dosage_strs:
                            parts.append(f"Dosage: {'; '.join(dosage_strs[:5])}")
                else:
                    parts.append(f"Dosage: {dosage_text}")
        except (json.JSONDecodeError, Exception) as e:
            logger.debug(f"Could not parse dosages: {str(e)}")
            if dosage_text:
                parts.append(f"Dosage: {dosage_text[:500]}")
        
        return " ".join(parts)
    
    def process_document_embeddings(
        self,
        extracted_text: str,
        diagnosis: str = None,
        findings: str = None,
        medications: str = None,
        dosages: str = None
    ) -> Dict[str, Optional[List[float]]]:
        """
        Generate all embeddings for a document.
        
        Args:
            extracted_text: Full extracted text
            diagnosis: Diagnosis text
            findings: Medical findings
            medications: Medication information (JSON)
            dosages: Dosage information (JSON)
            
        Returns:
            Dictionary with three embeddings: text, diagnosis, medications
        """
        result = {
            "extracted_text_embedding": None,
            "diagnosis_embedding": None,
            "medication_embedding": None,
        }
        
        if not self.service.is_available():
            logger.error("Embedding service not available")
            raise Exception("Cohere embedding service is not available (API key missing or client initialization failed)")
        
        try:
            # Generate text embedding
            if extracted_text:
                text_for_embed = self.get_text_for_embedding(extracted_text)
                if text_for_embed:
                    result["extracted_text_embedding"] = self.service.embed_text(text_for_embed)
            
            # Generate diagnosis embedding
            diagnosis_text = self.get_diagnosis_for_embedding(diagnosis, findings)
            if diagnosis_text:
                result["diagnosis_embedding"] = self.service.embed_text(diagnosis_text)
            
            # Generate medication embedding
            med_text = self.get_medications_for_embedding(medications, dosages)
            if med_text:
                result["medication_embedding"] = self.service.embed_text(med_text)
            
            logger.info("Successfully generated all embeddings")
            return result
        
        except Exception as e:
            logger.error(f"Error processing embeddings: {str(e)}")
            raise e


# Global instance
_embedding_processor = None


def get_embedding_processor() -> MedicalEmbeddingProcessor:
    """Get or create global embedding processor instance."""
    global _embedding_processor
    if _embedding_processor is None:
        _embedding_processor = MedicalEmbeddingProcessor()
    return _embedding_processor
