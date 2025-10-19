import express, { Request, Response } from "express";
import { openaiService } from "../services/openai";

const router = express.Router();

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
router.post("/", async (req: Request, res: Response) => {
  try {
    const { audio } = req.body;

    if (!audio || typeof audio !== "string") {
      return res.status(400).json({
        error: "Missing or invalid audio data",
      });
    }

    console.log("[Transcribe] Received audio for transcription, length:", audio.length);

    // Call OpenAI Whisper API
    const text = await openaiService.transcribeAudio(audio);

    console.log("[Transcribe] Transcription successful:", text.substring(0, 50) + "...");

    res.json({ text });
  } catch (error: any) {
    console.error("[Transcribe] Error:", error);
    res.status(500).json({
      error: "Transcription failed",
      message: error.message,
    });
  }
});

export default router;
