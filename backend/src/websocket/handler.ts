import WebSocket from "ws";
import { WSMessage, RAGQueryResult } from "../types";
import { openaiService } from "../services/openai";
import { supabaseService } from "../services/supabase";

/**
 * WebSocket handler for real-time chat
 * Proxies client messages to OpenAI Realtime API for text-only chat
 */

interface ClientConnection {
  clientWs: WebSocket;
  openaiWs: WebSocket | null;
  sessionId: string | null;
  conversationId: string | null;
  currentSources: RAGQueryResult[];
  accumulatedText: string;
  isFirstMessage: boolean;
}

export function handleWebSocketConnection(ws: WebSocket, req: any) {
  console.log("[WS] New connection established");

  const connection: ClientConnection = {
    clientWs: ws,
    openaiWs: null,
    sessionId: null,
    conversationId: null,
    currentSources: [],
    accumulatedText: "",
    isFirstMessage: true,
  };

  // Initialize OpenAI Realtime API connection
  initializeOpenAIConnection(connection);

  ws.on("message", async (data: WebSocket.Data) => {
    try {
      const message: WSMessage = JSON.parse(data.toString());
      console.log(`[WS] Received message type: ${message.type}`);

      switch (message.type) {
        case "start_session":
          connection.sessionId = message.session_id || `session-${Date.now()}`;
          connection.conversationId = message.data?.conversation_id || null;
          console.log(`[WS] Session started: ${connection.sessionId}, Conversation ID: ${connection.conversationId}`);
          ws.send(
            JSON.stringify({
              type: "session_started",
              session_id: connection.sessionId,
              conversation_id: connection.conversationId,
            })
          );
          break;

        case "user_message":
          await handleUserMessage(connection, message);
          break;

        case "user_audio_chunk":
          // Audio not implemented yet, but ready for future
          console.log("[WS] Audio chunk received (not yet implemented)");
          break;

        case "upload_image_meta":
          console.log("[WS] Image metadata received");
          await handleImageUpload(connection, message);
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
    console.log("[WS] Client connection closed");
    if (connection.openaiWs && connection.openaiWs.readyState === WebSocket.OPEN) {
      connection.openaiWs.close();
    }
  });

  ws.on("error", (error) => {
    console.error("[WS] WebSocket error:", error);
  });
}

/**
 * Initialize connection to OpenAI Realtime API
 */
function initializeOpenAIConnection(connection: ClientConnection) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    console.error("[WS] OpenAI API key not configured");
    connection.clientWs.send(
      JSON.stringify({
        type: "error",
        error: "Server configuration error",
      })
    );
    return;
  }

  console.log("[WS] Connecting to OpenAI Realtime API...");

  connection.openaiWs = new WebSocket(
    "wss://api.openai.com/v1/realtime?model=gpt-realtime-mini",
    {
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "OpenAI-Beta": "realtime=v1",
      },
    }
  );

  connection.openaiWs.on("open", () => {
    console.log("[WS] Connected to OpenAI Realtime API");

    // Configure session for text-only mode with gpt-realtime-mini
    const sessionUpdate = {
      type: "session.update",
      session: {
        model: "gpt-realtime-mini",
        modalities: ["text"],  // TEXT ONLY
        instructions: `You are M3alem, an AI educational tutor. Your role is to help students learn effectively by:
- Explaining concepts clearly and step-by-step
- Providing examples when helpful
- Encouraging critical thinking
- Being patient and supportive
- Using context from textbooks when provided
- Citing sources (page numbers) when referencing material

Keep responses clear, educational, and engaging.`,
        voice: "alloy", // Required even for text-only mode
        input_audio_format: "pcm16",
        output_audio_format: "pcm16",
        input_audio_transcription: null,
        turn_detection: null, // Manual turn detection for text mode
        temperature: 0.8,
        max_response_output_tokens: 4096,
      },
    };

    connection.openaiWs!.send(JSON.stringify(sessionUpdate));
  });

  connection.openaiWs.on("message", async (data: Buffer) => {
    try {
      const event = JSON.parse(data.toString());
      await handleOpenAIEvent(connection, event);
    } catch (error) {
      console.error("[WS] Error parsing OpenAI message:", error);
    }
  });

  connection.openaiWs.on("error", (error) => {
    console.error("[WS] OpenAI WebSocket error:", error);
    connection.clientWs.send(
      JSON.stringify({
        type: "error",
        error: "Connection to AI service failed",
      })
    );
  });

  connection.openaiWs.on("close", () => {
    console.log("[WS] OpenAI connection closed");
  });
}

/**
 * Handle events from OpenAI Realtime API
 */
