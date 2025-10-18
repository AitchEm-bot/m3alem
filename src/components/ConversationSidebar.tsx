"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Plus, MessageSquare, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { Conversation } from "@/hooks/useConversations";
import { useRouter } from "next/navigation";

interface ConversationSidebarProps {
  conversations: Conversation[];
  currentConversationId?: string | null;
  onNewChat: () => void;
  onDeleteConversation: (id: string) => void;
  loading?: boolean;
}

export function ConversationSidebar({
  conversations,
  currentConversationId,
  onNewChat,
  onDeleteConversation,
  loading = false,
}: ConversationSidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const router = useRouter();

  const handleConversationClick = (id: string) => {
    router.push(`/chat/${id}`);
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation(); // Prevent navigation when clicking delete
    if (confirm("Are you sure you want to delete this conversation?")) {
      onDeleteConversation(id);
      if (currentConversationId === id) {
        router.push("/chat");
      }
    }
  };

  return (
    <div
      className={cn(
        "relative bg-muted/30 border-r border-border transition-all duration-300",
        isCollapsed ? "w-16" : "w-64"
      )}
    >
      {/* Collapse/Expand Button */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute -right-3 top-4 z-10 h-6 w-6 rounded-full border bg-background shadow-md"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        {isCollapsed ? (
          <ChevronRight className="h-4 w-4" />
        ) : (
          <ChevronLeft className="h-4 w-4" />
        )}
      </Button>

      <div className="flex h-full flex-col">
        {/* Header */}
        <div className="p-4 border-b">
          <Button
            onClick={onNewChat}
            className={cn(
              "w-full",
              isCollapsed && "px-2"
            )}
            size={isCollapsed ? "icon" : "default"}
          >
            <Plus className="h-4 w-4" />
            {!isCollapsed && <span className="ml-2">New Chat</span>}
          </Button>
        </div>

        {/* Conversations List */}
        <ScrollArea className="flex-1 px-2 py-4">
          {loading ? (
            <div className="text-center text-sm text-muted-foreground py-8">
              {!isCollapsed && "Loading..."}
            </div>
          ) : conversations.length === 0 ? (
            <div className="text-center text-sm text-muted-foreground py-8">
              {!isCollapsed && "No conversations yet"}
            </div>
          ) : (
            <div className="space-y-2">
              {conversations.map((conversation) => (
                <div
                  key={conversation.id}
                  className={cn(
                    "group relative w-full text-left px-3 py-2 rounded-lg transition-colors cursor-pointer",
                    "hover:bg-muted",
                    currentConversationId === conversation.id &&
                      "bg-primary/10 border border-primary/20",
                    isCollapsed && "px-2"
                  )}
                  onClick={() => handleConversationClick(conversation.id)}
                  title={isCollapsed ? conversation.title : undefined}
                >
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                    {!isCollapsed && (
                      <>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {conversation.title}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatDate(conversation.updated_at)}
                          </p>
                        </div>
                        <button
                          className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity inline-flex items-center justify-center rounded-md hover:bg-accent hover:text-accent-foreground"
                          onClick={(e) => handleDelete(e, conversation.id)}
                          aria-label="Delete conversation"
                        >
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>
    </div>
  );
}

function formatDate(date: Date): string {
  const now = new Date();
  const diffInMs = now.getTime() - date.getTime();
  const diffInHours = diffInMs / (1000 * 60 * 60);
  const diffInDays = diffInMs / (1000 * 60 * 60 * 24);

  if (diffInHours < 1) {
    return "Just now";
  } else if (diffInHours < 24) {
    return `${Math.floor(diffInHours)}h ago`;
  } else if (diffInDays < 7) {
    return `${Math.floor(diffInDays)}d ago`;
  } else {
    return date.toLocaleDateString();
  }
}
