"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const multer_1 = __importDefault(require("multer"));
const pdf_parse_1 = __importDefault(require("pdf-parse"));
const openai_1 = require("../services/openai");
const supabase_1 = require("../services/supabase");
const chunking_1 = require("../services/chunking");
const entities_1 = require("../services/entities");
const router = express_1.default.Router();
// Configure multer for file uploads
const upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: {
        fileSize: 50 * 1024 * 1024, // 50MB limit
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype === "application/pdf") {
            cb(null, true);
        }
        else {
            cb(new Error("Only PDF files are allowed"));
        }
    },
});
/**
 * POST /api/rag/ingest
 * Ingest a PDF document into the RAG system
 */
router.post("/ingest", upload.single("file"), async (req, res) => {
    const startTime = Date.now();
    try {
        if (!req.file) {
            return res.status(400).json({ error: "No file uploaded" });
        }
        const source = req.body.source || req.file.originalname;
        console.log(`[RAG Ingest] Starting ingestion for: ${source}`);
        // Parse PDF
        const pdfData = await (0, pdf_parse_1.default)(req.file.buffer);
        const fullText = (0, chunking_1.cleanText)(pdfData.text);
        console.log(`[RAG Ingest] Extracted ${fullText.length} characters`);
        // Simple page detection (approximate)
        const pagesText = fullText.split(/\f/); // Form feed character
        const chunks = [];
        // Chunk each page
        for (let pageIndex = 0; pageIndex < pagesText.length; pageIndex++) {
            const pageText = pagesText[pageIndex];
            const pageChunks = (0, chunking_1.chunkTextByTokens)(pageText, 600, 75);
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
        const entities = await (0, entities_1.extractEntitiesBatch)(chunks.map((c) => c.text), 5);
        // Generate embeddings and store
        console.log("[RAG Ingest] Generating embeddings and storing...");
        const errors = [];
        for (let i = 0; i < chunks.length; i++) {
            try {
                const chunk = chunks[i];
                const embedding = await openai_1.openaiService.createEmbedding(chunk.text);
                await supabase_1.supabaseService.insertDocument({
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
            }
            catch (error) {
                errors.push(`Chunk ${i}: ${error.message}`);
                console.error(`[RAG Ingest] Error processing chunk ${i}:`, error);
            }
        }
        const timeTaken = Date.now() - startTime;
        const result = {
            success: errors.length === 0,
            chunks_created: chunks.length - errors.length,
            time_taken_ms: timeTaken,
            source,
            errors: errors.length > 0 ? errors : undefined,
        };
        console.log(`[RAG Ingest] Completed in ${timeTaken}ms`);
        res.json(result);
    }
    catch (error) {
        console.error("[RAG Ingest] Error:", error);
        res.status(500).json({
            error: "Failed to ingest document",
            message: error.message,
        });
    }
});
/**
 * POST /api/rag/query
 * Query the RAG system
 */
router.post("/query", async (req, res) => {
    try {
        const { query, top_k = 3 } = req.body;
        if (!query) {
            return res.status(400).json({ error: "Query is required" });
        }
        console.log(`[RAG Query] Query: "${query}", top_k: ${top_k}`);
        // Generate query embedding
        const queryEmbedding = await openai_1.openaiService.createEmbedding(query);
        // Search for similar documents
        const results = await supabase_1.supabaseService.queryDocuments(queryEmbedding, top_k);
        console.log(`[RAG Query] Found ${results.length} results`);
        res.json({
            query,
            top_k,
            results,
        });
    }
    catch (error) {
        console.error("[RAG Query] Error:", error);
        res.status(500).json({
            error: "Failed to query documents",
            message: error.message,
        });
    }
});
exports.default = router;
//# sourceMappingURL=rag.js.map