"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Mic, X } from "lucide-react"
import { cn } from "@/lib/utils"

export function FloatingSphere() {
  const [isActive, setIsActive] = useState(false)

  return (
    <>
      {/* Floating Sphere Button */}
      <Button
        size="icon"
        className={cn(
          "fixed bottom-8 right-8 w-16 h-16 rounded-full shadow-2xl transition-all duration-300 z-50",
          isActive
            ? "bg-destructive hover:bg-destructive/90"
            : "bg-gradient-to-br from-primary to-accent hover:scale-110 pulse-glow float-animation",
        )}
        onClick={() => setIsActive(!isActive)}
      >
        {isActive ? <X className="w-8 h-8 text-white" /> : <Mic className="w-8 h-8 text-white" />}
      </Button>

      {/* Voice Mode Overlay */}
      {isActive && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 flex items-center justify-center">
          <div className="text-center">
            <div className="w-32 h-32 mx-auto mb-6 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center pulse-glow float-animation">
              <Mic className="w-16 h-16 text-white" />
            </div>
            <h2 className="text-3xl font-bold text-white mb-2">Listening...</h2>
            <p className="text-white/80">Speak to M3alem</p>
            <div className="flex gap-2 justify-center mt-6">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className="w-2 h-12 bg-accent rounded-full animate-pulse"
                  style={{ animationDelay: `${i * 0.1}s` }}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
