"use client";

import { BookOpen, Beaker, Calculator, Globe } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * Subjects page
 * Shows available subjects/topics
 */
export default function SubjectsPage() {
  const subjects = [
    {
      title: "Physics",
      icon: BookOpen,
      description: "Mechanics, Energy, Waves, Electricity",
      color: "blue",
      topics: 45,
    },
    {
      title: "Chemistry",
      icon: Beaker,
      description: "Atoms, Bonding, Reactions, Organic",
      color: "green",
      topics: 38,
    },
    {
      title: "Mathematics",
      icon: Calculator,
      description: "Algebra, Calculus, Statistics, Geometry",
      color: "purple",
      topics: 52,
    },
    {
      title: "Geography",
      icon: Globe,
      description: "Earth Science, Climate, Human Geography",
      color: "orange",
      topics: 28,
    },
  ];

  const colorClasses: Record<string, string> = {
    blue: "bg-blue-500/10 text-blue-600",
    green: "bg-green-500/10 text-green-600",
    purple: "bg-purple-500/10 text-purple-600",
    orange: "bg-orange-500/10 text-orange-600",
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-6 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Subjects</h1>
          <p className="text-muted-foreground">
            Explore topics across different subjects
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {subjects.map((subject) => {
            const Icon = subject.icon;
            return (
              <Card
                key={subject.title}
                className="hover:shadow-lg transition-shadow cursor-pointer"
              >
                <CardHeader>
                  <div className="flex items-center space-x-4">
                    <div
                      className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                        colorClasses[subject.color]
                      }`}
                    >
                      <Icon className="h-6 w-6" />
                    </div>
                    <div className="flex-1">
                      <CardTitle>{subject.title}</CardTitle>
                      <CardDescription>{subject.description}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-muted-foreground">
                    {subject.topics} topics available
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
