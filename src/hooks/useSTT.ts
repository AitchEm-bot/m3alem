import { useState, useRef, useCallback } from "react";

/**
 * Hook for speech-to-text using browser MediaRecorder
 * Captures audio in chunks and transcribes in real-time
 */
export function useSTT() {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const chunkIntervalRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Convert audio blob to base64 (WebM format - much smaller than PCM16)
   */
  const convertToBase64 = async (audioBlob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        // Remove data URL prefix (e.g., "data:audio/webm;base64,")
        const base64 = base64String.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(audioBlob);
    });
  };

  /**
   * Transcribe audio chunk and append to transcript
   */
  const transcribeChunk = async (audioBlob: Blob) => {
    try {
      // Skip tiny chunks (likely empty or just noise)
      if (audioBlob.size < 1000) {
        console.log("[STT] Skipping tiny chunk, size:", audioBlob.size);
        return;
      }

      const base64Audio = await convertToBase64(audioBlob);

      console.log("[STT] Sending audio chunk to transcription API, size:", audioBlob.size);
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";

      const response = await fetch(`${backendUrl}/api/transcribe`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ audio: base64Audio }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: response.statusText }));
        console.error("[STT] Transcription API error:", errorData);
        throw new Error(`Transcription failed: ${errorData.error || response.statusText}`);
      }

      const data = await response.json();
      const transcribedText = data.text || "";

      if (transcribedText.trim()) {
        console.log("[STT] Chunk transcribed:", transcribedText);
        // Append to existing transcript
        setTranscript((prev) => {
          const newTranscript = prev ? `${prev} ${transcribedText}` : transcribedText;
          console.log("[STT] Updated transcript:", newTranscript);
          return newTranscript;
        });
      } else {
        console.log("[STT] Empty transcription received");
      }
    } catch (err) {
      console.error("Error transcribing chunk:", err);
      // Don't show error for individual chunks, only if all fail
    }
  };

  /**
   * Start recording audio from microphone
   * Sends complete audio file for transcription when stopped
   */
  const startRecording = useCallback(async () => {
    try {
      setError(null);
      setTranscript(""); // Clear previous transcript
      audioChunksRef.current = [];

      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 24000,
        }
      });

      streamRef.current = stream;

      // Create MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: "audio/webm",
      });

      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          console.log("[STT] Audio chunk collected, size:", event.data.size);
          // Collect chunks, don't transcribe yet
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        console.log("[STT] Recording stopped, transcribing complete audio...");

        // Combine all chunks into one blob
        const completeAudioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        console.log("[STT] Complete audio size:", completeAudioBlob.size);

        // Transcribe the complete audio
        if (completeAudioBlob.size > 1000) {
          await transcribeChunk(completeAudioBlob);
        } else {
          console.log("[STT] Audio too short, skipping transcription");
          setTranscript("[Recording too short]");
        }

        // Cleanup
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
        }
      };

      // Start recording (collect all data until stop)
      mediaRecorder.start();

      setIsRecording(true);
      console.log("[STT] Started recording");
    } catch (err) {
      console.error("Error starting recording:", err);
      setError("Failed to access microphone");
      setTranscript("[Could not access microphone]");
    }
  }, []);

  /**
   * Stop recording audio
   */
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  }, [isRecording]);

  /**
   * Toggle recording on/off
   */
  const toggleRecording = useCallback(() => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  }, [isRecording, startRecording, stopRecording]);

  /**
   * Clear transcript
   */
  const clearTranscript = useCallback(() => {
    setTranscript("");
  }, []);

  return {
    isRecording,
    transcript,
    error,
    startRecording,
    stopRecording,
    toggleRecording,
    clearTranscript,
  };
}
