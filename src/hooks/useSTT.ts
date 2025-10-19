import { useState, useRef, useCallback } from "react";

/**
 * Hook for speech-to-text using browser MediaRecorder
 * Captures audio and converts to PCM16 format for OpenAI
 */
export function useSTT() {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);

  /**
   * Convert audio blob to base64 PCM16 format
   */
  const convertToPCM16 = async (audioBlob: Blob): Promise<string> => {
    const arrayBuffer = await audioBlob.arrayBuffer();

    // Create audio context
    const audioContext = new AudioContext({ sampleRate: 24000 });
    audioContextRef.current = audioContext;

    // Decode audio data
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

    // Get audio data as Float32Array
    const float32Array = audioBuffer.getChannelData(0);

    // Convert to Int16 (PCM16)
    const int16Array = new Int16Array(float32Array.length);
    for (let i = 0; i < float32Array.length; i++) {
      const s = Math.max(-1, Math.min(1, float32Array[i]));
      int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }

    // Convert to base64
    const uint8Array = new Uint8Array(int16Array.buffer);
    let binary = "";
    for (let i = 0; i < uint8Array.byteLength; i++) {
      binary += String.fromCharCode(uint8Array[i]);
    }

    return btoa(binary);
  };

  /**
   * Start recording audio from microphone
   */
  const startRecording = useCallback(async () => {
    try {
      setError(null);
      audioChunksRef.current = [];

      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 24000,
        }
      });

      // Create MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: "audio/webm",
      });

      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        // Combine audio chunks
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });

        // Convert to PCM16 and get base64
        try {
          const base64Audio = await convertToPCM16(audioBlob);

          // For STT, we would send this to OpenAI Whisper API
          // For now, we'll just set a placeholder transcript
          // In production, this would be sent to the backend
          setTranscript("[Audio recorded - transcription pending]");
        } catch (err) {
          console.error("Error converting audio:", err);
          setError("Failed to process audio");
        }

        // Stop all tracks
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Error starting recording:", err);
      setError("Failed to access microphone");
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
