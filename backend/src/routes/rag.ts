import express, { Request, Response } from "express";
import multer from "multer";
import pdfParse from "pdf-parse";
import { openaiService } from "../services/openai";
import { supabaseService } from "../services/supabase";
import { chunkTextByTokens, cleanText } from "../services/chunking";
import { extractEntitiesBatch } from "../services/entities";
import { IngestResult } from "../types";

const router = express.Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(new Error("Only PDF files are allowed"));
    }
  },
});

/**
 * POST /api/rag/ingest
 * Ingest a PDF document into the RAG system
 */
router.post(
  "/ingest",
  upload.single("file"),
  async (req: Request, res: Response) => {
    const startTime = Date.now();

    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const source = req.body.source || req.file.originalname;
      console.log(`[RAG Ingest] Starting ingestion for: ${source}`);

      // Parse PDF
      const pdfData = await pdfParse(req.file.buffer);
      const fullText = cleanText(pdfData.text);

      console.log(`[RAG Ingest] Extracted ${fullText.length} characters`);

      // Simple page detection (approximate)
      const pagesText = fullText.split(/\f/); // Form feed character
      const chunks: { text: string; pageNumber: number }[] = [];

      // Chunk each page
      for (let pageIndex = 0; pageIndex < pagesText.length; pageIndex++) {
        const pageText = pagesText[pageIndex];
        const pageChunks = chunkTextByTokens(pageText, 600, 75);

        for (const chunk of pageChunks) {
          chunks.push({
            text: chunk.text,
            pageNumber: pageIndex + 1,
          });
        }
      }

      console.log(`[RAG Ingest] Created ${chunks.length} chunks`);

      // Extract entities for all chunks
      console.log("[RAG Ingest] Extracting entities...");
      const entities = await extractEntitiesBatch(
        chunks.map((c) => c.text),
        5
      );

      // Generate embeddings and store
      console.log("[RAG Ingest] Generating embeddings and storing...");
      const errors: string[] = [];

      for (let i = 0; i < chunks.length; i++) {
        try {
          const chunk = chunks[i];
          const embedding = await openaiService.createEmbedding(chunk.text);

          await supabaseService.insertDocument({
            source,
            page_number: chunk.pageNumber,
            chunk_text: chunk.text,
            embedding,
            entity_tags: entities[i] || [],
          });

          // Log progress every 10 chunks
          if ((i + 1) % 10 === 0) {
            console.log(`[RAG Ingest] Processed ${i + 1}/${chunks.length} chunks`);
          }
        } catch (error: any) {
          errors.push(`Chunk ${i}: ${error.message}`);
          console.error(`[RAG Ingest] Error processing chunk ${i}:`, error);
        }
      }

      const timeTaken = Date.now() - startTime;

      const result: IngestResult = {
        success: errors.length === 0,
        chunks_created: chunks.length - errors.length,
        time_taken_ms: timeTaken,
        source,
        errors: errors.length > 0 ? errors : undefined,
      };

      console.log(`[RAG Ingest] Completed in ${timeTaken}ms`);

      res.json(result);
    } catch (error: any) {
      console.error("[RAG Ingest] Error:", error);
      res.status(500).json({
        error: "Failed to ingest document",
        message: error.message,
      });
    }
  }
);

/**
 * POST /api/rag/query
 * Query the RAG system
 */
router.post("/query", async (req: Request, res: Response) => {
  try {
    const { query, top_k = 3 } = req.body;

    if (!query) {
      return res.status(400).json({ error: "Query is required" });
    }

    console.log(`[RAG Query] Query: "${query}", top_k: ${top_k}`);

    // Generate query embedding
    const queryEmbedding = await openaiService.createEmbedding(query);

    // Search for similar documents
    const results = await supabaseService.queryDocuments(queryEmbedding, top_k);

    console.log(`[RAG Query] Found ${results.length} results`);

    res.json({
      query,
      top_k,
      results,
    });
  } catch (error: any) {
    console.error("[RAG Query] Error:", error);
    res.status(500).json({
      error: "Failed to query documents",
      message: error.message,
    });
  }
});

export default router;
