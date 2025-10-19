"use client"

import { useEffect, useRef, useState } from "react"
import { Card } from "@/components/ui/card"
import { Navigation } from "@/components/navigation"
import { FloatingSphere } from "@/components/floating-sphere"
import { ChatMessage } from "@/components/ChatMessage"
import { Chatbar } from "@/components/Chatbar"
import { SourcesPanel } from "@/components/SourcesPanel"
import { ConversationSidebar } from "@/components/ConversationSidebar"
import { useRealtime, ChatMessage as ChatMessageType } from "@/hooks/useRealtime"
import { useConversations } from "@/hooks/useConversations"
import { useSTT } from "@/hooks/useSTT"
import { useVoiceCall } from "@/hooks/useVoiceCall"
import { Sparkles } from "lucide-react"
import { useRouter } from "next/navigation"

interface ChatInterfaceProps {
  conversationId?: string | null;
}

export function ChatInterface({ conversationId = null }: ChatInterfaceProps) {
  const router = useRouter()
  const { conversations, loading: conversationsLoading, fetchConversation, deleteConversation } = useConversations()
  const [initialMessages, setInitialMessages] = useState<ChatMessageType[]>([])
  const [isLoadingConversation, setIsLoadingConversation] = useState(false)

  // Load existing conversation messages if conversationId is provided
  useEffect(() => {
    if (conversationId) {
      setIsLoadingConversation(true)
      fetchConversation(conversationId).then((conv) => {
        if (conv) {
          console.log("[ChatInterface] Loaded conversation with", conv.messages.length, "messages")
          const formattedMessages: ChatMessageType[] = conv.messages.map((msg) => ({
            id: msg.id,
            role: msg.role,
            content: msg.content,
            timestamp: new Date(msg.created_at),
            sources: msg.sources,
            imageData: msg.image_data,
            imageFilename: msg.image_filename,
            isPartial: false,
            isSpoken: msg.is_spoken,
          }))
          console.log("[ChatInterface] Setting initial messages:", formattedMessages)
          setInitialMessages(formattedMessages)
        }
        setIsLoadingConversation(false)
      })
    } else {
      setInitialMessages([])
    }
  }, [conversationId, fetchConversation])

  const {
    isConnected,
    messages,
    isLoading,
    isThinking,
    error,
    conversationId: currentConversationId,
    sendMessage,
    sendImage,
    startVoiceCall,
    endVoiceCall,
    sendAudioChunk,
    commitAudio,
    wsClient,
  } = useRealtime({
    conversationId,
    initialMessages,
  })

  // Get sources from the last assistant message if available
  const latestSources = messages
    .filter((msg) => msg.role === "assistant" && msg.sources)
    .slice(-1)[0]?.sources || []

  // Initialize STT hook for mic button
  const {
    isRecording,
    transcript,
    toggleRecording,
    clearTranscript,
  } = useSTT()

  // Initialize voice call hook
  const {
    isCallActive,
    isSpeaking,
    error: voiceError,
    startCall,
    endCall,
    handleAudioResponse,
  } = useVoiceCall({
    onAudioResponse: (audioBase64) => {
      // Audio playback handled internally by useVoiceCall
    },
    onTranscript: (text, isUser) => {
      // Transcripts are handled by useRealtime via WebSocket
    },
    onError: (error) => {
      console.error("[Voice] Error:", error);
    },
  })

  // Set up audio response handler when wsClient is available
  useEffect(() => {
    if (!wsClient) return;

    const audioHandler = (message: any) => {
      if (message.audio) {
        console.log("[ChatInterface] Received audio response, chunk length:", message.audio.length);
        handleAudioResponse(message.audio);
      }
    };

    // Register handler
    wsClient.on("audio_response", audioHandler);

    // Cleanup: remove handler when component unmounts or dependencies change
    return () => {
      wsClient.off("audio_response", audioHandler);
      console.log("[ChatInterface] Cleaned up audio response handler");
    };
  }, [wsClient, handleAudioResponse])

  const handleVoiceToggle = (isActive: boolean) => {
    // Legacy voice mode - not used anymore
    console.log("Voice mode:", isActive ? "activated" : "deactivated")
  }

  const handleMicClick = () => {
    if (isRecording) {
      // Stop recording and send transcript as message
      toggleRecording()
      if (transcript) {
        sendMessage(transcript)
        clearTranscript()
      }
    } else {
      // Start recording
      toggleRecording()
    }
  }

  const handleCallToggle = async (shouldStart: boolean) => {
    if (shouldStart) {
      // Start voice call
      startVoiceCall() // Send WS message to backend
      await startCall(sendAudioChunk) // Start local audio capture
    } else {
      // End voice call
      endVoiceCall() // Send WS message to backend
      endCall() // Stop local audio capture
    }
  }

  const handleManualCommit = () => {
    console.log("[ChatInterface] Manual commit triggered");
    commitAudio();
  }

  const handleImageUpload = (file: File, caption?: string) => {
    // Convert image to base64 and send
    const reader = new FileReader()
    reader.onloadend = () => {
      const base64Data = reader.result as string
      sendImage(base64Data, file.name, caption)
    }
    reader.readAsDataURL(file)
  }

  const handleNewChat = () => {
    router.push("/chat")
  }

  return (
    <div className="flex h-screen flex-col bg-background">
      <Navigation />

      <div className="flex flex-1 overflow-hidden">
        {/* Conversation Sidebar */}
        <ConversationSidebar
          conversations={conversations}
          currentConversationId={currentConversationId}
          onNewChat={handleNewChat}
          onDeleteConversation={deleteConversation}
          loading={conversationsLoading}
        />

        {/* Main Chat Area */}
        <main className="flex-1 flex flex-col px-4 py-8 max-w-6xl mx-auto w-full">
        {/* Learning Streak Badge */}
        <div className="flex justify-end mb-4">
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-accent/20 border border-accent">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">7 day streak</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 flex-1 overflow-hidden min-h-0">
          {/* Chat Container */}
          <div className="lg:col-span-3 flex flex-col min-h-0">
            <Card className="shadow-xl border-2 border-accent/20 flex flex-col h-full">
              {/* Connection Status */}
              {!isConnected && (
                <div className="bg-yellow-50 border-b border-yellow-200 px-4 py-2 text-sm text-yellow-800">
                  Connecting to M3alem...
                </div>
              )}

              {/* Error Display */}
              {error && (
                <div className="bg-red-50 border-b border-red-200 px-4 py-2 text-sm text-red-800">
                  {error}
                </div>
              )}

              {/* Messages Area */}
              <div className="flex-1 min-h-0 overflow-y-scroll p-4">
                {isLoadingConversation ? (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-muted-foreground">Loading conversation...</p>
                  </div>
                ) : messages.length === 0 && isConnected ? (
                  <div className="flex items-center justify-center h-full text-center">
                    <div className="space-y-4 max-w-md">
                      <div className="text-6xl">👋</div>
                      <h3 className="text-2xl font-semibold text-primary">
                        Welcome to M3alem!
                      </h3>
                      <p className="text-muted-foreground">
                        Your AI tutor is ready to help you learn. Ask any
                        question and I'll provide detailed explanations with
                        references to your textbooks.
                      </p>
                    </div>
                  </div>
                ) : null}

                <div className="space-y-2">
                  {messages.map((message) => (
                    <ChatMessage key={message.id} message={message} />
                  ))}

                  {/* Thinking indicator */}
                  {isThinking && (
                    <div className="flex gap-3 p-3">
                      <div className="flex gap-3 max-w-[80%]">
                        <div className="flex-shrink-0 h-8 w-8 rounded-full bg-teal/20 flex items-center justify-center">
                          <span className="text-teal text-sm">🤔</span>
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2">
                            <span className="font-medium text-sm">M3alem</span>
                            <span className="text-xs text-teal">thinking...</span>
                          </div>
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
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Input Area */}
              <Chatbar
                onSendMessage={sendMessage}
                onVoiceToggle={handleVoiceToggle}
                onImageUpload={handleImageUpload}
                onMicClick={handleMicClick}
                onCallToggle={handleCallToggle}
                onManualCommit={handleManualCommit}
                isRecording={isRecording}
                isCallActive={isCallActive}
                isLoading={isLoading}
              />
            </Card>
          </div>

          {/* Sources Panel */}
          <div className="lg:col-span-1">
            <SourcesPanel sources={latestSources} />
          </div>
        </div>
        </main>
      </div>

      <FloatingSphere />
    </div>
  )
}
