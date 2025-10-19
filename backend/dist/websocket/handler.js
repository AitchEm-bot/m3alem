"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleWebSocketConnection = handleWebSocketConnection;
const ws_1 = __importDefault(require("ws"));
const openai_1 = require("../services/openai");
const supabase_1 = require("../services/supabase");
function handleWebSocketConnection(ws, req) {
    console.log("[WS] New connection established");
    const connection = {
        clientWs: ws,
        openaiWs: null,
        sessionId: null,
        conversationId: null,
        currentSources: [],
        accumulatedText: "",
        isFirstMessage: true,
        isVoiceCallActive: false,
        isSTTSessionActive: false,
        accumulatedTranscript: "",
        sttTranscript: "",
        hasAudioInBuffer: false,
        isResponseInProgress: false,
        pendingBufferCommit: false,
        sttChunkCounter: 0,
    };
    // Initialize OpenAI Realtime API connection
    initializeOpenAIConnection(connection);
    ws.on("message", async (data) => {
        try {
            const message = JSON.parse(data.toString());
            console.log(`[WS] Received message type: ${message.type}`);
            switch (message.type) {
                case "start_session":
                    connection.sessionId = message.session_id || `session-${Date.now()}`;
                    connection.conversationId = message.data?.conversation_id || null;
                    console.log(`[WS] Session started: ${connection.sessionId}, Conversation ID: ${connection.conversationId}`);
                    ws.send(JSON.stringify({
                        type: "session_started",
                        session_id: connection.sessionId,
                        conversation_id: connection.conversationId,
                    }));
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
                case "start_voice_call":
                    console.log("[WS] Starting voice call");
                    await handleStartVoiceCall(connection);
                    break;
                case "end_voice_call":
                    console.log("[WS] Ending voice call");
                    await handleEndVoiceCall(connection);
                    break;
                case "audio_chunk":
                    console.log("[WS] Audio chunk received");
                    await handleAudioChunk(connection, message);
                    break;
                case "commit_audio":
                    console.log("[WS] Manual audio commit requested");
                    await handleManualCommit(connection);
                    break;
                case "start_stt_session":
                    console.log("[WS] Starting STT session");
                    await handleStartSTTSession(connection);
                    break;
                case "stt_audio_chunk":
                    await handleSTTAudioChunk(connection, message);
                    break;
                case "end_stt_session":
                    console.log("[WS] Ending STT session");
                    await handleEndSTTSession(connection);
                    break;
                default:
                    console.log(`[WS] Unknown message type: ${message.type}`);
            }
        }
        catch (error) {
            console.error("[WS] Error handling message:", error);
            ws.send(JSON.stringify({
                type: "error",
                error: error.message,
            }));
        }
    });
    ws.on("close", () => {
        console.log("[WS] Client connection closed");
        if (connection.openaiWs && connection.openaiWs.readyState === ws_1.default.OPEN) {
            connection.openaiWs.close();
        }
    });
    ws.on("error", (error) => {
        console.error("[WS] WebSocket error:", error);
    });
}
/**
 * Load conversation history and send to OpenAI
 */
async function loadConversationHistory(connection) {
    if (!connection.conversationId || !connection.openaiWs) {
        return;
    }
    // TODO: Conversation history loading temporarily disabled while testing voice call
    // The Realtime API has specific requirements for loading conversation history
    // that need to be investigated further
    console.log(`[WS] Conversation history loading disabled (conversation: ${connection.conversationId})`);
    return;
    /* DISABLED CODE
    try {
      console.log(`[WS] Loading conversation history for ${connection.conversationId}`);
  
      // Fetch messages from database
      const { data: messages, error } = await supabaseService
        .getClient()
        .from("messages")
        .select("*")
        .eq("conversation_id", connection.conversationId)
        .order("created_at", { ascending: true });
  
      if (error) {
        console.error("[WS] Error loading conversation history:", error);
        return;
      }
  
      if (!messages || messages.length === 0) {
        console.log("[WS] No previous messages found");
        return;
      }
  
      console.log(`[WS] Found ${messages.length} previous messages`);
  
      // Only send USER messages to OpenAI to rebuild context
      // The Realtime API doesn't support manually creating assistant messages via conversation.item.create
      // Assistant responses are only created by the model itself
      const userMessages = messages.filter(msg => msg.role === "user");
      console.log(`[WS] Sending ${userMessages.length} user messages to rebuild context`);
  
      for (const msg of userMessages) {
        const conversationItem = {
          type: "conversation.item.create",
          item: {
            type: "message",
            role: "user",
            content: [
              {
                type: "input_text",
                text: msg.content,
              },
            ],
          },
        };
  
        if (connection.openaiWs.readyState === WebSocket.OPEN) {
          connection.openaiWs.send(JSON.stringify(conversationItem));
        }
      }
  
      console.log("[WS] Conversation history loaded successfully");
    } catch (error) {
      console.error("[WS] Failed to load conversation history:", error);
    }
    */
}
/**
 * Initialize connection to OpenAI Realtime API
 */
