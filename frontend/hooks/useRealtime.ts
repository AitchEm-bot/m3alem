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
}

export interface UseRealtimeOptions {
  autoConnect?: boolean;
}

export function useRealtime(options: UseRealtimeOptions = {}) {
  const { autoConnect = true } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentSources, setCurrentSources] = useState<RAGSource[]>([]);
  const [error, setError] = useState<string | null>(null);

  const wsClient = useRef<WebSocketClient | null>(null);
  const sessionId = useRef<string>(generateSessionId());
  const currentMessageId = useRef<string | null>(null);

  /**
   * Initialize WebSocket connection
   */
  const connect = useCallback(async () => {
    const wsUrl = process.env.NEXT_PUBLIC_BACKEND_WS_URL || "ws://localhost:3001";

    wsClient.current = new WebSocketClient(wsUrl, sessionId.current);

    // Handle partial responses (streaming)
    wsClient.current.on("partial_response", (message: WSMessage) => {
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
              sources: message.sources || currentSources,
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

    // Handle errors
    wsClient.current.on("error", (message: WSMessage) => {
      setIsLoading(false);
      setError(message.error || "An error occurred");
      console.error("[Realtime] Error:", message.error);
    });

    try {
      await wsClient.current.connect();
      setIsConnected(true);
      setError(null);
    } catch (err) {
      setError("Failed to connect to server");
      console.error("[Realtime] Connection error:", err);
    }
  }, [currentSources]);

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
  const sendImage = useCallback((imageData: string, filename: string) => {
    if (!wsClient.current?.isConnected()) {
      setError("Not connected to server");
      return;
    }

    wsClient.current.send({
      type: "upload_image_meta",
      session_id: sessionId.current,
      data: {
        image_data: imageData,
        filename,
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
      disconnect();
    };
  }, [autoConnect, connect, disconnect]);

  return {
    isConnected,
    messages,
    isLoading,
    error,
    sendMessage,
    sendImage,
    clearMessages,
    connect,
    disconnect,
  };
}
