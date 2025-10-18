import OpenAI from "openai";
import dotenv from "dotenv";

// Ensure environment variables are loaded
dotenv.config();

/**
 * OpenAI service for embeddings and completions
 * NOTE: OpenAI Realtime API is handled separately via WebSocket in websocket/handler.ts
 */
class OpenAIService {
  private client: OpenAI;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      throw new Error("OpenAI API key not configured");
    }

    this.client = new OpenAI({ apiKey });
  }

  /**
   * Generate embeddings for text
   */
  async createEmbedding(text: string): Promise<number[]> {
    const response = await this.client.embeddings.create({
      model: "text-embedding-3-small",
      input: text,
    });

    return response.data[0].embedding;
  }

  /**
   * Extract entities from text using LLM
   */
  async extractEntities(text: string): Promise<string[]> {
    const response = await this.client.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content:
            "Extract key entities, concepts, and topics from the text. Return only a comma-separated list of entities.",
        },
        {
          role: "user",
          content: text,
        },
      ],
      temperature: 0.3,
      max_tokens: 100,
    });

    const entities = response.choices[0].message.content || "";
    return entities
      .split(",")
      .map((e) => e.trim())
      .filter((e) => e.length > 0);
  }

  /**
   * Create a streaming completion (used for RAG-enhanced responses)
   */
  async createStreamingCompletion(
    messages: OpenAI.Chat.ChatCompletionMessageParam[],
    onChunk: (chunk: string) => void
  ): Promise<void> {
    const stream = await this.client.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages,
      stream: true,
      temperature: 0.7,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || "";
      if (content) {
        onChunk(content);
      }
    }
  }

  /**
   * Get client instance for direct access
   */
  getClient(): OpenAI {
    return this.client;
  }
}

export const openaiService = new OpenAIService();
