"use client";

import { useState, useRef, ChangeEvent, KeyboardEvent } from "react";
import { Mic, MicOff, Image as ImageIcon, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface ChatbarProps {
  onSendMessage: (message: string) => void;
  onVoiceToggle: (isActive: boolean) => void;
  onImageUpload: (file: File, caption?: string) => void;
  isVoiceActive?: boolean;
  isLoading?: boolean;
  className?: string;
}

/**
 * Chatbar component with text input, mic icon, and upload icon
 * Handles image preview and upload flow
 */
export function Chatbar({
  onSendMessage,
  onVoiceToggle,
  onImageUpload,
  isVoiceActive = false,
  isLoading = false,
  className,
}: ChatbarProps) {
  const [message, setMessage] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSend = () => {
    if (message.trim() || imageFile) {
      if (imageFile) {
        // Send image with optional caption
        onImageUpload(imageFile, message.trim() || undefined);
        // Clear both image and message after upload
        setImageFile(null);
        setImagePreview(null);
        setMessage("");
      } else if (message.trim()) {
        // Send text-only message
        onSendMessage(message.trim());
        setMessage("");
      }
    }
  };

  const handleKeyPress = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleImageSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);

      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className={cn("border-t bg-background p-4", className)}>
      {/* Image Preview */}
      {imagePreview && (
        <div className="mb-3 relative inline-block">
          <div className="relative rounded-lg overflow-hidden border border-border">
            <img
              src={imagePreview}
              alt="Upload preview"
              className="h-20 w-auto object-contain"
            />
            <button
              onClick={handleRemoveImage}
              className="absolute top-1 right-1 bg-black/60 hover:bg-black/80 text-white rounded-full p-1 transition-colors"
              aria-label="Remove image"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {imageFile?.name}
          </p>
        </div>
      )}

      {/* Input Area */}
      <div className="flex items-end space-x-2">
        {/* Voice Toggle Button */}
        <Button
          variant={isVoiceActive ? "default" : "outline"}
          size="icon"
          onClick={() => onVoiceToggle(!isVoiceActive)}
          className={cn(
            "flex-shrink-0",
            isVoiceActive && "bg-teal hover:bg-teal/90"
          )}
          disabled={isLoading}
          aria-label={isVoiceActive ? "Stop voice mode" : "Start voice mode"}
        >
          {isVoiceActive ? (
            <MicOff className="h-5 w-5" />
          ) : (
            <Mic className="h-5 w-5" />
          )}
        </Button>

        {/* Image Upload Button */}
        <Button
          variant="outline"
          size="icon"
          onClick={() => fileInputRef.current?.click()}
          className="flex-shrink-0"
          disabled={isLoading}
          aria-label="Upload image"
        >
          <ImageIcon className="h-5 w-5" />
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageSelect}
          className="hidden"
        />

        {/* Text Input */}
        <Input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Ask M3alem anything..."
          className="flex-1"
          disabled={isLoading || isVoiceActive}
        />

        {/* Send Button */}
        <Button
          onClick={handleSend}
          disabled={(!message.trim() && !imageFile) || isLoading}
          className="flex-shrink-0 bg-teal hover:bg-teal/90"
          size="icon"
          aria-label="Send message"
        >
          <Send className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}
