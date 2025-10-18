"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Navigation } from "@/components/navigation"
import { FloatingSphere } from "@/components/floating-sphere"
import { ConversationList } from "@/components/ConversationList"
import { useConversations } from "@/hooks/useConversations"
import { Flame, BookOpen, Clock, Sparkles } from "lucide-react"
import Link from "next/link"

export function Dashboard() {
  const [userName] = useState("Sarah")
  const [streak] = useState(7)
  const { conversations, loading } = useConversations()

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <main className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Welcome Section */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold mb-2 text-balance">Welcome back, {userName}! 👋</h1>
          <p className="text-muted-foreground text-lg">Ready to continue your learning journey?</p>
        </div>

        {/* Main Ask M3alem Section */}
        <Link href="/chat" className="block mb-8">
          <Card className="p-12 text-center shadow-lg border-2 border-accent/20 hover:border-accent/50 transition-all duration-300 cursor-pointer hover:shadow-2xl hover:scale-[1.02] active:scale-[0.98]">
            <div className="flex flex-col items-center gap-6">
              <div className="relative">
                <div className="w-32 h-32 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center pulse-glow float-animation">
                  <Sparkles className="w-16 h-16 text-white" />
                </div>
              </div>
              <div>
                <h2 className="text-3xl font-bold mb-2">Ask M3alem</h2>
                <p className="text-muted-foreground mb-6">Start a conversation with your AI tutor</p>
              </div>
              <Button
                size="lg"
                className="bg-primary hover:bg-primary/90 text-white px-8 py-6 text-lg rounded-xl shadow-lg"
              >
                Start Learning
              </Button>
            </div>
          </Card>
        </Link>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Learning Streak */}
          <Card className="p-6 shadow-md hover:shadow-lg transition-shadow border border-accent/20">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-xl bg-accent/20">
                <Flame className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Learning Streak</p>
                <p className="text-3xl font-bold text-primary">{streak} days</p>
                <p className="text-xs text-muted-foreground mt-1">Keep it up!</p>
              </div>
            </div>
          </Card>

          {/* Total Conversations */}
          <Card className="p-6 shadow-md hover:shadow-lg transition-shadow border border-accent/20">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-xl bg-accent/20">
                <BookOpen className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-muted-foreground mb-1">Total Conversations</p>
                <p className="text-3xl font-bold text-primary">
                  {loading ? "..." : conversations.length}
                </p>
                <p className="text-xs text-muted-foreground mt-1">All time</p>
              </div>
            </div>
          </Card>

          {/* Continue Learning */}
          <Card className="p-6 shadow-md hover:shadow-lg transition-shadow border border-accent/20">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-xl bg-accent/20">
                <Clock className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-muted-foreground mb-1">Continue Learning</p>
                {loading ? (
                  <p className="text-sm">Loading...</p>
                ) : conversations.length > 0 ? (
                  <>
                    <p className="text-lg font-semibold truncate">{conversations[0].title}</p>
                    <Link href={`/chat/${conversations[0].id}`}>
                      <Button variant="link" className="text-primary p-0 h-auto mt-1">
                        Resume →
                      </Button>
                    </Link>
                  </>
                ) : (
                  <Link href="/chat">
                    <Button variant="link" className="text-primary p-0 h-auto">
                      Start chatting →
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          </Card>
        </div>

        {/* Recent Conversations */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold">Recent Conversations</h3>
            {conversations.length > 3 && (
              <Link href="/chat">
                <Button variant="link" className="text-primary">
                  View all →
                </Button>
              </Link>
            )}
          </div>
          <ConversationList conversations={conversations} maxItems={3} />
        </div>
      </main>

      <FloatingSphere />
    </div>
  )
}
