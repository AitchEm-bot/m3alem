"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn, formatRelativeTime } from "@/lib/utils";
import { Bot, User } from "lucide-react";
import { ChatMessage as ChatMessageType } from "@/hooks/useRealtime";

interface ChatMessageProps {
  message: ChatMessageType;
  className?: string;
}

/**
 * Chat message component displaying user or assistant messages
 * Supports streaming (partial) messages
 */
export function ChatMessage({ message, className }: ChatMessageProps) {
  const isUser = message.role === "user";
  const isPartial = message.isPartial;

  return (
    <div
      className={cn(
        "flex gap-3 p-3",
        isUser ? "justify-end" : "justify-start",
        className
      )}
    >
      <div className={cn("flex gap-3 max-w-[80%]", isUser && "flex-row-reverse")}>
        {/* Avatar */}
        <Avatar className="flex-shrink-0 h-8 w-8">
          <AvatarFallback
            className={cn(
              isUser
                ? "bg-primary text-primary-foreground"
                : "bg-teal text-white"
            )}
          >
            {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
          </AvatarFallback>
        </Avatar>

        {/* Message Content */}
        <div className="space-y-2 min-w-0">
          <div className={cn("flex items-center space-x-2", isUser && "flex-row-reverse space-x-reverse")}>
            <span className="font-medium text-sm">
              {isUser ? "You" : "M3alem"}
            </span>
            <span className="text-xs text-muted-foreground">
              {formatRelativeTime(message.timestamp)}
            </span>
            {isPartial && (
              <span className="text-xs text-teal font-medium">typing...</span>
            )}
          </div>

          <div
            className={cn(
              "text-sm leading-relaxed whitespace-pre-wrap break-words rounded-2xl px-4 py-3",
              isUser
                ? "bg-primary text-primary-foreground"
                : "bg-muted"
            )}
          >
            {/* Display image if present */}
            {message.imageData && (
              <div className="mb-2">
                <img
                  src={message.imageData}
                  alt={message.imageFilename || "Uploaded image"}
                  className="max-w-xs rounded-lg border border-border"
                />
              </div>
            )}
            {message.content}
          </div>

          {/* Loading indicator for partial messages */}
          {isPartial && !isUser && (
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-teal rounded-full animate-bounce"></div>
              <div
                className="w-2 h-2 bg-teal rounded-full animate-bounce"
                style={{ animationDelay: "0.1s" }}
              ></div>
              <div
                className="w-2 h-2 bg-teal rounded-full animate-bounce"
                style={{ animationDelay: "0.2s" }}
              ></div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
