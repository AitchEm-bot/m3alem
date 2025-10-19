"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const multer_1 = __importDefault(require("multer"));
const uuid_1 = require("uuid");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const router = express_1.default.Router();
// Configure multer for image uploads
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path_1.default.join(__dirname, "../../uploads");
        if (!fs_1.default.existsSync(uploadDir)) {
            fs_1.default.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueName = `${(0, uuid_1.v4)()}${path_1.default.extname(file.originalname)}`;
        cb(null, uniqueName);
    },
});
const upload = (0, multer_1.default)({
    storage,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
    },
    fileFilter: (req, file, cb) => {
        const allowedMimes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
        if (allowedMimes.includes(file.mimetype)) {
            cb(null, true);
        }
        else {
            cb(new Error("Only image files are allowed"));
        }
    },
});
/**
 * POST /api/upload-image
 * Upload an image screenshot
 * TODO: Implement OCR using tesseract.js or OpenAI Vision API
 */
router.post("/upload-image", upload.single("image"), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: "No image uploaded" });
        }
        const imageId = (0, uuid_1.v4)();
        const filename = req.file.filename;
        console.log(`[Image Upload] Uploaded: ${filename}`);
        // TODO: Implement OCR
        // For now, return placeholder OCR text
        // In production, use tesseract.js or OpenAI Vision API:
        // - Tesseract.js: import Tesseract from 'tesseract.js'
        // - OpenAI Vision: use openaiService.client.chat.completions.create with vision model
        const ocrText = ""; // Placeholder - OCR not implemented
        const result = {
            success: true,
            image_id: imageId,
            ocr_text: ocrText,
            filename: req.file.originalname,
        };
        console.log(`[Image Upload] Processed: ${imageId}`);
        res.json(result);
    }
    catch (error) {
        console.error("[Image Upload] Error:", error);
        res.status(500).json({
            error: "Failed to upload image",
            message: error.message,
        });
    }
});
exports.default = router;
//# sourceMappingURL=upload.js.map