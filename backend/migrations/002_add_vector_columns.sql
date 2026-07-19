-- Migration: Add vector columns to documents table
-- Purpose: Add vector embeddings for semantic search
-- Idempotent: Yes

-- Add extracted_text_embedding column if it doesn't exist
ALTER TABLE documents ADD COLUMN IF NOT EXISTS extracted_text_embedding vector(1024);

-- Create index for efficient similarity search
CREATE INDEX IF NOT EXISTS idx_extracted_text_embedding 
ON documents USING ivfflat (extracted_text_embedding vector_cosine_ops)
WITH (lists = 100);

-- Add diagnosis_embedding column if it doesn't exist
ALTER TABLE documents ADD COLUMN IF NOT EXISTS diagnosis_embedding vector(1024);

-- Create index for efficient similarity search
CREATE INDEX IF NOT EXISTS idx_diagnosis_embedding 
ON documents USING ivfflat (diagnosis_embedding vector_cosine_ops)
WITH (lists = 100);

-- Add medication_embedding column if it doesn't exist
ALTER TABLE documents ADD COLUMN IF NOT EXISTS medication_embedding vector(1024);

-- Create index for efficient similarity search
CREATE INDEX IF NOT EXISTS idx_medication_embedding 
ON documents USING ivfflat (medication_embedding vector_cosine_ops)
WITH (lists = 100);
