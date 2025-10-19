/**
 * Entity extraction service
 * Extracts key concepts, topics, and entities from text chunks
 */
export interface EntityExtractionResult {
    entities: string[];
    concepts: string[];
}
/**
 * Extract entities from a text chunk
 */
export declare function extractEntities(text: string): Promise<string[]>;
/**
 * Extract entities from multiple chunks in batch
 */
export declare function extractEntitiesBatch(chunks: string[], batchSize?: number): Promise<string[][]>;
//# sourceMappingURL=entities.d.ts.map