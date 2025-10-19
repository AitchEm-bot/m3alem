/**
 * Text chunking utilities for RAG
 * Chunks text into segments for embedding and storage
 */
export interface TextChunk {
    text: string;
    startIndex: number;
    endIndex: number;
}
/**
 * Chunk text by token count with overlap
 * Simple approximation: ~4 characters per token
 */
export declare function chunkTextByTokens(text: string, chunkSize?: number, // ~600 tokens
overlapSize?: number): TextChunk[];
/**
 * Chunk text by paragraphs
 */
export declare function chunkTextByParagraphs(text: string, maxChunkSize?: number): TextChunk[];
/**
 * Clean and normalize text
 */
export declare function cleanText(text: string): string;
//# sourceMappingURL=chunking.d.ts.map