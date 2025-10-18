"use client";

import { useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn, formatRelativeTime } from "@/lib/utils";
import { Bot, User, Copy, Check } from "lucide-react";
import { ChatMessage as ChatMessageType } from "@/hooks/useRealtime";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import rehypeRaw from "rehype-raw";
import rehypeHighlight from "rehype-highlight";
import "katex/dist/katex.min.css";
import "highlight.js/styles/github.css";

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
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy text:", err);
    }
  };

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
          <div className={cn("flex items-center justify-between", isUser && "flex-row-reverse")}>
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
            {!isUser && !isPartial && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={handleCopy}
                title={copied ? "Copied!" : "Copy message"}
              >
                {copied ? (
                  <Check className="h-3 w-3 text-teal" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
              </Button>
            )}
          </div>

          <div
            className={cn(
              "text-sm leading-relaxed break-words rounded-2xl px-4 py-3",
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

            {/* Render markdown and LaTeX */}
            <div className="prose prose-sm max-w-none dark:prose-invert">
              <ReactMarkdown
                remarkPlugins={[remarkGfm, remarkMath]}
                rehypePlugins={[rehypeKatex, rehypeRaw, rehypeHighlight]}
                components={{
                // Style strong text with teal accent
                strong: ({ node, ...props }) => (
                  <strong className="font-bold text-teal" {...props} />
                ),
                // Style emphasis with teal accent
                em: ({ node, ...props }) => (
                  <em className="italic text-teal/80" {...props} />
                ),
                // Style headings with teal accent
                h1: ({ node, ...props }) => (
                  <h1 className="text-2xl font-bold text-teal mt-4 mb-2" {...props} />
                ),
                h2: ({ node, ...props }) => (
                  <h2 className="text-xl font-semibold text-teal mt-3 mb-2" {...props} />
                ),
                h3: ({ node, ...props }) => (
                  <h3 className="text-lg font-semibold text-teal mt-2 mb-1" {...props} />
                ),
                // Style code blocks
                code: ({ node, inline, className, children, ...props }: any) => {
                  if (inline) {
                    return (
                      <code
                        className="bg-mint/30 text-teal px-1.5 py-0.5 rounded font-mono text-xs"
                        {...props}
                      >
                        {children}
                      </code>
                    );
                  }
                  return (
                    <code
                      className={cn("block bg-mint/10 p-3 rounded-lg overflow-x-auto font-mono text-xs", className)}
                      {...props}
                    >
                      {children}
                    </code>
                  );
                },
                // Style pre blocks
                pre: ({ node, ...props }) => (
                  <pre className="bg-mint/10 p-3 rounded-lg overflow-x-auto my-2" {...props} />
                ),
                // Style lists
                ul: ({ node, ...props }) => (
                  <ul className="list-disc list-inside my-2 space-y-1" {...props} />
                ),
                ol: ({ node, ...props }) => (
                  <ol className="list-decimal list-inside my-2 space-y-1" {...props} />
                ),
                // Style blockquotes
                blockquote: ({ node, ...props }) => (
                  <blockquote className="border-l-4 border-teal pl-4 italic my-2" {...props} />
                ),
                // Style links
                a: ({ node, ...props }) => (
                  <a className="text-teal hover:underline" {...props} />
                ),
                // Style paragraphs
                p: ({ node, ...props }) => (
                  <p className="my-2 leading-relaxed" {...props} />
                ),
              }}
              >
                {message.content}
              </ReactMarkdown>
            </div>
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
