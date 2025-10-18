import WebSocket from "ws";
import { WSMessage, RAGQueryResult } from "../types";
import { openaiService } from "../services/openai";
import { supabaseService } from "../services/supabase";

/**
 * WebSocket handler for real-time chat
 * Handles incoming messages and proxies to OpenAI Realtime API (or streaming completion)
 */

export function handleWebSocketConnection(ws: WebSocket, req: any) {
  console.log("[WS] New connection established");

  let sessionId: string | null = null;

  ws.on("message", async (data: WebSocket.Data) => {
    try {
      const message: WSMessage = JSON.parse(data.toString());
      console.log(`[WS] Received message type: ${message.type}`);

      switch (message.type) {
        case "start_session":
          sessionId = message.session_id || `session-${Date.now()}`;
          console.log(`[WS] Session started: ${sessionId}`);
          ws.send(
            JSON.stringify({
              type: "session_started",
              session_id: sessionId,
            })
          );
          break;

        case "user_message":
          await handleUserMessage(ws, message);
          break;

        case "user_audio_chunk":
          // TODO: Handle audio chunks for Realtime API
          // This would require establishing a WebSocket connection to OpenAI Realtime API
          console.log("[WS] Audio chunk received (not yet implemented)");
          break;

        case "upload_image_meta":
          // Handle image metadata
          console.log("[WS] Image metadata received");
          ws.send(
            JSON.stringify({
              type: "image_received",
              data: message.data,
            })
          );
          break;

        default:
          console.log(`[WS] Unknown message type: ${message.type}`);
      }
    } catch (error: any) {
      console.error("[WS] Error handling message:", error);
      ws.send(
        JSON.stringify({
          type: "error",
          error: error.message,
        })
      );
    }
  });

  ws.on("close", () => {
    console.log("[WS] Connection closed");
  });

  ws.on("error", (error) => {
    console.error("[WS] WebSocket error:", error);
  });
}

/**
 * Handle user text message with RAG
 */
async function handleUserMessage(ws: WebSocket, message: WSMessage) {
  const userText = message.text || "";
  const useRAG = message.use_rag !== false; // Default to true

  try {
    let ragContext = "";
    let sources: RAGQueryResult[] = [];

    // If RAG is enabled, query for relevant context
    if (useRAG && userText) {
      console.log("[WS] Querying RAG for context...");

      const queryEmbedding = await openaiService.createEmbedding(userText);
      sources = await supabaseService.queryDocuments(queryEmbedding, 3);

      if (sources.length > 0) {
        // Build context from sources
        ragContext = sources
          .map((source, index) => {
            return `[Source ${index + 1}: ${source.source}, p. ${source.page_number}]\n${source.snippet}`;
          })
          .join("\n\n");

        console.log(`[WS] Found ${sources.length} relevant sources`);

        // Send sources to client
        ws.send(
          JSON.stringify({
            type: "rag_sources",
            sources,
          })
        );
      }
    }

    // Compose messages for OpenAI
    const systemPrompt = ragContext
      ? `You are M3alem, an AI educational assistant. Use the following context from the textbook to help answer the student's question. Always cite sources when using information from the context.

Context:
${ragContext}

When answering, be clear, educational, and cite page numbers from the sources when relevant.`
      : `You are M3alem, an AI educational assistant. Help students learn by explaining concepts clearly and providing examples.`;

    const messages = [
      { role: "system" as const, content: systemPrompt },
      { role: "user" as const, content: userText },
    ];

    // Stream response from OpenAI
    console.log("[WS] Streaming response from OpenAI...");

    await openaiService.createStreamingCompletion(messages, (chunk) => {
      // Send partial response to client
      ws.send(
        JSON.stringify({
          type: "partial_response",
          text: chunk,
        })
      );
    });

    // Send final response indicator
    ws.send(
      JSON.stringify({
        type: "final_response",
        text: "",
        sources,
      })
    );

    console.log("[WS] Response completed");
  } catch (error: any) {
    console.error("[WS] Error processing user message:", error);
    ws.send(
      JSON.stringify({
        type: "error",
        error: "Failed to process message",
      })
    );
  }
}

/**
 * TODO: Implement OpenAI Realtime API connection
 *
 * For full Realtime API support with audio:
 * 1. Establish WebSocket connection to OpenAI Realtime API endpoint
 * 2. Forward audio chunks from client to OpenAI
 * 3. Receive audio/text responses from OpenAI
 * 4. Forward responses back to client
 *
 * Example pseudo-code:
 * const openaiWs = new WebSocket('wss://api.openai.com/v1/realtime');
 * openaiWs.on('message', (data) => {
 *   // Forward OpenAI response to client
 *   ws.send(data);
 * });
 */
