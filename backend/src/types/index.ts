/**
 * Type definitions for the backend
 */

export interface RAGDocument {
  id: string;
  source: string;
  page_number: number;
  chunk_text: string;
  embedding: number[];
  entity_tags: string[];
  inserted_at: Date;
}

export interface RAGQueryResult {
  source: string;
  page_number: number;
  snippet: string;
  score: number;
}

export interface WSMessage {
  type: WSMessageType;
  session_id?: string;
  text?: string;
  data?: any;
  use_rag?: boolean;
  sources?: RAGQueryResult[];
  error?: string;
  audio?: string; // base64 encoded audio data
  audio_transcript?: string; // transcription of audio
  is_spoken?: boolean; // flag to mark spoken messages
}

export type WSMessageType =
  | "start_session"
  | "user_message"
  | "user_audio_chunk"
  | "upload_image_meta"
  | "rag_query"
  | "partial_response"
  | "final_response"
  | "rag_sources"
  | "error"
  | "start_voice_call"
  | "end_voice_call"
  | "audio_chunk"
  | "audio_response"
  | "audio_transcript"
  | "commit_audio"
  | "start_stt_session"
  | "stt_audio_chunk"
  | "end_stt_session"
  | "stt_transcript_delta";

export interface IngestResult {
  success: boolean;
  chunks_created: number;
  time_taken_ms: number;
  source: string;
  errors?: string[];
}

export interface ImageUploadResult {
  success: boolean;
  image_id: string;
  ocr_text?: string;
  filename: string;
}

export interface Conversation {
  id: string;
  title: string;
  created_at: Date;
  updated_at: Date;
  user_id?: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  role: "user" | "assistant";
  content: string;
  sources?: RAGQueryResult[];
  image_data?: string;
  image_filename?: string;
  is_spoken?: boolean; // flag to indicate message was spoken (voice call)
  created_at: Date;
}

export interface ConversationWithMessages extends Conversation {
  messages: Message[];
}