function initializeOpenAIConnection(connection) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
        console.error("[WS] OpenAI API key not configured");
        connection.clientWs.send(JSON.stringify({
            type: "error",
            error: "Server configuration error",
        }));
        return;
    }
    console.log("[WS] Connecting to OpenAI Realtime API...");
    connection.openaiWs = new ws_1.default("wss://api.openai.com/v1/realtime?model=gpt-realtime-mini", {
        headers: {
            "Authorization": `Bearer ${apiKey}`,
            "OpenAI-Beta": "realtime=v1",
        },
    });
    connection.openaiWs.on("open", () => {
        console.log("[WS] Connected to OpenAI Realtime API");
        // Configure session for text-only mode with gpt-realtime-mini
        const sessionUpdate = {
            type: "session.update",
            session: {
                model: "gpt-realtime-mini",
                modalities: ["text"], // TEXT ONLY
                instructions: `You are M3alem, an AI educational tutor. Your role is to help students learn effectively by:
- Explaining concepts clearly and step-by-step
- Providing examples when helpful
- Encouraging critical thinking
- Being patient and supportive
- Using context from textbooks when provided
- Citing sources (page numbers) when referencing material

LANGUAGE HANDLING:
- Automatically detect and respond in the user's spoken language (English, Arabic, or any other language)
- You can freely switch languages mid-sentence or mix languages if it helps explain concepts better
- Use code-switching naturally (e.g., "The مفهوم of derivatives في calculus is...")
- If a term is clearer in one language, use it even if the conversation is in another language
- Prioritize clarity over language consistency - use whatever language best explains the concept

IMPORTANT - Math Formatting:
- For inline math expressions, use single dollar signs: $E=mc^2$
- For block equations, use double dollar signs on separate lines:
$$
F = ma
$$
- NEVER use parentheses like \\( \\) or \\[ \\] for math
- Always use markdown formatting for bold (**text**), italic (*text*), headers (# heading), lists, and code blocks

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
        connection.openaiWs.send(JSON.stringify(sessionUpdate));
        // Conversation history loading disabled while testing voice call
        // TODO: Re-enable once proper format is determined for Realtime API
        // if (connection.conversationId) {
        //   loadConversationHistory(connection).catch((error) => {
        //     console.error("[WS] Failed to load conversation history:", error);
        //   });
        // }
    });
    connection.openaiWs.on("message", async (data) => {
        try {
            const event = JSON.parse(data.toString());
            // Log full event for transcription-related events
            if (event.type && event.type.includes("transcription")) {
                console.log("[WS] OpenAI transcription event:", JSON.stringify(event, null, 2));
            }
            await handleOpenAIEvent(connection, event);
        }
        catch (error) {
            console.error("[WS] Error parsing OpenAI message:", error);
        }
    });
    connection.openaiWs.on("error", (error) => {
        console.error("[WS] OpenAI WebSocket error:", error);
        connection.clientWs.send(JSON.stringify({
            type: "error",
            error: "Connection to AI service failed",
        }));
    });
    connection.openaiWs.on("close", () => {
        console.log("[WS] OpenAI connection closed");
    });
}
/**
 * Handle events from OpenAI Realtime API
 */
async function handleOpenAIEvent(connection, event) {
    switch (event.type) {
        case "session.created":
            console.log("[WS] OpenAI session created");
            break;
        case "session.updated":
            console.log("[WS] OpenAI session updated");
            break;
        case "response.audio_transcript.delta":
            // Accumulate transcript during voice call
            if (connection.isVoiceCallActive && event.delta) {
                connection.accumulatedTranscript += event.delta;
                // Send transcript delta to client for display (partial)
                connection.clientWs.send(JSON.stringify({
                    type: "audio_transcript",
                    text: event.delta,
                    is_spoken: true,
                    is_partial: true, // Mark as partial so frontend accumulates
                }));
            }
            break;
        case "response.audio_transcript.done":
            // Complete transcript received
            if (connection.isVoiceCallActive && event.transcript) {
                console.log("[WS] Audio transcript complete:", event.transcript);
                // Save assistant's voice message to database
                if (connection.conversationId) {
                    try {
                        await supabase_1.supabaseService.getClient()
                            .from("messages")
                            .insert({
                            conversation_id: connection.conversationId,
                            role: "assistant",
                            content: event.transcript,
                            is_spoken: true,
                        });
                        console.log("[WS] Assistant voice message saved to database");
                    }
                    catch (error) {
                        console.error("[WS] Failed to save assistant voice message:", error);
                    }
                }
                // Send final complete transcript
                connection.clientWs.send(JSON.stringify({
                    type: "audio_transcript",
                    text: event.transcript,
                    is_spoken: true,
                    is_partial: false, // Mark as complete
                }));
            }
            break;
        case "response.audio.delta":
            // Forward audio chunk directly to client - let OpenAI handle streaming
            if (connection.isVoiceCallActive && event.delta) {
                console.log(`[WS] Forwarding audio delta to client, size: ${event.delta.length}`);
                connection.clientWs.send(JSON.stringify({
                    type: "audio_response",
                    audio: event.delta,
                }));
            }
            break;
        case "response.audio.done":
            // Audio response completed
            if (connection.isVoiceCallActive) {
                console.log("[WS] Audio response completed");
            }
            break;
        case "input_audio_buffer.speech_stopped":
            // User stopped speaking - VAD detected silence
            console.log("[WS] User stopped speaking");
            if (connection.isVoiceCallActive && connection.openaiWs && connection.hasAudioInBuffer) {
                if (connection.isResponseInProgress) {
                    console.log("[WS] Response already in progress, marking buffer for commit after current response");
                    connection.pendingBufferCommit = true;
                }
                else {
                    console.log("[WS] Committing audio buffer and creating response");
                    // DON'T send placeholder - just commit and wait for transcript
                    // The transcript will arrive via conversation.item.input_audio_transcription.completed
                    // Commit the audio buffer to trigger response generation
                    connection.openaiWs.send(JSON.stringify({
                        type: "input_audio_buffer.commit"
                    }));
                    // Create a response with audio modality
                    connection.openaiWs.send(JSON.stringify({
                        type: "response.create",
                        response: {
                            modalities: ["audio", "text"],
                            instructions: "Respond to the user's question as M3alem, the educational tutor.",
                        }
                    }));
                    connection.hasAudioInBuffer = false; // Reset flag
                    connection.isResponseInProgress = true; // Mark response as in progress
                }
            }
            else if (!connection.hasAudioInBuffer) {
                console.log("[WS] No audio in buffer, skipping commit");
            }
            break;
        case "input_audio_buffer.committed":
            console.log("[WS] Audio buffer committed successfully");
            connection.hasAudioInBuffer = false;
            break;
        case "input_audio_buffer.cleared":
            console.log("[WS] Audio buffer cleared");
            connection.hasAudioInBuffer = false;
            break;
        case "conversation.item.input_audio_transcription.delta":
            // Real-time transcription deltas
            if (connection.isSTTSessionActive && event.delta) {
                console.log("[WS] STT transcription delta:", event.delta);
                // Accumulate transcript
                connection.sttTranscript += event.delta;
                // Send delta to client for real-time display
                connection.clientWs.send(JSON.stringify({
                    type: "stt_transcript_delta",
                    text: event.delta,
                    is_final: false,
                }));
            }
            break;
        case "conversation.item.input_audio_transcription.completed":
            // User's audio has been transcribed
            if (event.transcript) {
                // Handle STT session (mic button transcription)
                if (connection.isSTTSessionActive) {
                    console.log("[WS] STT transcription completed:", event.transcript);
                    // Deltas are already being sent, completed event is just for logging
                }
                // Handle voice call transcription
                else if (connection.isVoiceCallActive) {
                    console.log("[WS] User audio transcribed:", event.transcript);
                    // Create conversation if this is the first message
                    if (!connection.conversationId && connection.isFirstMessage) {
                        try {
                            const title = event.transcript.length > 50
                                ? event.transcript.substring(0, 50) + "..."
                                : event.transcript;
                            const { data, error } = await supabase_1.supabaseService.getClient()
                                .from("conversations")
                                .insert({ title })
                                .select()
                                .single();
                            if (error) {
                                throw new Error(error.message);
                            }
                            connection.conversationId = data.id;
                            console.log(`[WS] Created new conversation: ${connection.conversationId}`);
                            connection.clientWs.send(JSON.stringify({
                                type: "conversation_created",
                                data: { conversation_id: connection.conversationId },
                            }));
                        }
                        catch (error) {
                            console.error("[WS] Error creating conversation:", error);
                        }
                    }
                    connection.isFirstMessage = false;
                    // Save user voice message to database
                    if (connection.conversationId) {
                        try {
                            await supabase_1.supabaseService.getClient()
                                .from("messages")
                                .insert({
                                conversation_id: connection.conversationId,
                                role: "user",
                                content: event.transcript,
                                is_spoken: true,
                            });
                            console.log(`[WS] Saved user voice message to conversation ${connection.conversationId}`);
                        }
                        catch (error) {
                            console.error("[WS] Error saving user voice message:", error);
                        }
                    }
                    // Accumulate user transcript for session tracking
                    connection.accumulatedTranscript += event.transcript + " ";
                    // Send transcript to client as new user message
                    connection.clientWs.send(JSON.stringify({
                        type: "user_audio_transcript",
                        text: event.transcript,
                        is_spoken: true,
                    }));
                }
            }
            break;
        case "response.text.delta":
            // Streaming text chunks
            if (event.delta) {
                connection.accumulatedText += event.delta;
                // Send partial response to client
                connection.clientWs.send(JSON.stringify({
                    type: "partial_response",
                    text: connection.accumulatedText,
                }));
            }
            break;
        case "response.text.done":
            // Text response completed - get the full text
            if (event.text) {
                connection.accumulatedText = event.text;
                // Send partial response with complete text
                connection.clientWs.send(JSON.stringify({
                    type: "partial_response",
                    text: connection.accumulatedText,
                }));
            }
            break;
        case "response.done":
            console.log("[WS] OpenAI response complete");
            // Send final response with sources
            connection.clientWs.send(JSON.stringify({
                type: "final_response",
                text: connection.accumulatedText,
                sources: connection.currentSources,
            }));
            // Save assistant message to database
            if (connection.conversationId && connection.accumulatedText) {
                try {
                    await supabase_1.supabaseService.getClient()
                        .from("messages")
                        .insert({
                        conversation_id: connection.conversationId,
                        role: "assistant",
                        content: connection.accumulatedText,
                        sources: connection.currentSources.length > 0 ? connection.currentSources : null,
                        is_spoken: connection.isVoiceCallActive, // Mark as spoken if from voice call
                    });
                    // Update conversation's updated_at timestamp
                    await supabase_1.supabaseService.getClient()
                        .from("conversations")
                        .update({ updated_at: new Date().toISOString() })
                        .eq("id", connection.conversationId);
                    console.log(`[WS] Saved assistant ${connection.isVoiceCallActive ? 'voice' : 'text'} message to conversation ${connection.conversationId}`);
                }
                catch (error) {
                    console.error("[WS] Error saving assistant message:", error);
                }
            }
            // Reset for next response
            connection.accumulatedText = "";
            connection.currentSources = [];
            connection.isResponseInProgress = false; // Mark response as complete
            // If there's a pending buffer commit, process it now
            if (connection.pendingBufferCommit && connection.isVoiceCallActive && connection.openaiWs) {
                console.log("[WS] Processing pending buffer commit");
                connection.pendingBufferCommit = false;
                // Commit the audio buffer
                connection.openaiWs.send(JSON.stringify({
                    type: "input_audio_buffer.commit"
                }));
                // Create a new response
                connection.openaiWs.send(JSON.stringify({
                    type: "response.create",
                    response: {
                        modalities: ["audio", "text"],
                        instructions: "Respond to the user's question as M3alem, the educational tutor.",
                    }
                }));
                connection.hasAudioInBuffer = false;
                connection.isResponseInProgress = true;
            }
            break;
        case "response.content_part.done":
            // Content part completed
            if (event.part && event.part.text) {
                connection.accumulatedText = event.part.text;
            }
            break;
        case "error":
            console.error("[WS] OpenAI error:", event.error);
            connection.clientWs.send(JSON.stringify({
                type: "error",
                error: event.error.message || "AI service error",
            }));
            break;
        case "input_audio_buffer.speech_started":
            console.log("[WS] User started speaking");
            connection.hasAudioInBuffer = true; // Mark that we have audio in buffer
            break;
        case "rate_limits.updated":
            // Rate limit info - log but don't forward to client
            console.log("[WS] Rate limits updated");
            break;
        case "response.output_item.added":
            console.log("[WS] Response output item added");
            break;
        case "response.output_item.done":
            console.log("[WS] Response output item done");
            break;
        case "response.created":
            console.log("[WS] Response created");
            connection.isResponseInProgress = true;
            break;
        default:
            // Log other events for debugging
            console.log(`[WS] OpenAI event: ${event.type}`);
    }
}
/**
 * Handle user text message with RAG
 */
async function handleUserMessage(connection, message) {
    const userText = message.text || "";
    const useRAG = message.use_rag !== false; // Default to true
    if (!connection.openaiWs || connection.openaiWs.readyState !== ws_1.default.OPEN) {
        console.error("[WS] OpenAI connection not ready");
        connection.clientWs.send(JSON.stringify({
            type: "error",
            error: "AI service not connected",
        }));
        return;
    }
    try {
        // Create conversation if this is the first message and no conversation exists
        if (!connection.conversationId && connection.isFirstMessage) {
            try {
                // Generate title from first message
                const title = userText.length > 50 ? userText.substring(0, 50) + "..." : userText;
                const { data, error } = await supabase_1.supabaseService.getClient()
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
                connection.clientWs.send(JSON.stringify({
                    type: "conversation_created",
                    conversation_id: connection.conversationId,
                }));
            }
            catch (error) {
                console.error("[WS] Error creating conversation:", error);
                // Continue without saving to database
            }
        }
        // Save user message to database
        if (connection.conversationId) {
            try {
                await supabase_1.supabaseService.getClient()
                    .from("messages")
                    .insert({
                    conversation_id: connection.conversationId,
                    role: "user",
                    content: userText,
                });
                console.log(`[WS] Saved user message to conversation ${connection.conversationId}`);
            }
            catch (error) {
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
                const queryEmbedding = await openai_1.openaiService.createEmbedding(userText);
                connection.currentSources = await supabase_1.supabaseService.queryDocuments(queryEmbedding, 3);
                if (connection.currentSources.length > 0) {
                    // Build context from sources
                    ragContext = connection.currentSources
                        .map((source, index) => {
                        return `[Source ${index + 1}: ${source.source}, p. ${source.page_number}]\n${source.snippet}`;
                    })
                        .join("\n\n");
                    console.log(`[WS] Found ${connection.currentSources.length} relevant sources`);
                    // Send sources to client immediately
                    connection.clientWs.send(JSON.stringify({
                        type: "rag_sources",
                        sources: connection.currentSources,
                    }));
                }
                else {
                    console.log("[WS] No relevant sources found");
                }
            }
            catch (ragError) {
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
    }
    catch (error) {
        console.error("[WS] Error processing user message:", error);
        connection.clientWs.send(JSON.stringify({
            type: "error",
            error: "Failed to process message",
        }));
    }
}
/**
 * Handle image upload
 * Note: OpenAI Realtime API doesn't support images yet,
 * so we'll acknowledge the image and respond based on the caption
 */
async function handleImageUpload(connection, message) {
    const imageData = message.data?.image_data;
    const filename = message.data?.filename;
    const caption = message.data?.caption || "Please analyze this image";
    if (!connection.openaiWs || connection.openaiWs.readyState !== ws_1.default.OPEN) {
        console.error("[WS] OpenAI connection not ready");
        connection.clientWs.send(JSON.stringify({
            type: "error",
            error: "AI service not connected",
        }));
        return;
    }
    try {
        // Create conversation if needed
        if (!connection.conversationId && connection.isFirstMessage) {
            try {
                const title = caption.length > 50 ? caption.substring(0, 50) + "..." : caption;
                const { data, error } = await supabase_1.supabaseService.getClient()
                    .from("conversations")
                    .insert({ title })
                    .select()
                    .single();
                if (error) {
                    throw new Error(error.message);
                }
                connection.conversationId = data.id;
                console.log(`[WS] Created new conversation: ${connection.conversationId}`);
                connection.clientWs.send(JSON.stringify({
                    type: "conversation_created",
                    data: { conversation_id: connection.conversationId },
                }));
            }
            catch (error) {
                console.error("[WS] Error creating conversation:", error);
            }
        }
        // Save user message with image to database
        if (connection.conversationId) {
            try {
                await supabase_1.supabaseService.getClient()
                    .from("messages")
                    .insert({
                    conversation_id: connection.conversationId,
                    role: "user",
                    content: caption || "Sent an image",
                    image_data: imageData,
                    image_filename: filename,
                });
                console.log(`[WS] Saved image message to conversation ${connection.conversationId}`);
            }
            catch (error) {
                console.error("[WS] Error saving image message:", error);
            }
        }
        connection.isFirstMessage = false;
        // Create conversation item with image
        const contentParts = [];
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
    }
    catch (error) {
        console.error("[WS] Error processing image upload:", error);
        connection.clientWs.send(JSON.stringify({
            type: "error",
            error: "Failed to process image",
        }));
    }
}
/**
 * Handle start voice call request
 * Switches OpenAI session to audio mode
 */
async function handleStartVoiceCall(connection) {
    if (!connection.openaiWs || connection.openaiWs.readyState !== ws_1.default.OPEN) {
        console.error("[WS] OpenAI connection not ready");
        connection.clientWs.send(JSON.stringify({
            type: "error",
            error: "AI service not connected",
        }));
        return;
    }
    try {
        console.log("[WS] Switching to voice call mode");
        connection.isVoiceCallActive = true;
        connection.accumulatedTranscript = "";
        connection.hasAudioInBuffer = false;
        connection.isResponseInProgress = false;
        connection.pendingBufferCommit = false;
        // Update session to enable audio modalities
        // Using correct format for OpenAI Realtime API
        const sessionUpdate = {
            type: "session.update",
            session: {
                model: "gpt-realtime-mini",
                modalities: ["text", "audio"], // Enable both text and audio
                voice: "alloy",
                input_audio_format: "pcm16",
                output_audio_format: "pcm16",
                input_audio_transcription: {
                    model: "whisper-1", // Enable transcription of user audio
                },
                turn_detection: null, // DISABLED - Manual mode for testing in noisy environment
                // turn_detection: {
                //   type: "server_vad",  // Server-side voice activity detection
                //   threshold: 0.7,  // Higher threshold = less sensitive to noise (0.5 -> 0.7)
                //   prefix_padding_ms: 300,
                //   silence_duration_ms: 1000,  // Longer silence required = fewer false triggers (500ms -> 1000ms)
                // },
                instructions: `You are M3alem, an AI educational tutor helping students learn. Provide clear, concise explanations.

LANGUAGE HANDLING:
- Automatically detect and respond in the user's spoken language (English, Arabic, or any other language)
- You can freely switch languages mid-sentence or mix languages if it helps explain concepts better
- Use code-switching naturally (e.g., "The مفهوم of derivatives في calculus is...")
- If a term is clearer in one language, use it even if the conversation is in another language
- Prioritize clarity over language consistency - use whatever language best explains the concept`,
                temperature: 0.8,
                max_response_output_tokens: 4096,
            },
        };
        connection.openaiWs.send(JSON.stringify(sessionUpdate));
        // Notify client that voice call started
        connection.clientWs.send(JSON.stringify({
            type: "voice_call_started",
        }));
        console.log("[WS] Voice call mode activated");
    }
    catch (error) {
        console.error("[WS] Error starting voice call:", error);
        connection.clientWs.send(JSON.stringify({
            type: "error",
            error: "Failed to start voice call",
        }));
    }
}
/**
 * Handle end voice call request
 * Switches OpenAI session back to text-only mode
 */
async function handleEndVoiceCall(connection) {
    if (!connection.openaiWs || connection.openaiWs.readyState !== ws_1.default.OPEN) {
        console.error("[WS] OpenAI connection not ready");
        return;
    }
    try {
        console.log("[WS] Ending voice call mode");
        // Update session back to text-only mode
        const sessionUpdate = {
            type: "session.update",
            session: {
                model: "gpt-realtime-mini",
                modalities: ["text"], // Text only
                voice: "alloy",
                input_audio_format: "pcm16",
                output_audio_format: "pcm16",
                input_audio_transcription: null, // Disable transcription
                turn_detection: null, // Disable turn detection for text mode
                temperature: 0.8,
                max_response_output_tokens: 4096,
            },
        };
        connection.openaiWs.send(JSON.stringify(sessionUpdate));
        // Messages are now saved individually as they arrive, so no need to save accumulated transcript
        // Just reset the state
        connection.isVoiceCallActive = false;
        connection.accumulatedTranscript = "";
        connection.hasAudioInBuffer = false;
        connection.isResponseInProgress = false;
        connection.pendingBufferCommit = false;
        // Notify client that voice call ended
        connection.clientWs.send(JSON.stringify({
            type: "voice_call_ended",
        }));
        console.log("[WS] Voice call mode deactivated");
    }
    catch (error) {
        console.error("[WS] Error ending voice call:", error);
        connection.clientWs.send(JSON.stringify({
            type: "error",
            error: "Failed to end voice call",
        }));
    }
}
/**
 * Handle audio chunk from client during voice call
 * Forwards audio data to OpenAI Realtime API
 */
async function handleAudioChunk(connection, message) {
    if (!connection.openaiWs || connection.openaiWs.readyState !== ws_1.default.OPEN) {
        console.error("[WS] OpenAI connection not ready");
        return;
    }
    if (!connection.isVoiceCallActive) {
        console.warn("[WS] Received audio chunk but voice call is not active");
        return;
    }
    try {
        const audioData = message.audio; // Base64 encoded PCM16 audio
        if (!audioData) {
            console.warn("[WS] Audio chunk missing audio data");
            return;
        }
        // Mark that we have audio in buffer
        connection.hasAudioInBuffer = true;
        // Forward audio to OpenAI
        const audioAppend = {
            type: "input_audio_buffer.append",
            audio: audioData, // Base64 PCM16
        };
        connection.openaiWs.send(JSON.stringify(audioAppend));
    }
    catch (error) {
        console.error("[WS] Error handling audio chunk:", error);
    }
}
/**
 * Handle manual audio commit (when VAD is disabled)
 * User manually triggers commit when they're done speaking
 */
async function handleManualCommit(connection) {
    if (!connection.openaiWs || connection.openaiWs.readyState !== ws_1.default.OPEN) {
        console.error("[WS] OpenAI connection not ready");
        return;
    }
    if (!connection.isVoiceCallActive) {
        console.warn("[WS] Manual commit requested but voice call is not active");
        return;
    }
    if (!connection.hasAudioInBuffer) {
        console.log("[WS] No audio in buffer to commit");
        return;
    }
    if (connection.isResponseInProgress) {
        console.log("[WS] Response already in progress, marking buffer for commit after current response");
        connection.pendingBufferCommit = true;
        return;
    }
    try {
        console.log("[WS] Manually committing audio buffer and creating response");
        // DON'T send placeholder - wait for actual transcript from OpenAI
        // Commit the audio buffer
        connection.openaiWs.send(JSON.stringify({
            type: "input_audio_buffer.commit"
        }));
        // Create a response with audio modality
        connection.openaiWs.send(JSON.stringify({
            type: "response.create",
            response: {
                modalities: ["audio", "text"],
                instructions: "Respond to the user's question as M3alem, the educational tutor.",
            }
        }));
        connection.hasAudioInBuffer = false;
        connection.isResponseInProgress = true;
    }
    catch (error) {
        console.error("[WS] Error handling manual commit:", error);
    }
}
/**
 * Handle starting STT (Speech-to-Text) session
 * Similar to voice call but transcription-only (no AI response)
 */
async function handleStartSTTSession(connection) {
    if (!connection.openaiWs || connection.openaiWs.readyState !== ws_1.default.OPEN) {
        console.error("[WS] OpenAI connection not ready for STT");
        return;
    }
    try {
        console.log("[WS] Switching to STT mode");
        connection.isSTTSessionActive = true;
        connection.sttTranscript = "";
        connection.sttChunkCounter = 0; // Reset chunk counter
        // Update session for STT: transcription only, no responses
        const sessionUpdate = {
            type: "session.update",
            session: {
                modalities: ["text"], // Text only - no audio responses
                voice: "alloy",
                input_audio_format: "pcm16",
                output_audio_format: "pcm16",
                input_audio_transcription: {
                    model: "whisper-1", // Enable transcription
                },
                turn_detection: null, // Manual mode
                temperature: 0.8,
            },
        };
        connection.openaiWs.send(JSON.stringify(sessionUpdate));
        // Send confirmation to client
        connection.clientWs.send(JSON.stringify({
            type: "stt_session_started",
        }));
        console.log("[WS] STT session started");
    }
    catch (error) {
        console.error("[WS] Error starting STT session:", error);
        connection.clientWs.send(JSON.stringify({
            type: "error",
            error: "Failed to start STT session",
        }));
    }
}
/**
 * Handle STT audio chunk
 */
async function handleSTTAudioChunk(connection, message) {
    if (!connection.openaiWs || connection.openaiWs.readyState !== ws_1.default.OPEN) {
        console.error("[WS] OpenAI connection not ready");
        return;
    }
    if (!connection.isSTTSessionActive) {
        console.warn("[WS] Received STT audio chunk but session is not active");
        return;
    }
    if (!message.audio) {
        console.warn("[WS] STT audio chunk message missing audio data");
        return;
    }
    try {
        // Forward audio to OpenAI for transcription
        connection.openaiWs.send(JSON.stringify({
            type: "input_audio_buffer.append",
            audio: message.audio,
        }));
        // Increment chunk counter
        connection.sttChunkCounter++;
        // Commit every 6 chunks (~1 second of audio at 4096 samples/chunk @ 24kHz)
        // This gives Whisper enough context to transcribe effectively
        if (connection.sttChunkCounter >= 6) {
            console.log("[WS] Committing STT audio buffer after", connection.sttChunkCounter, "chunks");
            connection.openaiWs.send(JSON.stringify({
                type: "input_audio_buffer.commit",
            }));
            connection.sttChunkCounter = 0; // Reset counter
        }
    }
    catch (error) {
        console.error("[WS] Error handling STT audio chunk:", error);
    }
}
/**
 * Handle ending STT session
 */
async function handleEndSTTSession(connection) {
    if (!connection.openaiWs || connection.openaiWs.readyState !== ws_1.default.OPEN) {
        console.warn("[WS] OpenAI connection not ready");
        return;
    }
    try {
        console.log("[WS] Ending STT session");
        // Commit any remaining audio in buffer
        if (connection.sttChunkCounter > 0) {
            console.log("[WS] Committing remaining", connection.sttChunkCounter, "chunks");
            connection.openaiWs.send(JSON.stringify({
                type: "input_audio_buffer.commit",
            }));
        }
        // Give a moment for final transcription to arrive
        await new Promise(resolve => setTimeout(resolve, 500));
        // Send final transcript to client
        if (connection.sttTranscript) {
            connection.clientWs.send(JSON.stringify({
                type: "stt_transcript_delta",
                text: connection.sttTranscript,
                is_final: true,
            }));
        }
        // Reset STT state
        connection.isSTTSessionActive = false;
        connection.sttTranscript = "";
        connection.sttChunkCounter = 0;
        // Switch back to text mode
        const sessionUpdate = {
            type: "session.update",
            session: {
                modalities: ["text"],
                input_audio_transcription: null, // Disable transcription
                turn_detection: null,
            },
        };
        connection.openaiWs.send(JSON.stringify(sessionUpdate));
        // Send confirmation to client
        connection.clientWs.send(JSON.stringify({
            type: "stt_session_ended",
        }));
        console.log("[WS] STT session ended");
    }
    catch (error) {
        console.error("[WS] Error ending STT session:", error);
    }
}
//# sourceMappingURL=handler.js.map