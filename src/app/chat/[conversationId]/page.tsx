import { ChatInterface } from "@/components/chat-interface";

interface ChatPageProps {
  params: Promise<{
    conversationId: string;
  }>;
}

export default async function ChatPage({ params }: ChatPageProps) {
  const { conversationId } = await params;
  return <ChatInterface conversationId={conversationId} />;
}
