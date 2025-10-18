"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageSquare, Clock } from "lucide-react";
import { Conversation } from "@/hooks/useConversations";
import { formatRelativeTime } from "@/lib/utils";
import Link from "next/link";

interface ConversationListProps {
  conversations: Conversation[];
  maxItems?: number;
}

export function ConversationList({ conversations, maxItems }: ConversationListProps) {
  const displayedConversations = maxItems
    ? conversations.slice(0, maxItems)
    : conversations;

  if (conversations.length === 0) {
    return (
      <Card className="p-8 text-center">
        <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
        <h3 className="text-lg font-semibold mb-2">No conversations yet</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Start chatting with M3alem to see your conversation history here
        </p>
        <Link href="/chat">
          <Button>Start Your First Chat</Button>
        </Link>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {displayedConversations.map((conversation) => (
        <Link key={conversation.id} href={`/chat/${conversation.id}`}>
          <Card className="p-4 hover:border-accent hover:shadow-md transition-all cursor-pointer">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <div className="p-2 rounded-lg bg-accent/20">
                  <MessageSquare className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium truncate">{conversation.title}</h4>
                  <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>{formatRelativeTime(conversation.updated_at)}</span>
                  </div>
                </div>
              </div>
              <Button variant="ghost" size="sm" className="ml-2">
                Resume
              </Button>
            </div>
          </Card>
        </Link>
      ))}
    </div>
  );
}
