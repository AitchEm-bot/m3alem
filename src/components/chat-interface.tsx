"use client"

import type React from "react"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Navigation } from "@/components/navigation"
import { FloatingSphere } from "@/components/floating-sphere"
import { Send, Mic, Upload, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"

interface Message {
  id: string
  content: string
  sender: "user" | "ai"
  timestamp: Date
}

export function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      content: "Hi! I'm M3alem, your AI tutor. How can I help you learn today?",
      sender: "ai",
      timestamp: new Date(),
    },
  ])
  const [inputValue, setInputValue] = useState("")
  const [isRecording, setIsRecording] = useState(false)

  const handleSend = () => {
    if (!inputValue.trim()) return

    const newMessage: Message = {
      id: Date.now().toString(),
      content: inputValue,
      sender: "user",
      timestamp: new Date(),
    }

    setMessages([...messages, newMessage])
    setInputValue("")

    // Simulate AI response
    setTimeout(() => {
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        content: "I understand you're asking about that topic. Let me help you break it down step by step...",
        sender: "ai",
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, aiResponse])
    }, 1000)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Learning Streak Badge */}
        <div className="flex justify-end mb-4">
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-accent/20 border border-accent">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">7 day streak</span>
          </div>
        </div>

        {/* Chat Container */}
        <Card className="shadow-xl border-2 border-accent/20 overflow-hidden">
          {/* Messages Area */}
          <div className="h-[500px] overflow-y-auto p-6 space-y-4">
            {messages.map((message) => (
              <div key={message.id} className={cn("flex", message.sender === "user" ? "justify-end" : "justify-start")}>
                <div
                  className={cn(
                    "max-w-[80%] rounded-2xl px-4 py-3 shadow-sm",
                    message.sender === "user"
                      ? "bg-white border-2 border-accent text-foreground"
                      : "bg-gradient-to-br from-primary to-accent text-white pulse-glow",
                  )}
                >
                  <p className="text-sm leading-relaxed">{message.content}</p>
                  <p
                    className={cn(
                      "text-xs mt-1",
                      message.sender === "user" ? "text-muted-foreground" : "text-white/70",
                    )}
                  >
                    {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Input Area */}
          <div className="border-t border-border bg-muted/30 p-4">
            <div className="flex items-end gap-3">
              {/* Upload Button */}
              <Button
                variant="outline"
                size="icon"
                className="shrink-0 rounded-xl border-accent/40 hover:bg-accent/20 hover:border-accent bg-transparent"
              >
                <Upload className="w-5 h-5 text-primary" />
              </Button>

              {/* Text Input */}
              <div className="flex-1 relative">
                <Input
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ask M3alem anything..."
                  className="rounded-xl border-accent/40 focus:border-accent pr-12 py-6"
                />
              </div>

              {/* Mic Button */}
              <Button
                variant="outline"
                size="icon"
                className={cn(
                  "shrink-0 rounded-xl border-accent/40 hover:bg-accent/20 hover:border-accent transition-all",
                  isRecording && "bg-primary text-white border-primary",
                )}
                onClick={() => setIsRecording(!isRecording)}
              >
                <Mic className="w-5 h-5" />
              </Button>

              {/* Send Button */}
              <Button
                size="icon"
                className="shrink-0 rounded-xl bg-primary hover:bg-primary/90 text-white shadow-lg"
                onClick={handleSend}
              >
                <Send className="w-5 h-5" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2 text-center">
              Press Enter to send • Shift + Enter for new line
            </p>
          </div>
        </Card>
      </main>

      <FloatingSphere />
    </div>
  )
}
