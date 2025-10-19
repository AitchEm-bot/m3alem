import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import WebSocket from "ws";
import { createServer } from "http";
import ragRoutes from "./routes/rag";
import uploadRoutes from "./routes/upload";
import conversationsRoutes from "./routes/conversations";
import transcribeRoutes from "./routes/transcribe";
import { handleWebSocketConnection } from "./websocket/handler";

// Load environment variables
dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

// Middleware
// Allow multiple origins for development and production (Vercel preview + production URLs)
const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map(origin => origin.trim())
  : ["*"];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, Postman, curl)
    if (!origin) return callback(null, true);

    // Allow all origins in development
    if (allowedOrigins.includes("*")) {
      return callback(null, true);
    }

    // Check if origin is allowed
    if (allowedOrigins.some(allowed => {
      // Exact match
      if (allowed === origin) return true;
      // Wildcard subdomain match (e.g., *.vercel.app)
      if (allowed.startsWith('*.')) {
        const domain = allowed.slice(2);
        return origin.endsWith(domain);
      }
      return false;
    })) {
      return callback(null, true);
    }

    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));
// Increase payload limit for audio transcription (default is 100kb, we need more for audio files)
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get("/", (req, res) => {
  res.json({
    status: "ok",
    service: "M3alem Backend",
    version: "0.1.0",
    timestamp: new Date().toISOString(),
  });
});

// Routes
app.use("/api/rag", ragRoutes);
app.use("/api", uploadRoutes);
app.use("/api/conversations", conversationsRoutes);
app.use("/api/transcribe", transcribeRoutes);

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error("Error:", err);
  res.status(err.status || 500).json({
    error: err.message || "Internal server error",
    code: err.status || 500,
  });
});

// Create HTTP server
const server = createServer(app);

// Create WebSocket server
const wss = new WebSocket.Server({ server, path: "/ws" });

wss.on("connection", (ws, req) => {
  handleWebSocketConnection(ws, req);
});

// Start server
server.listen(port, () => {
  console.log(`
╔═══════════════════════════════════════════════════════╗
║                                                       ║
║   M3alem Backend Server                               ║
║   Version: 0.1.0                                      ║
║                                                       ║
║   Server running on: http://localhost:${port}         ║
║   WebSocket endpoint: ws://localhost:${port}/ws       ║
║                                                       ║
║   Environment: ${process.env.NODE_ENV || "development"}                              ║
║                                                       ║
╚═══════════════════════════════════════════════════════╝
  `);

  // Verify environment variables
  const requiredEnvVars = ["OPENAI_API_KEY", "SUPABASE_URL", "SUPABASE_SERVICE_KEY"];
  const missingVars = requiredEnvVars.filter((varName) => !process.env[varName]);

  if (missingVars.length > 0) {
    console.warn(`\n⚠️  WARNING: Missing environment variables: ${missingVars.join(", ")}`);
    console.warn("   Please configure these in your .env file\n");
  }
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM signal received: closing HTTP server");
  server.close(() => {
    console.log("HTTP server closed");
  });
});
