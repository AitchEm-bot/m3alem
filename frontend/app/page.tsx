"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, BookOpen, Clock, TrendingUp } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LearningStreak } from "@/components/LearningStreak";
import { M3alemSphere } from "@/components/M3alemSphere";

/**
 * Home/Dashboard page
 * Shows greeting, learning streak, recent topics, and continue learning cards
 */
export default function HomePage() {
  const router = useRouter();
  const [isVoiceActive, setIsVoiceActive] = useState(false);

  // Mock data - in production, this would come from an API
  const currentStreak = 7;
  const longestStreak = 14;
  const userName = "Student";

  const recentTopics = [
    { title: "Newton's Laws of Motion", subject: "Physics", progress: 75 },
    { title: "Quadratic Equations", subject: "Mathematics", progress: 60 },
    { title: "Chemical Bonding", subject: "Chemistry", progress: 40 },
  ];

  const continuelearning = [
    {
      title: "IB Physics - Mechanics",
      description: "Continue with Chapter 3: Forces and Motion",
      icon: BookOpen,
    },
  ];

  const handleVoiceToggle = (active: boolean) => {
    setIsVoiceActive(active);
    if (active) {
      // Navigate to chat when voice is activated
      router.push("/chat");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
      {/* Hero Section */}
      <div className="container mx-auto px-6 py-12">
        <div className="mb-12">
          <h1 className="text-4xl font-bold mb-2">
            Welcome back, {userName}!
          </h1>
          <p className="text-xl text-muted-foreground">
            Ready to continue your learning journey?
          </p>
        </div>

        {/* Ask M3alem CTA */}
        <Card className="mb-8 border-teal/30 bg-gradient-to-r from-teal/5 to-teal-light/5">
          <CardContent className="p-8">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h2 className="text-2xl font-bold mb-2 flex items-center">
                  <span className="mr-2">💡</span>
                  Ask M3alem Anything
                </h2>
                <p className="text-muted-foreground mb-4">
                  Get instant help with your studies. Voice or text, I'm here to help!
                </p>
                <Button
                  onClick={() => router.push("/chat")}
                  className="bg-teal hover:bg-teal/90"
                >
                  Start Learning
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
              <div className="hidden md:block">
                <div className="w-32 h-32 rounded-full bg-gradient-to-br from-teal-light to-teal flex items-center justify-center">
                  <span className="text-6xl">🎓</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Learning Streak */}
          <LearningStreak
            currentStreak={currentStreak}
            longestStreak={longestStreak}
          />

          {/* Study Time */}
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Study Time</CardTitle>
              <Clock className="h-5 w-5 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-baseline space-x-2">
                  <div className="text-2xl font-bold">5.2</div>
                  <div className="text-sm text-muted-foreground">hours</div>
                </div>
                <div className="text-xs text-muted-foreground">
                  This week
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Topics Mastered */}
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Topics Mastered
              </CardTitle>
              <TrendingUp className="h-5 w-5 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-baseline space-x-2">
                  <div className="text-2xl font-bold">12</div>
                  <div className="text-sm text-muted-foreground">topics</div>
                </div>
                <div className="text-xs text-muted-foreground">
                  This month
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Topics */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-4">Recent Topics</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {recentTopics.map((topic, index) => (
              <Card key={index} className="hover:shadow-md transition-shadow cursor-pointer">
                <CardHeader>
                  <CardDescription className="text-xs">{topic.subject}</CardDescription>
                  <CardTitle className="text-base">{topic.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Progress</span>
                      <span className="font-medium">{topic.progress}%</span>
                    </div>
                    <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-teal transition-all duration-300"
                        style={{ width: `${topic.progress}%` }}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Continue Learning */}
        <div>
          <h2 className="text-2xl font-bold mb-4">Continue Learning</h2>
          <div className="grid grid-cols-1 gap-4">
            {continuelearning.map((item, index) => {
              const Icon = item.icon;
              return (
                <Card
                  key={index}
                  className="hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => router.push("/chat")}
                >
                  <CardContent className="p-6">
                    <div className="flex items-center space-x-4">
                      <div className="flex-shrink-0">
                        <div className="w-12 h-12 rounded-lg bg-teal/10 flex items-center justify-center">
                          <Icon className="h-6 w-6 text-teal" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold mb-1">{item.title}</h3>
                        <p className="text-sm text-muted-foreground">
                          {item.description}
                        </p>
                      </div>
                      <ArrowRight className="h-5 w-5 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </div>

      {/* Floating M3alem Sphere */}
      <M3alemSphere
        onVoiceToggle={handleVoiceToggle}
        isVoiceActive={isVoiceActive}
      />
    </div>
  );
}
