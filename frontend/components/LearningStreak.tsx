"use client";

import { Flame } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface LearningStreakProps {
  currentStreak: number;
  longestStreak: number;
  className?: string;
}

/**
 * Learning Streak component showing days in a row
 * Displays current streak with fire icon and progress
 */
export function LearningStreak({
  currentStreak,
  longestStreak,
  className,
}: LearningStreakProps) {
  const streakPercentage = Math.min((currentStreak / longestStreak) * 100, 100);

  return (
    <Card className={cn("hover:shadow-md transition-shadow", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Learning Streak</CardTitle>
        <Flame
          className={cn(
            "h-5 w-5",
            currentStreak > 0 ? "text-orange-500" : "text-muted-foreground"
          )}
        />
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex items-baseline space-x-2">
            <div className="text-2xl font-bold">{currentStreak}</div>
            <div className="text-sm text-muted-foreground">
              {currentStreak === 1 ? "day" : "days"}
            </div>
          </div>

          {/* Progress bar */}
          <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-orange-400 to-orange-600 transition-all duration-500"
              style={{ width: `${streakPercentage}%` }}
            />
          </div>

          <div className="text-xs text-muted-foreground">
            Longest: {longestStreak} {longestStreak === 1 ? "day" : "days"}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
