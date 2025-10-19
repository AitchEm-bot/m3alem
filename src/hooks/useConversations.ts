"use client";

import { useState, useEffect, useCallback } from "react";
import { RAGSource } from "@/lib/wsClient";

export interface Conversation {
  id: string;
  title: string;
  created_at: Date;
  updated_at: Date;
  user_id?: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  role: "user" | "assistant";
  content: string;
  sources?: RAGSource[];
  image_data?: string;
  image_filename?: string;
  is_spoken?: boolean;
  created_at: Date;
}

export interface ConversationWithMessages extends Conversation {
  messages: Message[];
}

export function useConversations() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";

  /**
   * Fetch all conversations
   */
  const fetchConversations = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`${backendUrl}/api/conversations`);

      if (!response.ok) {
        throw new Error("Failed to fetch conversations");
      }

      const data = await response.json();

      // Convert date strings to Date objects
      const conversationsWithDates = data.conversations.map((conv: Conversation & { created_at: string; updated_at: string }) => ({
        ...conv,
        created_at: new Date(conv.created_at),
        updated_at: new Date(conv.updated_at),
      }));

      setConversations(conversationsWithDates);
      setError(null);
    } catch (err) {
      console.error("[useConversations] Error fetching conversations:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch conversations");
    } finally {
      setLoading(false);
    }
  }, [backendUrl]);

  /**
   * Fetch a specific conversation with its messages
   */
  const fetchConversation = useCallback(async (id: string): Promise<ConversationWithMessages | null> => {
    try {
      const response = await fetch(`${backendUrl}/api/conversations/${id}`);

      if (!response.ok) {
        throw new Error("Failed to fetch conversation");
      }

      const data = await response.json();

      // Convert date strings to Date objects
      return {
        ...data,
        created_at: new Date(data.created_at),
        updated_at: new Date(data.updated_at),
        messages: data.messages.map((msg: Message & { created_at: string }) => ({
          ...msg,
          created_at: new Date(msg.created_at),
        })),
      };
    } catch (err) {
      console.error("[useConversations] Error fetching conversation:", err);
      return null;
    }
  }, [backendUrl]);

  /**
   * Create a new conversation
   */
  const createConversation = useCallback(async (title: string): Promise<Conversation | null> => {
    try {
      const response = await fetch(`${backendUrl}/api/conversations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });

      if (!response.ok) {
        throw new Error("Failed to create conversation");
      }

      const data = await response.json();

      const newConversation = {
        ...data,
        created_at: new Date(data.created_at),
        updated_at: new Date(data.updated_at),
      };

      // Add to local state
      setConversations((prev) => [newConversation, ...prev]);

      return newConversation;
    } catch (err) {
      console.error("[useConversations] Error creating conversation:", err);
      return null;
    }
  }, [backendUrl]);

  /**
   * Update conversation title
   */
  const updateConversation = useCallback(async (id: string, title: string): Promise<boolean> => {
    try {
      const response = await fetch(`${backendUrl}/api/conversations/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });

      if (!response.ok) {
        throw new Error("Failed to update conversation");
      }

      const data = await response.json();

      // Update local state
      setConversations((prev) =>
        prev.map((conv) =>
          conv.id === id
            ? {
                ...data,
                created_at: new Date(data.created_at),
                updated_at: new Date(data.updated_at),
              }
            : conv
        )
      );

      return true;
    } catch (err) {
      console.error("[useConversations] Error updating conversation:", err);
      return false;
    }
  }, [backendUrl]);

  /**
   * Delete a conversation
   */
  const deleteConversation = useCallback(async (id: string): Promise<boolean> => {
    try {
      const response = await fetch(`${backendUrl}/api/conversations/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete conversation");
      }

      // Remove from local state
      setConversations((prev) => prev.filter((conv) => conv.id !== id));

      return true;
    } catch (err) {
      console.error("[useConversations] Error deleting conversation:", err);
      return false;
    }
  }, [backendUrl]);

  // Fetch conversations on mount
  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  return {
    conversations,
    loading,
    error,
    fetchConversations,
    fetchConversation,
    createConversation,
    updateConversation,
    deleteConversation,
  };
}
