import express, { Request, Response } from "express";
import multer from "multer";
import { v4 as uuidv4 } from "uuid";
import { ImageUploadResult } from "../types";
import fs from "fs";
import path from "path";

const router = express.Router();

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, "../../uploads");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"));
    }
  },
});

/**
 * POST /api/upload-image
 * Upload an image screenshot
 * TODO: Implement OCR using tesseract.js or OpenAI Vision API
 */
router.post(
  "/upload-image",
  upload.single("image"),
  async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No image uploaded" });
      }

      const imageId = uuidv4();
      const filename = req.file.filename;

      console.log(`[Image Upload] Uploaded: ${filename}`);

      // TODO: Implement OCR
      // For now, return placeholder OCR text
      // In production, use tesseract.js or OpenAI Vision API:
      // - Tesseract.js: import Tesseract from 'tesseract.js'
      // - OpenAI Vision: use openaiService.client.chat.completions.create with vision model

      const ocrText = ""; // Placeholder - OCR not implemented

      const result: ImageUploadResult = {
        success: true,
        image_id: imageId,
        ocr_text: ocrText,
        filename: req.file.originalname,
      };

      console.log(`[Image Upload] Processed: ${imageId}`);

      res.json(result);
    } catch (error: any) {
      console.error("[Image Upload] Error:", error);
      res.status(500).json({
        error: "Failed to upload image",
        message: error.message,
      });
    }
  }
);

export default router;
