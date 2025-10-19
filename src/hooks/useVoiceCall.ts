import { useState, useRef, useCallback, useEffect } from "react";

export interface VoiceCallOptions {
  onAudioResponse?: (audioBase64: string) => void;
  onTranscript?: (text: string, isUser: boolean) => void;
  onError?: (error: string) => void;
}

/**
 * Hook for managing voice call sessions
 * Handles audio recording, playback, and WebSocket communication
 */
export function useVoiceCall(options: VoiceCallOptions = {}) {
  const [isCallActive, setIsCallActive] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioWorkletRef = useRef<AudioWorkletNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const audioQueueRef = useRef<string[]>([]);
  const isPlayingRef = useRef(false);
  const isCallActiveRef = useRef(false); // Use ref to avoid closure issues
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const nextPlayTimeRef = useRef<number>(0); // Track when next chunk should play
  const processedChunksRef = useRef<Set<string>>(new Set()); // Track processed chunks to prevent duplicates
  const currentSourceRef = useRef<AudioBufferSourceNode | null>(null); // Track current playing source

  /**
   * Convert Float32Array audio to base64 PCM16 format
   * Based on OpenAI Realtime API documentation
   */
  const floatTo16BitPCM = (float32Array: Float32Array): ArrayBuffer => {
    const buffer = new ArrayBuffer(float32Array.length * 2);
    const view = new DataView(buffer);
    let offset = 0;
    for (let i = 0; i < float32Array.length; i++, offset += 2) {
      const s = Math.max(-1, Math.min(1, float32Array[i]));
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    }
    return buffer;
  };

  /**
   * Encode audio to base64
   */
  const base64EncodeAudio = (float32Array: Float32Array): string => {
    const arrayBuffer = floatTo16BitPCM(float32Array);
    const bytes = new Uint8Array(arrayBuffer);
    let binary = "";
    const chunkSize = 0x8000; // 32KB chunk size
    for (let i = 0; i < bytes.length; i += chunkSize) {
      const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
      binary += String.fromCharCode.apply(null, Array.from(chunk));
    }
    return btoa(binary);
  };

  /**
   * Play audio from base64 PCM16 data with seamless scheduling
   */
  const playAudio = useCallback(async (audioBase64: string) => {
    try {
      // Prevent duplicate playback
      const chunkHash = audioBase64.substring(0, 50); // Use first 50 chars as hash
      if (processedChunksRef.current.has(chunkHash)) {
        console.log("[VoiceCall] Skipping duplicate audio chunk");
        return;
      }
      processedChunksRef.current.add(chunkHash);

      // Stop any currently playing audio to prevent overlap
      if (currentSourceRef.current) {
        try {
          currentSourceRef.current.stop();
          currentSourceRef.current.disconnect();
        } catch (e) {
          // Ignore errors from stopping already stopped sources
        }
        currentSourceRef.current = null;
      }

      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext({ sampleRate: 24000 });
      }

      const audioContext = audioContextRef.current;

      // Resume context if suspended
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }

      // Decode base64 to binary
      const binaryString = atob(audioBase64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Convert Int16 to Float32
      const int16Array = new Int16Array(bytes.buffer);
      const float32Array = new Float32Array(int16Array.length);
      for (let i = 0; i < int16Array.length; i++) {
        float32Array[i] = int16Array[i] / (int16Array[i] < 0 ? 0x8000 : 0x7fff);
      }

      // Create audio buffer
      const audioBuffer = audioContext.createBuffer(1, float32Array.length, 24000);
      audioBuffer.getChannelData(0).set(float32Array);

      // Calculate when this chunk should start
      const currentTime = audioContext.currentTime;
      const startTime = Math.max(currentTime + 0.01, nextPlayTimeRef.current); // Add small delay to prevent overlap

      // Schedule this chunk to play
      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContext.destination);

      currentSourceRef.current = source;
      source.start(startTime);

      // Update next play time to be right after this chunk ends
      nextPlayTimeRef.current = startTime + audioBuffer.duration;

      console.log(`[VoiceCall] Playing audio chunk: duration=${audioBuffer.duration.toFixed(3)}s, startTime=${startTime.toFixed(3)}s`);
      setIsSpeaking(true);

      source.onended = () => {
        currentSourceRef.current = null;

        // Clean up old processed chunks (keep only last 100)
        if (processedChunksRef.current.size > 100) {
          const arr = Array.from(processedChunksRef.current);
          processedChunksRef.current = new Set(arr.slice(-50));
        }

        // Check if there are more chunks to play
        if (audioQueueRef.current.length > 0) {
          const nextAudio = audioQueueRef.current.shift();
          if (nextAudio) {
            playAudio(nextAudio);
          }
        } else {
          setIsSpeaking(false);
          isPlayingRef.current = false;
          // Reset play time when queue is empty
          nextPlayTimeRef.current = 0;
        }
      };

      isPlayingRef.current = true;
    } catch (err) {
      console.error("[VoiceCall] Error playing audio:", err);
      setError("Failed to play audio");
      setIsSpeaking(false);
      isPlayingRef.current = false;
      currentSourceRef.current = null;
      options.onError?.("Failed to play audio");
    }
  }, [options]);

  /**
   * Queue audio for playback
   */
  const queueAudio = useCallback(
    (audioBase64: string) => {
      // Prevent duplicate chunks in queue
      const chunkHash = audioBase64.substring(0, 50);
      if (processedChunksRef.current.has(chunkHash)) {
        console.log("[VoiceCall] Skipping duplicate chunk in queue");
        return;
      }

      if (isPlayingRef.current) {
        console.log(`[VoiceCall] Queueing audio chunk (queue size: ${audioQueueRef.current.length})`);
        audioQueueRef.current.push(audioBase64);
      } else {
        console.log("[VoiceCall] Playing audio chunk immediately");
        playAudio(audioBase64);
      }
    },
    [playAudio]
  );

  /**
   * Handle incoming audio response from server
   */
  const handleAudioResponse = useCallback(
    (audioBase64: string) => {
      queueAudio(audioBase64);
      options.onAudioResponse?.(audioBase64);
    },
    [queueAudio, options]
  );

  /**
   * Start voice call
   */
  const startCall = useCallback(
    async (sendAudioChunk: (audioBase64: string) => void) => {
      console.log("[VoiceCall] startCall called");
      try {
        setError(null);

        // Request microphone access
        console.log("[VoiceCall] Requesting microphone access...");
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            channelCount: 1,
            sampleRate: 24000,
            echoCancellation: true,
            noiseSuppression: true,
          },
        });
        console.log("[VoiceCall] Microphone access granted");
        mediaStreamRef.current = stream;

        // Create AudioContext for processing
        const audioContext = new AudioContext({ sampleRate: 24000 });
        audioContextRef.current = audioContext;

        // Create MediaStreamSource from microphone
        const source = audioContext.createMediaStreamSource(stream);
        sourceRef.current = source;

        // Create ScriptProcessorNode to process audio in chunks
        // Buffer size of 4096 gives us ~170ms chunks at 24kHz
        const processor = audioContext.createScriptProcessor(4096, 1, 1);
        processorRef.current = processor;

        processor.onaudioprocess = (e) => {
          if (!isCallActiveRef.current) return;

          try {
            const inputData = e.inputBuffer.getChannelData(0);

            // Convert to base64 PCM16 and send directly
            const base64Audio = base64EncodeAudio(inputData);
            sendAudioChunk(base64Audio);
          } catch (err) {
            console.error("[VoiceCall] Error processing audio:", err);
          }
        };

        // Connect audio graph: source -> processor -> destination
        source.connect(processor);
        processor.connect(audioContext.destination);

        setIsCallActive(true);
        isCallActiveRef.current = true;
        console.log("[VoiceCall] Voice call started successfully");
      } catch (err) {
        console.error("[VoiceCall] Error starting call:", err);
        setError("Failed to access microphone");
        options.onError?.("Failed to access microphone");
      }
    },
    [base64EncodeAudio, options]
  );

  /**
   * End voice call
   */
  const endCall = useCallback(() => {
    console.log("[VoiceCall] Ending call");

    // Stop current audio playback
    if (currentSourceRef.current) {
      try {
        currentSourceRef.current.stop();
        currentSourceRef.current.disconnect();
      } catch (e) {
        // Ignore errors from stopping already stopped sources
      }
      currentSourceRef.current = null;
    }

    // Disconnect audio processing
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }

    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }

    // Stop all media tracks
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }

    // Note: We keep audioContextRef.current for playback

    // Clear audio queue and reset playback timing
    audioQueueRef.current = [];
    isPlayingRef.current = false;
    nextPlayTimeRef.current = 0;
    processedChunksRef.current.clear();

    setIsCallActive(false);
    isCallActiveRef.current = false; // Update ref to stop audio processing
    setIsSpeaking(false);
  }, []);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      endCall();
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, [endCall]);

  return {
    isCallActive,
    isSpeaking,
    error,
    startCall,
    endCall,
    handleAudioResponse,
  };
}
