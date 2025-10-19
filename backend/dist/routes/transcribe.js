"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const openai_1 = require("../services/openai");
const router = express_1.default.Router();
/**
 * POST /api/transcribe
 * Transcribe audio using OpenAI Whisper API
 *
 * Request body:
 * {
 *   audio: string (base64 encoded PCM16 audio)
 * }
 *
 * Response:
 * {
 *   text: string (transcribed text)
 * }
 */
router.post("/", async (req, res) => {
    try {
        const { audio } = req.body;
        if (!audio || typeof audio !== "string") {
            return res.status(400).json({
                error: "Missing or invalid audio data",
            });
        }
        console.log("[Transcribe] Received audio for transcription, length:", audio.length);
        // Call OpenAI Whisper API
        const text = await openai_1.openaiService.transcribeAudio(audio);
        console.log("[Transcribe] Transcription successful:", text.substring(0, 50) + "...");
        res.json({ text });
    }
    catch (error) {
        console.error("[Transcribe] Error:", error);
        res.status(500).json({
            error: "Transcription failed",
            message: error.message,
        });
    }
});
exports.default = router;
//# sourceMappingURL=transcribe.js.map