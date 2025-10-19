import OpenAI from "openai";
/**
 * OpenAI service for embeddings and completions
 * NOTE: OpenAI Realtime API is handled separately via WebSocket in websocket/handler.ts
 */
declare class OpenAIService {
    private client;
    constructor();
    /**
     * Generate embeddings for text
     */
    createEmbedding(text: string): Promise<number[]>;
    /**
     * Extract entities from text using LLM
     */
    extractEntities(text: string): Promise<string[]>;
    /**
     * Create a streaming completion (used for RAG-enhanced responses)
     */
    createStreamingCompletion(messages: OpenAI.Chat.ChatCompletionMessageParam[], onChunk: (chunk: string) => void): Promise<void>;
    /**
     * Transcribe audio using Whisper API
     * @param audioBase64 - Base64 encoded audio (WebM format)
     * @returns Transcribed text
     */
    transcribeAudio(audioBase64: string): Promise<string>;
    /**
     * Get client instance for direct access
     */
    getClient(): OpenAI;
}
export declare const openaiService: OpenAIService;
export {};
//# sourceMappingURL=openai.d.ts.map