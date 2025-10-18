import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { RAGDocument, RAGQueryResult } from "../types";

/**
 * Supabase client for vector storage and retrieval
 */
class SupabaseService {
  private client: SupabaseClient;

  constructor() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Supabase credentials not configured");
    }

    this.client = createClient(supabaseUrl, supabaseKey);
  }

  /**
   * Insert a document chunk with embeddings
   */
  async insertDocument(doc: Omit<RAGDocument, "id" | "inserted_at">): Promise<string> {
    const { data, error } = await this.client
      .from("rag_documents")
      .insert({
        source: doc.source,
        page_number: doc.page_number,
        chunk_text: doc.chunk_text,
        embedding: doc.embedding,
        entity_tags: doc.entity_tags,
      })
      .select("id")
      .single();

    if (error) {
      throw new Error(`Failed to insert document: ${error.message}`);
    }

    return data.id;
  }

  /**
   * Query documents using vector similarity search
   */
  async queryDocuments(
    queryEmbedding: number[],
    topK: number = 3
  ): Promise<RAGQueryResult[]> {
    // Call Supabase RPC function for vector similarity
    const { data, error } = await this.client.rpc("match_documents", {
      query_embedding: queryEmbedding,
      match_count: topK,
    });

    if (error) {
      throw new Error(`Failed to query documents: ${error.message}`);
    }

    return (data || []).map((row: any) => ({
      source: row.source,
      page_number: row.page_number,
      snippet: row.chunk_text.substring(0, 200), // Truncate to snippet
      score: row.similarity,
    }));
  }

  /**
   * Get client instance for direct access
   */
  getClient(): SupabaseClient {
    return this.client;
  }
}

export const supabaseService = new SupabaseService();