async function handleOpenAIEvent(connection: ClientConnection, event: any) {
  switch (event.type) {
    case "session.created":
      console.log("[WS] OpenAI session created");
      break;

    case "session.updated":
      console.log("[WS] OpenAI session updated");
      break;

    case "response.audio_transcript.delta":
      // Text transcription of audio (we're not using audio mode)
      break;

    case "response.text.delta":
      // Streaming text chunks
      if (event.delta) {
        connection.accumulatedText += event.delta;

        // Send partial response to client
        connection.clientWs.send(
          JSON.stringify({
            type: "partial_response",
            text: connection.accumulatedText,
          })
        );
      }
      break;

    case "response.text.done":
      // Text response completed - get the full text
      if (event.text) {
        connection.accumulatedText = event.text;

        // Send partial response with complete text
        connection.clientWs.send(
          JSON.stringify({
            type: "partial_response",
            text: connection.accumulatedText,
          })
        );
      }
      break;

    case "response.done":
      console.log("[WS] OpenAI response complete");

      // Send final response with sources
      connection.clientWs.send(
        JSON.stringify({
          type: "final_response",
          text: connection.accumulatedText,
          sources: connection.currentSources,
        })
      );

      // Save assistant message to database
      if (connection.conversationId && connection.accumulatedText) {
        try {
          await supabaseService.getClient()
            .from("messages")
            .insert({
              conversation_id: connection.conversationId,
              role: "assistant",
              content: connection.accumulatedText,
              sources: connection.currentSources.length > 0 ? connection.currentSources : null,
            });

          // Update conversation's updated_at timestamp
          await supabaseService.getClient()
            .from("conversations")
            .update({ updated_at: new Date().toISOString() })
            .eq("id", connection.conversationId);

          console.log(`[WS] Saved assistant message to conversation ${connection.conversationId}`);
        } catch (error) {
          console.error("[WS] Error saving assistant message:", error);
        }
      }

      // Reset for next response
      connection.accumulatedText = "";
      connection.currentSources = [];
      break;

    case "response.content_part.done":
      // Content part completed
      if (event.part && event.part.text) {
        connection.accumulatedText = event.part.text;
      }
      break;

    case "error":
      console.error("[WS] OpenAI error:", event.error);
      connection.clientWs.send(
        JSON.stringify({
          type: "error",
          error: event.error.message || "AI service error",
        })
      );
      break;

    case "rate_limits.updated":
      // Rate limit info - log but don't forward to client
      console.log("[WS] Rate limits updated");
      break;

    default:
      // Log other events for debugging
      console.log(`[WS] OpenAI event: ${event.type}`);
  }
}

/**
 * Handle user text message with RAG
 */
async function handleUserMessage(connection: ClientConnection, message: WSMessage) {
  const userText = message.text || "";
  const useRAG = message.use_rag !== false; // Default to true

  if (!connection.openaiWs || connection.openaiWs.readyState !== WebSocket.OPEN) {
    console.error("[WS] OpenAI connection not ready");
    connection.clientWs.send(
      JSON.stringify({
        type: "error",
        error: "AI service not connected",
      })
    );
    return;
  }

  try {
    // Create conversation if this is the first message and no conversation exists
    if (!connection.conversationId && connection.isFirstMessage) {
      try {
        // Generate title from first message
        const title = userText.length > 50 ? userText.substring(0, 50) + "..." : userText;

        const { data, error } = await supabaseService.getClient()
          .from("conversations")
          .insert({ title })
          .select()
          .single();

        if (error) {
          throw new Error(error.message);
        }

        connection.conversationId = data.id;
        console.log(`[WS] Created new conversation: ${connection.conversationId}`);

        // Notify client of the new conversation ID
        connection.clientWs.send(
          JSON.stringify({
            type: "conversation_created",
            conversation_id: connection.conversationId,
          })
        );
      } catch (error) {
        console.error("[WS] Error creating conversation:", error);
        // Continue without saving to database
      }
    }

    // Save user message to database
    if (connection.conversationId) {
      try {
        await supabaseService.getClient()
          .from("messages")
          .insert({
            conversation_id: connection.conversationId,
            role: "user",
            content: userText,
          });

        console.log(`[WS] Saved user message to conversation ${connection.conversationId}`);
      } catch (error) {
        console.error("[WS] Error saving user message:", error);
      }
    }

    connection.isFirstMessage = false;
    let ragContext = "";
    connection.currentSources = [];

    // If RAG is enabled, query for relevant context
    if (useRAG && userText) {
      console.log("[WS] Querying RAG for context...");

      try {
        const queryEmbedding = await openaiService.createEmbedding(userText);
        connection.currentSources = await supabaseService.queryDocuments(queryEmbedding, 3);

        if (connection.currentSources.length > 0) {
          // Build context from sources
          ragContext = connection.currentSources
            .map((source, index) => {
              return `[Source ${index + 1}: ${source.source}, p. ${source.page_number}]\n${source.snippet}`;
            })
            .join("\n\n");

          console.log(`[WS] Found ${connection.currentSources.length} relevant sources`);

          // Send sources to client immediately
          connection.clientWs.send(
            JSON.stringify({
              type: "rag_sources",
              sources: connection.currentSources,
            })
          );
        } else {
          console.log("[WS] No relevant sources found");
        }
      } catch (ragError) {
        console.error("[WS] RAG query failed:", ragError);
        // Continue without RAG context
      }
    }

    // Create conversation item with user message and RAG context
    const contentText = ragContext
      ? `Context from textbook:\n\n${ragContext}\n\nStudent question: ${userText}`
      : userText;

    const conversationItem = {
      type: "conversation.item.create",
      item: {
        type: "message",
        role: "user",
        content: [
          {
            type: "input_text",
            text: contentText,
          },
        ],
      },
    };

    // Send conversation item to OpenAI
    connection.openaiWs.send(JSON.stringify(conversationItem));

    // Trigger response generation (text-only)
    const responseCreate = {
      type: "response.create",
      response: {
        modalities: ["text"],
        instructions: ragContext
          ? "Use the provided textbook context to answer the student's question. Cite page numbers when referencing specific information."
          : undefined,
      },
    };

    connection.openaiWs.send(JSON.stringify(responseCreate));

    console.log("[WS] Request sent to OpenAI");
  } catch (error: any) {
    console.error("[WS] Error processing user message:", error);
    connection.clientWs.send(
      JSON.stringify({
        type: "error",
        error: "Failed to process message",
      })
    );
  }
}

