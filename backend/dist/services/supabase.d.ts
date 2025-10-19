import { SupabaseClient } from "@supabase/supabase-js";
import { RAGDocument, RAGQueryResult } from "../types";
/**
 * Supabase client for vector storage and retrieval
 */
declare class SupabaseService {
    private client;
    constructor();
    /**
     * Insert a document chunk with embeddings
     */
    insertDocument(doc: Omit<RAGDocument, "id" | "inserted_at">): Promise<string>;
    /**
     * Query documents using vector similarity search
     */
    queryDocuments(queryEmbedding: number[], topK?: number): Promise<RAGQueryResult[]>;
    /**
     * Get client instance for direct access
     */
    getClient(): SupabaseClient;
}
export declare const supabaseService: SupabaseService;
export {};
//# sourceMappingURL=supabase.d.ts.map