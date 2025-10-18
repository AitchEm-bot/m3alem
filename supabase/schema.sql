-- M3alem RAG Documents Table with Vector Search
-- This schema uses pgvector extension for vector similarity search

-- Enable the pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create the rag_documents table
CREATE TABLE IF NOT EXISTS rag_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT NOT NULL,
  page_number INTEGER NOT NULL,
  chunk_text TEXT NOT NULL,
  embedding vector(1536), -- OpenAI text-embedding-3-small uses 1536 dimensions
  entity_tags TEXT[] DEFAULT '{}',
  inserted_at TIMESTAMPTZ DEFAULT now()
);

-- Create an index on the embedding column for faster similarity search
CREATE INDEX IF NOT EXISTS rag_documents_embedding_idx
  ON rag_documents
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- Create an index on source for filtering
CREATE INDEX IF NOT EXISTS rag_documents_source_idx
  ON rag_documents (source);

-- Create an index on page_number for filtering
CREATE INDEX IF NOT EXISTS rag_documents_page_idx
  ON rag_documents (page_number);

-- Create a function for vector similarity search
CREATE OR REPLACE FUNCTION match_documents(
  query_embedding vector(1536),
  match_count INT DEFAULT 3,
  filter_source TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  source TEXT,
  page_number INTEGER,
  chunk_text TEXT,
  entity_tags TEXT[],
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    rag_documents.id,
    rag_documents.source,
    rag_documents.page_number,
    rag_documents.chunk_text,
    rag_documents.entity_tags,
    1 - (rag_documents.embedding <=> query_embedding) AS similarity
  FROM rag_documents
  WHERE
    CASE
      WHEN filter_source IS NOT NULL THEN rag_documents.source = filter_source
      ELSE TRUE
    END
  ORDER BY rag_documents.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Grant permissions (adjust based on your Supabase setup)
-- For service role:
-- GRANT ALL ON rag_documents TO service_role;
-- GRANT EXECUTE ON FUNCTION match_documents TO service_role;

-- For anon/authenticated roles (read-only):
-- GRANT SELECT ON rag_documents TO anon, authenticated;
-- GRANT EXECUTE ON FUNCTION match_documents TO anon, authenticated;

-- Example queries:

-- Insert a document
-- INSERT INTO rag_documents (source, page_number, chunk_text, embedding, entity_tags)
-- VALUES (
--   'IB Physics Textbook',
--   42,
--   'Newton''s second law states that force equals mass times acceleration.',
--   '[...]', -- Your embedding vector here
--   ARRAY['Newton', 'force', 'acceleration', 'mass']
-- );

-- Search for similar documents
-- SELECT * FROM match_documents(
--   '[...]'::vector, -- Your query embedding here
--   3 -- Number of results
-- );

-- Get document statistics
-- SELECT
--   source,
--   COUNT(*) as chunk_count,
--   MIN(page_number) as first_page,
--   MAX(page_number) as last_page
-- FROM rag_documents
-- GROUP BY source
-- ORDER BY source;

-- ============================================
-- Conversation History Tables
-- ============================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Conversations table
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_id TEXT -- Nullable for MVP (no auth yet)
);

-- Messages table
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  sources JSONB, -- RAG sources in JSON format
  image_data TEXT, -- Base64 encoded image data
  image_filename TEXT, -- Original filename of uploaded image
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_conversations_created_at ON conversations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);

-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at on conversations
DROP TRIGGER IF EXISTS update_conversations_updated_at ON conversations;
CREATE TRIGGER update_conversations_updated_at
  BEFORE UPDATE ON conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to generate conversation title from first message
CREATE OR REPLACE FUNCTION generate_conversation_title(first_message TEXT)
RETURNS TEXT AS $$
BEGIN
  -- Truncate to 50 characters and add ellipsis if needed
  IF LENGTH(first_message) > 50 THEN
    RETURN SUBSTRING(first_message FROM 1 FOR 50) || '...';
  ELSE
    RETURN first_message;
  END IF;
END;
$$ LANGUAGE plpgsql;
