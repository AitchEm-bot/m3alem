"use client";

import { useState, useRef, useEffect } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChatMessage } from "@/components/ChatMessage";
import { Chatbar } from "@/components/Chatbar";
import { SourcesPanel } from "@/components/SourcesPanel";
import { M3alemSphere } from "@/components/M3alemSphere";
import { useRealtime } from "@/hooks/useRealtime";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

/**
 * Chat page - full chat interface with real-time conversation
 * Displays messages, sources panel, and chatbar
 */
export default function ChatPage() {
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const {
    isConnected,
    messages,
    isLoading,
    error,
    sendMessage,
    sendImage,
  } = useRealtime();

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Show error toast
  useEffect(() => {
    if (error) {
      toast({
        title: "Error",
        description: error,
        variant: "destructive",
      });
    }
  }, [error, toast]);

  const handleSendMessage = (text: string) => {
    sendMessage(text, true); // Enable RAG by default
  };

  const handleVoiceToggle = (active: boolean) => {
    setIsVoiceActive(active);
    if (active) {
      toast({
        title: "Voice Mode Active",
        description: "Speak now to ask M3alem a question",
      });
    }
  };

  const handleImageUpload = async (file: File) => {
    // Convert to base64
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      sendImage(base64, file.name);

      toast({
        title: "Image Uploaded",
        description: "Processing image...",
      });
    };
    reader.readAsDataURL(file);
  };

  // Get sources from the last assistant message
  const lastAssistantMessage = messages
    .slice()
    .reverse()
    .find((m) => m.role === "assistant" && !m.isPartial);

  const currentSources = lastAssistantMessage?.sources || [];

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Chat with M3alem</h1>
              <p className="text-sm text-muted-foreground">
                {isConnected ? (
                  <span className="flex items-center">
                    <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                    Connected
                  </span>
                ) : (
                  <span className="flex items-center">
                    <span className="w-2 h-2 bg-red-500 rounded-full mr-2"></span>
                    Disconnected
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Messages */}
        <div className="flex-1 flex flex-col">
          <ScrollArea className="flex-1 px-6">
            <div ref={scrollRef} className="container mx-auto max-w-4xl py-6 space-y-4">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-teal-light to-teal flex items-center justify-center mb-4">
                    <span className="text-4xl">🎓</span>
                  </div>
                  <h2 className="text-2xl font-bold mb-2">
                    Hi! I'm M3alem, your AI tutor
                  </h2>
                  <p className="text-muted-foreground max-w-md">
                    Ask me anything about your studies. I can help explain concepts,
                    solve problems, and provide examples from your textbooks.
                  </p>
                </div>
              ) : (
                messages.map((message) => (
                  <ChatMessage key={message.id} message={message} />
                ))
              )}

              {/* Loading indicator */}
              {isLoading && messages[messages.length - 1]?.role === "user" && (
                <div className="flex items-center space-x-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">M3alem is thinking...</span>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Chatbar */}
          <Chatbar
            onSendMessage={handleSendMessage}
            onVoiceToggle={handleVoiceToggle}
            onImageUpload={handleImageUpload}
            isVoiceActive={isVoiceActive}
            isLoading={isLoading}
          />
        </div>

        {/* Sources Panel - Right Sidebar */}
        {currentSources.length > 0 && (
          <div className="w-80 border-l bg-muted/20 p-4">
            <SourcesPanel sources={currentSources} />
          </div>
        )}
      </div>

      {/* Floating M3alem Sphere */}
      <M3alemSphere
        onVoiceToggle={handleVoiceToggle}
        isVoiceActive={isVoiceActive}
      />
    </div>
  );
}
