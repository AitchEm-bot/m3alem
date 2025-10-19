import { useState, useRef, useCallback, useEffect } from "react";
import { WebSocketClient, WSMessage } from "@/lib/wsClient";

/**
 * Hook for speech-to-text using OpenAI Realtime API via WebSocket
 * Streams audio chunks in real-time for instant transcription
 */
export function useSTT(wsClient: WebSocketClient | null) {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);

  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);

  /**
   * Convert Float32Array audio to base64 PCM16
   */
  const convertToPCM16 = (float32Array: Float32Array): string => {
    const buffer = new ArrayBuffer(float32Array.length * 2);
    const view = new DataView(buffer);

    for (let i = 0; i < float32Array.length; i++) {
      const s = Math.max(-1, Math.min(1, float32Array[i]));
      view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    }

    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }

    return btoa(binary);
  };

  /**
   * Listen for STT transcript deltas from WebSocket
   */
  useEffect(() => {
    if (!wsClient) return;

    const handleMessage = (message: WSMessage) => {
      if (message.type === "stt_transcript_delta") {
        console.log("[STT] Received transcript delta:", message.text);

        if (message.is_final) {
          // Final transcript
          setTranscript(message.text.trim());
        } else {
          // Append delta to transcript
          setTranscript((prev) => {
            const newTranscript = prev ? `${prev} ${message.text}` : message.text;
            return newTranscript;
          });
        }
      }
    };

    wsClient.on("stt_transcript_delta", handleMessage);

    return () => {
      wsClient.off("stt_transcript_delta", handleMessage);
    };
  }, [wsClient]);

  /**
   * Start recording audio from microphone
   * Streams audio to WebSocket for real-time transcription
   */
  const startRecording = useCallback(async () => {
    if (!wsClient || !wsClient.isConnected()) {
      console.error("[STT] WebSocket not connected");
      setError("Connection not ready");
      setTranscript("[WebSocket not connected]");
      return;
    }

    try {
      setError(null);
      setTranscript(""); // Clear previous transcript

      // Start STT session on backend
      wsClient.send({ type: "start_stt_session" });
      console.log("[STT] Sent start_stt_session");

      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 24000,
        }
      });

      streamRef.current = stream;

      // Create AudioContext for processing raw audio
      const audioContext = new AudioContext({ sampleRate: 24000 });
      audioContextRef.current = audioContext;

      const source = audioContext.createMediaStreamSource(stream);

      // Create script processor for real-time audio chunks
      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      processor.onaudioprocess = (e) => {
        if (!wsClient || !wsClient.isConnected()) return;

        const inputData = e.inputBuffer.getChannelData(0);
        const pcm16 = convertToPCM16(inputData);

        // Send audio chunk to backend
        wsClient.send({
          type: "stt_audio_chunk",
          audio: pcm16,
        });
      };

      source.connect(processor);
      processor.connect(audioContext.destination);

      setIsRecording(true);
      console.log("[STT] Started recording and streaming");
    } catch (err) {
      console.error("Error starting recording:", err);
      setError("Failed to access microphone");
      setTranscript("[Could not access microphone]");
    }
  }, [wsClient]);

  /**
   * Stop recording audio
   */
  const stopRecording = useCallback(() => {
    if (!isRecording) return;

    console.log("[STT] Stopping recording");

    // Cleanup audio processing
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    // End STT session on backend
    if (wsClient && wsClient.isConnected()) {
      wsClient.send({ type: "end_stt_session" });
      console.log("[STT] Sent end_stt_session");
    }

    setIsRecording(false);
  }, [isRecording, wsClient]);

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
