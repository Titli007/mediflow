-- Migration: Install pgvector extension
-- Purpose: Enable vector similarity search on PostgreSQL
-- Idempotent: Yes - uses CREATE EXTENSION IF NOT EXISTS
-- Created: 2024
-- Description: Installs the pgvector extension which provides the VECTOR type
-- and operations for similarity search on embeddings.

CREATE EXTENSION IF NOT EXISTS vector;

-- Grant usage to public (allows all database users to use the extension)
ALTER DEFAULT PRIVILEGES GRANT USAGE ON SCHEMA public TO public;
