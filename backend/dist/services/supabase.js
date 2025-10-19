"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.supabaseService = void 0;
const supabase_js_1 = require("@supabase/supabase-js");
/**
 * Supabase client for vector storage and retrieval
 */
class SupabaseService {
    constructor() {
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
        if (!supabaseUrl || !supabaseKey) {
            throw new Error("Supabase credentials not configured");
        }
        this.client = (0, supabase_js_1.createClient)(supabaseUrl, supabaseKey);
    }
    /**
     * Insert a document chunk with embeddings
     */
    async insertDocument(doc) {
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
    async queryDocuments(queryEmbedding, topK = 3) {
        // Call Supabase RPC function for vector similarity
        const { data, error } = await this.client.rpc("match_documents", {
            query_embedding: queryEmbedding,
            match_count: topK,
        });
        if (error) {
            throw new Error(`Failed to query documents: ${error.message}`);
        }
        return (data || []).map((row) => ({
            source: row.source,
            page_number: row.page_number,
            snippet: row.chunk_text.substring(0, 200), // Truncate to snippet
            score: row.similarity,
        }));
    }
    /**
     * Get client instance for direct access
     */
    getClient() {
        return this.client;
    }
}
exports.supabaseService = new SupabaseService();
//# sourceMappingURL=supabase.js.map