/**
 * Handle image upload
 * Note: OpenAI Realtime API doesn't support images yet,
 * so we'll acknowledge the image and respond based on the caption
 */
async function handleImageUpload(connection: ClientConnection, message: WSMessage) {
  const imageData = message.data?.image_data;
  const filename = message.data?.filename;
  const caption = message.data?.caption || "Please analyze this image";

  if (!connection.openaiWs || connection.openaiWs.readyState !== WebSocket.OPEN) {
    console.error("[WS] OpenAI connection not ready");
    connection.clientWs.send(
      JSON.stringify({
        type: "error",
        error: "AI service not connected",
      })
    );
    return;
  }

  try {
    // Create conversation if needed
    if (!connection.conversationId && connection.isFirstMessage) {
      try {
        const title = caption.length > 50 ? caption.substring(0, 50) + "..." : caption;

        const { data, error } = await supabaseService.getClient()
          .from("conversations")
          .insert({ title })
          .select()
          .single();

        if (error) {
          throw new Error(error.message);
        }

        connection.conversationId = data.id;
        console.log(`[WS] Created new conversation: ${connection.conversationId}`);

        connection.clientWs.send(
          JSON.stringify({
            type: "conversation_created",
            data: { conversation_id: connection.conversationId },
          })
        );
      } catch (error) {
        console.error("[WS] Error creating conversation:", error);
      }
    }

    // Save user message with image to database
    if (connection.conversationId) {
      try {
        await supabaseService.getClient()
          .from("messages")
          .insert({
            conversation_id: connection.conversationId,
            role: "user",
            content: caption || "Sent an image",
            image_data: imageData,
            image_filename: filename,
          });

        console.log(`[WS] Saved image message to conversation ${connection.conversationId}`);
      } catch (error) {
        console.error("[WS] Error saving image message:", error);
      }
    }

    connection.isFirstMessage = false;

    // Create conversation item with image
    const contentParts: any[] = [];

    // Add image if provided
    if (imageData) {
      contentParts.push({
        type: "input_image",
        image_url: imageData, // Base64 encoded image
      });
    }

    // Add caption as text if provided
    if (caption) {
      contentParts.push({
        type: "input_text",
        text: caption,
      });
    }

    const conversationItem = {
      type: "conversation.item.create",
      item: {
        type: "message",
        role: "user",
        content: contentParts,
      },
    };

    connection.openaiWs.send(JSON.stringify(conversationItem));

    // Trigger response
    const responseCreate = {
      type: "response.create",
      response: {
        modalities: ["text"],
      },
    };

    connection.openaiWs.send(JSON.stringify(responseCreate));

    console.log("[WS] Image upload processed, response requested from OpenAI");
  } catch (error: any) {
    console.error("[WS] Error processing image upload:", error);
    connection.clientWs.send(
      JSON.stringify({
        type: "error",
        error: "Failed to process image",
      })
    );
  }
}
