import { openaiService } from "./openai";

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
export async function extractEntities(text: string): Promise<string[]> {
  try {
    // Limit text length for API efficiency
    const truncatedText = text.substring(0, 1000);
    return await openaiService.extractEntities(truncatedText);
  } catch (error) {
    console.error("Entity extraction failed:", error);
    return [];
  }
}

/**
 * Extract entities from multiple chunks in batch
 */
export async function extractEntitiesBatch(
  chunks: string[],
  batchSize: number = 5
): Promise<string[][]> {
  const results: string[][] = [];

  for (let i = 0; i < chunks.length; i += batchSize) {
    const batch = chunks.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map((chunk) => extractEntities(chunk))
    );
    results.push(...batchResults);

    // Small delay to avoid rate limits
    if (i + batchSize < chunks.length) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  return results;
}
