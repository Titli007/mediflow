-- Migration: Add vector columns to documents table
-- Purpose: Add vector embeddings for semantic search
-- Idempotent: Yes - uses conditional checks before adding columns
-- Created: 2024
-- Description: Adds three vector columns to store embeddings for:
--   - extracted_text_embedding: Embedding of the full extracted text
--   - diagnosis_embedding: Embedding of diagnosis information
--   - medication_embedding: Embedding of medication information

-- Add extracted_text_embedding column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'documents' AND column_name = 'extracted_text_embedding'
  ) THEN
    ALTER TABLE documents 
    ADD COLUMN extracted_text_embedding vector(1536);
    
    -- Create index for efficient similarity search
    CREATE INDEX idx_extracted_text_embedding 
    ON documents USING ivfflat (extracted_text_embedding vector_cosine_ops)
    WITH (lists = 100);
  END IF;
END $$;

-- Add diagnosis_embedding column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'documents' AND column_name = 'diagnosis_embedding'
  ) THEN
    ALTER TABLE documents 
    ADD COLUMN diagnosis_embedding vector(1536);
    
    -- Create index for efficient similarity search
    CREATE INDEX idx_diagnosis_embedding 
    ON documents USING ivfflat (diagnosis_embedding vector_cosine_ops)
    WITH (lists = 100);
  END IF;
END $$;

-- Add medication_embedding column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'documents' AND column_name = 'medication_embedding'
  ) THEN
    ALTER TABLE documents 
    ADD COLUMN medication_embedding vector(1536);
    
    -- Create index for efficient similarity search
    CREATE INDEX idx_medication_embedding 
    ON documents USING ivfflat (medication_embedding vector_cosine_ops)
    WITH (lists = 100);
  END IF;
END $$;
