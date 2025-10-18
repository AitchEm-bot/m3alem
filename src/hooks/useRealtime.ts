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

  // Load initial messages when provided
  useEffect(() => {
    if (initialMessages.length > 0 && messages.length === 0) {
      console.log("[Realtime] Loading initial messages:", initialMessages.length);
      setMessages(initialMessages);
    }
  }, [initialMessages]); // Update when initialMessages changes

  /**
   * Initialize WebSocket connection
   */
  const connect = useCallback(async () => {
    // Clean up any existing connection first
    if (wsClient.current) {
      wsClient.current.disconnect();
      wsClient.current = null;
    }

    const wsUrl = process.env.NEXT_PUBLIC_BACKEND_WS_URL || "ws://localhost:3001";

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
          const messageId = `msg-${Date.now()}`;
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

      // Handle errors
      wsClient.current.on("error", (message: WSMessage) => {
        setIsLoading(false);
        setError(message.error || "An error occurred");
        console.error("[Realtime] Error:", message.error);
      });

      await wsClient.current.connect();
      setIsConnected(true);
      setError(null);
      console.log("[Realtime] Connected successfully");
    } catch (err) {
      console.error("[Realtime] Connection error:", err);
      setIsConnected(false);
      setError("Connection lost. Reconnecting...");

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
      id: `msg-${Date.now()}`,
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
      id: `msg-${Date.now()}`,
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
   * Clear all messages
   */
  const clearMessages = useCallback(() => {
    setMessages([]);
    setCurrentSources([]);
    setError(null);
  }, []);

  // Auto-connect on mount
  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoConnect]); // Only reconnect when autoConnect changes, not when connect/disconnect functions change

  // Handle page visibility changes (reconnect when tab becomes visible)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        // Tab became visible - check if we need to reconnect
        if (!wsClient.current?.isConnected()) {
          console.log("[Realtime] Tab visible, reconnecting...");
          connect();
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [connect]);

  // Ping to keep connection alive
  useEffect(() => {
    const pingInterval = setInterval(() => {
      if (wsClient.current?.isConnected()) {
        // Keep connection alive by checking state
        const stillConnected = wsClient.current.isConnected();
        if (!stillConnected && isConnected) {
          console.log("[Realtime] Connection lost, reconnecting...");
          setIsConnected(false);
          connect();
        }
      }
    }, 30000); // Check every 30 seconds

    return () => clearInterval(pingInterval);
  }, [isConnected, connect]);

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
  };
}
