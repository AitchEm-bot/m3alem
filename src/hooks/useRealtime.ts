"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { WebSocketClient, WSMessage, RAGSource } from "@/lib/wsClient";
import { generateSessionId } from "@/lib/utils";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  sources?: RAGSource[];
  isPartial?: boolean;
  imageData?: string; // base64 image data
  imageFilename?: string;
  isSpoken?: boolean; // Indicates message was spoken during voice call
}

export interface UseRealtimeOptions {
  autoConnect?: boolean;
  conversationId?: string | null;
  initialMessages?: ChatMessage[];
}

export function useRealtime(options: UseRealtimeOptions = {}) {
  const { autoConnect = true, conversationId: initialConversationId = null, initialMessages = [] } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isThinking, setIsThinking] = useState(false); // Waiting for first token
  const [currentSources, setCurrentSources] = useState<RAGSource[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(initialConversationId);

  const wsClient = useRef<WebSocketClient | null>(null);
  const sessionId = useRef<string>(generateSessionId());
  const currentMessageId = useRef<string | null>(null);
  const currentSourcesRef = useRef<RAGSource[]>([]);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const messageCounter = useRef<number>(0); // Counter for unique message IDs
  const isConnectingRef = useRef<boolean>(false); // Prevent multiple simultaneous connections
  const pendingUserTranscriptRef = useRef<boolean>(false); // Track if we're waiting for user transcript

  // Update ref when currentSources changes
  useEffect(() => {
    currentSourcesRef.current = currentSources;
  }, [currentSources]);

  // Use a ref to track the conversation ID so it doesn't cause reconnections
  const conversationIdRef = useRef(conversationId);

  // Update the ref when conversationId changes
  useEffect(() => {
    conversationIdRef.current = conversationId;
  }, [conversationId]);

  // Track which conversation's messages we've loaded to prevent duplicates
  const loadedConversationRef = useRef<string | null>(null);

  // Load initial messages when conversation changes, but not during active updates
  useEffect(() => {
    const currentConvId = conversationIdRef.current || 'new';

    // Only load if this is a different conversation OR first load
    if (initialMessages.length > 0 && loadedConversationRef.current !== currentConvId) {
      console.log("[Realtime] Loading initial messages for conversation:", currentConvId, "count:", initialMessages.length);
      setMessages(initialMessages);
      loadedConversationRef.current = currentConvId;
    } else if (initialMessages.length === 0 && currentConvId === 'new') {
      // Clear messages for new conversation
      console.log("[Realtime] Clearing messages for new conversation");
      setMessages([]);
      loadedConversationRef.current = 'new';
    }
  }, [initialMessages]);

  /**
   * Initialize WebSocket connection
   */
  const connect = useCallback(async () => {
    // Prevent multiple simultaneous connection attempts
    if (isConnectingRef.current) {
      console.log("[Realtime] Connection already in progress, skipping");
      return;
    }

    // Don't reconnect if already connected
    if (wsClient.current?.isConnected()) {
      console.log("[Realtime] Already connected, skipping");
      return;
    }

    isConnectingRef.current = true;

    // Clean up any existing connection first
    if (wsClient.current) {
      wsClient.current.disconnect();
      wsClient.current = null;
    }

    const wsUrl = process.env.NEXT_PUBLIC_BACKEND_WS_URL || "ws://localhost:3001/ws";

    try {
      wsClient.current = new WebSocketClient(wsUrl, sessionId.current, conversationIdRef.current);

      // Handle partial responses (streaming)
      wsClient.current.on("partial_response", (message: WSMessage) => {
        setIsThinking(false); // First token received, no longer thinking
        setIsLoading(true);

        setMessages((prev) => {
          const lastMessage = prev[prev.length - 1];

          // If last message is a partial from assistant, update it
          if (lastMessage?.role === "assistant" && lastMessage.isPartial) {
            return [
              ...prev.slice(0, -1),
              {
                ...lastMessage,
                content: message.text || "",
              },
            ];
          }

          // Otherwise, create a new partial message
          const messageId = `msg-${Date.now()}-${messageCounter.current++}`;
          currentMessageId.current = messageId;

          return [
            ...prev,
            {
              id: messageId,
              role: "assistant",
              content: message.text || "",
              timestamp: new Date(),
              isPartial: true,
            },
          ];
        });
      });

      // Handle final response
      wsClient.current.on("final_response", (message: WSMessage) => {
        setIsLoading(false);

        setMessages((prev) => {
          const lastMessage = prev[prev.length - 1];

          if (lastMessage?.role === "assistant" && lastMessage.isPartial) {
            return [
              ...prev.slice(0, -1),
              {
                ...lastMessage,
                content: message.text || lastMessage.content,
                isPartial: false,
                sources: message.sources || currentSourcesRef.current,
              },
            ];
          }

          return prev;
        });

        setCurrentSources([]);
        currentMessageId.current = null;
      });

      // Handle RAG sources
      wsClient.current.on("rag_sources", (message: WSMessage) => {
        if (message.sources) {
          setCurrentSources(message.sources);
        }
      });

      // Handle conversation created
      wsClient.current.on("conversation_created", (message: WSMessage) => {
        if (message.data?.conversation_id) {
          setConversationId(message.data.conversation_id);
          console.log("[Realtime] Conversation created:", message.data.conversation_id);
        }
      });

      // Handle audio transcript from assistant during voice call
      wsClient.current.on("audio_transcript", (message: WSMessage) => {
        if (message.text) {
          console.log("[Realtime] Received audio_transcript:", {
            is_partial: message.is_partial,
            is_partial_type: typeof message.is_partial,
            text_length: message.text.length,
            text_preview: message.text.substring(0, 50)
          });

          setMessages((prev) => {
            // Find the last ASSISTANT message (not just the last message)
            // because user transcript might have been inserted after assistant started
            const lastAssistantIndex = prev.findLastIndex(msg =>
              msg.role === "assistant" && msg.isSpoken
            );
            const lastAssistantMessage = lastAssistantIndex >= 0 ? prev[lastAssistantIndex] : null;

            console.log("[Realtime] Last assistant message:", {
              exists: !!lastAssistantMessage,
              index: lastAssistantIndex,
              role: lastAssistantMessage?.role,
              isSpoken: lastAssistantMessage?.isSpoken,
              isPartial: lastAssistantMessage?.isPartial,
              content_preview: lastAssistantMessage?.content?.substring(0, 50)
            });

            // If this is a partial update and we have an existing partial assistant message
            if (message.is_partial && lastAssistantMessage?.isPartial) {
              console.log("[Realtime] Appending to existing partial message at index", lastAssistantIndex);
              // Append to existing message
              return [
                ...prev.slice(0, lastAssistantIndex),
                {
                  ...lastAssistantMessage,
                  content: lastAssistantMessage.content + message.text,
                },
                ...prev.slice(lastAssistantIndex + 1),
              ];
            }

            // If this is the final transcript and we have an assistant message
            if (!message.is_partial && lastAssistantMessage) {
              console.log("[Realtime] Replacing with final transcript at index", lastAssistantIndex);
              // Mark message as complete with full text
              return [
                ...prev.slice(0, lastAssistantIndex),
                {
                  ...lastAssistantMessage,
                  content: message.text, // Use full text from done event
                  isPartial: false,
                },
                ...prev.slice(lastAssistantIndex + 1),
              ];
            }

            // Otherwise create new spoken message
            console.log("[Realtime] Creating NEW assistant message");
            return [
              ...prev,
              {
                id: `msg-${Date.now()}-${messageCounter.current++}`,
                role: "assistant",
                content: message.text,
                timestamp: new Date(),
                isSpoken: true,
                isPartial: message.is_partial !== false, // Default to true if not specified
              },
            ];
          });
        }
      });

      // Handle user audio transcript during voice call
      wsClient.current.on("user_audio_transcript", (message: WSMessage) => {
        if (message.text) {
          pendingUserTranscriptRef.current = false;

          setMessages((prev) => {
            // Find the position to insert - before the first AI response after we started waiting
            // Look for the first assistant message that's partial or recent
            const firstAssistantIndex = prev.findIndex((msg, idx) => {
              return msg.role === "assistant" && msg.isSpoken && msg.isPartial;
            });

            const userMessage = {
              id: `msg-${Date.now()}-${messageCounter.current++}`,
              role: "user" as const,
              content: message.text,
              timestamp: new Date(),
              isSpoken: true,
            };

            // If we found an assistant message, insert user message before it
            if (firstAssistantIndex !== -1) {
              console.log(`[Realtime] Inserting user message at position ${firstAssistantIndex}`);
              return [
                ...prev.slice(0, firstAssistantIndex),
                userMessage,
                ...prev.slice(firstAssistantIndex),
              ];
            }

            // Otherwise just append (shouldn't happen in normal flow)
            return [...prev, userMessage];
          });
        }
      });

      // Handle voice call started
      wsClient.current.on("voice_call_started", (message: WSMessage) => {
        console.log("[Realtime] Voice call started");
      });

      // Handle voice call ended
      wsClient.current.on("voice_call_ended", (message: WSMessage) => {
        console.log("[Realtime] Voice call ended");
        // Mark last partial message as complete
        setMessages((prev) => {
          const lastMessage = prev[prev.length - 1];
          if (lastMessage?.isPartial) {
            return [
              ...prev.slice(0, -1),
              {
                ...lastMessage,
                isPartial: false,
              },
            ];
          }
          return prev;
        });
      });

      // Handle errors
      wsClient.current.on("error", (message: WSMessage) => {
        setIsLoading(false);
        setError(message.error || "An error occurred");
        console.error("[Realtime] Error:", message.error);
      });

      await wsClient.current.connect();
      setIsConnected(true);
      setError(null);
      isConnectingRef.current = false;
      console.log("[Realtime] Connected successfully");
    } catch (err) {
      console.error("[Realtime] Connection error:", err);
      setIsConnected(false);
      setError("Connection lost. Reconnecting...");
      isConnectingRef.current = false;

      // Retry connection after 2 seconds
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      reconnectTimeoutRef.current = setTimeout(() => {
        console.log("[Realtime] Attempting to reconnect...");
        connect();
      }, 2000);
    }
  }, []);

  /**
   * Disconnect from server
   */
  const disconnect = useCallback(() => {
    isConnectingRef.current = false;
    wsClient.current?.disconnect();
    setIsConnected(false);
  }, []);

  /**
   * Send a text message
   */
  const sendMessage = useCallback((text: string, useRAG = true) => {
    if (!wsClient.current?.isConnected()) {
      setError("Not connected to server");
      return;
    }

    // Add user message to chat
    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}-${messageCounter.current++}`,
      role: "user",
      content: text,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setError(null);
    setIsThinking(true); // Start thinking indicator

    // Send to server
    wsClient.current.send({
      type: "user_message",
      session_id: sessionId.current,
      text,
      use_rag: useRAG,
    });
  }, []);

  /**
   * Send an image for processing
   */
  const sendImage = useCallback((imageData: string, filename: string, caption?: string) => {
    if (!wsClient.current?.isConnected()) {
      setError("Not connected to server");
      return;
    }

    // Add image message to chat UI
    const imageMessage: ChatMessage = {
      id: `msg-${Date.now()}-${messageCounter.current++}`,
      role: "user",
      content: caption || "Sent an image",
      timestamp: new Date(),
      imageData,
      imageFilename: filename,
    };

    setMessages((prev) => [...prev, imageMessage]);
    setError(null);
    setIsThinking(true); // Start thinking indicator

    // Send to server
    wsClient.current.send({
      type: "upload_image_meta",
      session_id: sessionId.current,
      data: {
        image_data: imageData,
        filename,
        caption,
      },
    });
  }, []);

  /**
   * Start voice call
   */
  const startVoiceCall = useCallback(() => {
    if (!wsClient.current?.isConnected()) {
      setError("Not connected to server");
      return;
    }

    wsClient.current.send({
      type: "start_voice_call",
      session_id: sessionId.current,
    });
  }, []);

  /**
   * End voice call
   */
  const endVoiceCall = useCallback(() => {
    if (!wsClient.current?.isConnected()) {
      setError("Not connected to server");
      return;
    }

    wsClient.current.send({
      type: "end_voice_call",
      session_id: sessionId.current,
    });
  }, []);

  /**
   * Send audio chunk during voice call
   */
  const sendAudioChunk = useCallback((audioBase64: string) => {
    if (!wsClient.current?.isConnected()) {
      setError("Not connected to server");
      return;
    }

    wsClient.current.send({
      type: "audio_chunk",
      session_id: sessionId.current,
      audio: audioBase64,
    });
  }, []);

  /**
   * Manually commit audio buffer (when VAD is disabled)
   */
  const commitAudio = useCallback(() => {
    if (!wsClient.current?.isConnected()) {
      setError("Not connected to server");
      return;
    }

    console.log("[Realtime] Manually committing audio");
    pendingUserTranscriptRef.current = true; // Mark that we're waiting for transcript

    wsClient.current.send({
      type: "commit_audio",
      session_id: sessionId.current,
    });
  }, []);

  /**
   * Clear all messages
   */
  const clearMessages = useCallback(() => {
    setMessages([]);
    setCurrentSources([]);
    setError(null);
  }, []);

  // Auto-connect on mount (only once)
  useEffect(() => {
    let mounted = true;

    if (autoConnect && mounted) {
      console.log("[Realtime] Initial connection on mount");
      connect();
    }

    return () => {
      mounted = false;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty deps - only run once on mount

  // Handle page visibility changes (reconnect when tab becomes visible)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        // Tab became visible - check if we need to reconnect
        if (!wsClient.current?.isConnected() && !isConnectingRef.current) {
          console.log("[Realtime] Tab visible, reconnecting...");
          connect();
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty deps - connect function doesn't need to be a dependency

  // Ping to keep connection alive
  useEffect(() => {
    const pingInterval = setInterval(() => {
      if (wsClient.current?.isConnected()) {
        // Keep connection alive by checking state
        const stillConnected = wsClient.current.isConnected();
        if (!stillConnected && !isConnectingRef.current) {
          console.log("[Realtime] Connection lost, reconnecting...");
          setIsConnected(false);
          connect();
        }
      }
    }, 30000); // Check every 30 seconds

    return () => clearInterval(pingInterval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty deps - we don't want this to re-create the interval

  return {
    isConnected,
    messages,
    isLoading,
    isThinking,
    error,
    conversationId,
    sendMessage,
    sendImage,
    clearMessages,
    connect,
    disconnect,
    startVoiceCall,
    endVoiceCall,
    sendAudioChunk,
    commitAudio,
    wsClient: wsClient.current, // Expose for audio response handler
  };
}
