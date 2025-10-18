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
export function chunkTextByTokens(
  text: string,
  chunkSize: number = 600, // ~600 tokens
  overlapSize: number = 75 // ~75 tokens
): TextChunk[] {
  const charChunkSize = chunkSize * 4;
  const charOverlapSize = overlapSize * 4;

  const chunks: TextChunk[] = [];
  let startIndex = 0;

  while (startIndex < text.length) {
    let endIndex = Math.min(startIndex + charChunkSize, text.length);

    // Try to break at sentence boundaries
    if (endIndex < text.length) {
      const periodIndex = text.lastIndexOf(".", endIndex);
      const questionIndex = text.lastIndexOf("?", endIndex);
      const exclamIndex = text.lastIndexOf("!", endIndex);

      const bestBreak = Math.max(periodIndex, questionIndex, exclamIndex);
      if (bestBreak > startIndex + charChunkSize / 2) {
        endIndex = bestBreak + 1;
      }
    }

    const chunkText = text.slice(startIndex, endIndex).trim();

    if (chunkText.length > 0) {
      chunks.push({
        text: chunkText,
        startIndex,
        endIndex,
      });
    }

    // Move start index with overlap
    startIndex = endIndex - charOverlapSize;
  }

  return chunks;
}

/**
 * Chunk text by paragraphs
 */
export function chunkTextByParagraphs(
  text: string,
  maxChunkSize: number = 2400 // ~600 tokens
): TextChunk[] {
  const paragraphs = text.split(/\n\n+/);
  const chunks: TextChunk[] = [];
  let currentChunk = "";
  let startIndex = 0;

  for (const paragraph of paragraphs) {
    const trimmedParagraph = paragraph.trim();

    if (!trimmedParagraph) continue;

    if (
      currentChunk.length + trimmedParagraph.length + 2 >
      maxChunkSize
    ) {
      // Save current chunk and start new one
      if (currentChunk) {
        chunks.push({
          text: currentChunk.trim(),
          startIndex,
          endIndex: startIndex + currentChunk.length,
        });

        startIndex += currentChunk.length;
        currentChunk = "";
      }
    }

    currentChunk += (currentChunk ? "\n\n" : "") + trimmedParagraph;
  }

  // Add final chunk
  if (currentChunk) {
    chunks.push({
      text: currentChunk.trim(),
      startIndex,
      endIndex: startIndex + currentChunk.length,
    });
  }

  return chunks;
}

/**
 * Clean and normalize text
 */
export function cleanText(text: string): string {
  return text
    .replace(/\s+/g, " ") // Normalize whitespace
    .replace(/\n{3,}/g, "\n\n") // Limit consecutive newlines
    .trim();
}
