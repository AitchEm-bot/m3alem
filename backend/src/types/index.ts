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
  | "error";

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
