"use client";

import { useState } from "react";
import { Mic, MicOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface M3alemSphereProps {
  onVoiceToggle: (isActive: boolean) => void;
  isVoiceActive?: boolean;
  className?: string;
}

/**
 * Floating teal sphere component that triggers voice mode
 * Always visible, accessible on mobile
 * Colors: #FFFFFF (white), #A8FBD3 (light teal), #4FB7B3 (teal)
 */
export function M3alemSphere({
  onVoiceToggle,
  isVoiceActive = false,
  className,
}: M3alemSphereProps) {
  const [isHovered, setIsHovered] = useState(false);

  const handleClick = () => {
    onVoiceToggle(!isVoiceActive);
  };

  return (
    <button
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn(
        "fixed bottom-6 right-6 z-50",
        "w-16 h-16 rounded-full",
        "flex items-center justify-center",
        "shadow-lg transition-all duration-300 ease-in-out",
        "focus:outline-none focus:ring-4 focus:ring-teal-light/50",
        "hover:scale-110",
        isVoiceActive
          ? "bg-teal-light animate-pulse"
          : "bg-teal hover:bg-teal-light",
        className
      )}
      aria-label={isVoiceActive ? "Stop voice mode" : "Start voice mode"}
    >
      <div className="relative">
        {isVoiceActive ? (
          <MicOff className="w-7 h-7 text-white" />
        ) : (
          <Mic className="w-7 h-7 text-white" />
        )}

        {/* Pulse effect when active */}
        {isVoiceActive && (
          <>
            <span className="absolute inset-0 -m-2 rounded-full bg-teal-light opacity-75 animate-ping"></span>
            <span className="absolute inset-0 -m-4 rounded-full bg-teal-light opacity-50 animate-ping delay-75"></span>
          </>
        )}
      </div>

      {/* Tooltip */}
      {isHovered && !isVoiceActive && (
        <div className="absolute bottom-full mb-2 px-3 py-1 bg-gray-900 text-white text-sm rounded-md whitespace-nowrap">
          Ask M3alem
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-900"></div>
        </div>
      )}
    </button>
  );
}
