/**
 * WebSocket client for real-time communication with the backend
 */

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

export interface WSMessage {
  type: WSMessageType;
  session_id?: string;
  text?: string;
  data?: any;
  use_rag?: boolean;
  sources?: RAGSource[];
  error?: string;
}

export interface RAGSource {
  source: string;
  page_number: number;
  snippet: string;
  score: number;
}

export type WSEventHandler = (message: WSMessage) => void;

export class WebSocketClient {
  private ws: WebSocket | null = null;
  private url: string;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private handlers: Map<WSMessageType, WSEventHandler[]> = new Map();
  private sessionId: string;
  private conversationId: string | null;

  constructor(url: string, sessionId: string, conversationId: string | null = null) {
    this.url = url;
    this.sessionId = sessionId;
    this.conversationId = conversationId;
  }

  /**
   * Connect to the WebSocket server
   */
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.url);

        this.ws.onopen = () => {
          console.log("[WS] Connected to server");
          this.reconnectAttempts = 0;

          // Send initial session start message with conversation_id if available
          this.send({
            type: "start_session",
            session_id: this.sessionId,
            data: this.conversationId ? { conversation_id: this.conversationId } : undefined,
          });

          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const message: WSMessage = JSON.parse(event.data);
            this.handleMessage(message);
          } catch (error) {
            console.error("[WS] Failed to parse message:", error);
          }
        };

        this.ws.onerror = (error) => {
          console.error("[WS] Error:", error);
          reject(error);
        };

        this.ws.onclose = () => {
          console.log("[WS] Connection closed");
          this.attemptReconnect();
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Attempt to reconnect to the server
   */
  private attemptReconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(
        `[WS] Reconnecting... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`
      );

      setTimeout(() => {
        this.connect().catch((error) => {
          console.error("[WS] Reconnection failed:", error);
        });
      }, this.reconnectDelay * this.reconnectAttempts);
    } else {
      console.error("[WS] Max reconnection attempts reached");
      this.emit({
        type: "error",
        error: "Failed to reconnect to server",
      });
    }
  }

  /**
   * Send a message to the server
   */
  send(message: WSMessage): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.error("[WS] Cannot send message: connection not open");
    }
  }

  /**
   * Register an event handler
   */
  on(type: WSMessageType, handler: WSEventHandler): void {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, []);
    }
    this.handlers.get(type)!.push(handler);
  }

  /**
   * Remove an event handler
   */
  off(type: WSMessageType, handler: WSEventHandler): void {
    const handlers = this.handlers.get(type);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  /**
   * Handle incoming messages
   */
  private handleMessage(message: WSMessage): void {
    const handlers = this.handlers.get(message.type);
    if (handlers) {
      handlers.forEach((handler) => handler(message));
    }
  }

  /**
   * Emit a message to all handlers
   */
  private emit(message: WSMessage): void {
    this.handleMessage(message);
  }

  /**
   * Close the connection
   */
  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}
