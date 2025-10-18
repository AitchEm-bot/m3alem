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
