"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractEntities = extractEntities;
exports.extractEntitiesBatch = extractEntitiesBatch;
const openai_1 = require("./openai");
/**
 * Extract entities from a text chunk
 */
async function extractEntities(text) {
    try {
        // Limit text length for API efficiency
        const truncatedText = text.substring(0, 1000);
        return await openai_1.openaiService.extractEntities(truncatedText);
    }
    catch (error) {
        console.error("Entity extraction failed:", error);
        return [];
    }
}
/**
 * Extract entities from multiple chunks in batch
 */
async function extractEntitiesBatch(chunks, batchSize = 5) {
    const results = [];
    for (let i = 0; i < chunks.length; i += batchSize) {
        const batch = chunks.slice(i, i + batchSize);
        const batchResults = await Promise.all(batch.map((chunk) => extractEntities(chunk)));
        results.push(...batchResults);
        // Small delay to avoid rate limits
        if (i + batchSize < chunks.length) {
            await new Promise((resolve) => setTimeout(resolve, 100));
        }
    }
    return results;
}
//# sourceMappingURL=entities.js.map