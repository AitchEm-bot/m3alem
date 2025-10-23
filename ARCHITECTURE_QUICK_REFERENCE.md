# M3alem Architecture - Quick Reference Guide

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         USER BROWSER                                │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                    Next.js Frontend                           │   │
│  │  ┌──────────────────────────────────────────────────────┐    │   │
│  │  │  Chat Interface (chat-interface.tsx)                  │    │   │
│  │  │  - Chatbar (text input, mic, phone buttons)          │    │   │
│  │  │  - ChatMessage (display messages)                    │    │   │
│  │  │  - SourcesPanel (RAG citations)                      │    │   │
│  │  │  - ConversationSidebar (history)                     │    │   │
│  │  └──────────────────────────────────────────────────────┘    │   │
│  │                                                                │   │
│  │  Hooks Layer:                                                 │   │
│  │  - useRealtime (568 lines) ◄─────── Core Chat Logic         │   │
│  │  - useSTT ◄─────────────────────── Mic Transcription        │   │
│  │  - useVoiceCall ◄──────────────── Voice Mode               │   │
│  │  - useConversations ◄───────────── Data Fetching           │   │
│  │                                                                │   │
│  │  WebSocket Client (wsClient.ts):                             │   │
│  │  - Connect to backend /ws                                    │   │
│  │  - Send/receive messages                                     │   │
│  │  - Handle reconnection                                       │   │
│  └──────────────────────────────────────────────────────────────┘   │
└──────────────────────────────────┬──────────────────────────────────┘
                                   │
                    WebSocket: ws://backend:3001/ws
                                   │
┌──────────────────────────────────┴──────────────────────────────────┐
│                      BACKEND (Express.js)                           │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  HTTP Routes:                                                 │   │
│  │  - POST /api/rag/ingest          (PDF → Embeddings)         │   │
│  │  - POST /api/rag/query            (Search Vector DB)        │   │
│  │  - GET  /api/conversations        (List chats)              │   │
│  │  - GET  /api/conversations/:id    (Get chat messages)       │   │
│  │  - POST /api/upload-image         (Image upload)            │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  WebSocket Handler (handler.ts - 1365 lines)                │   │
│  │                                                               │   │
│  │  Per-Connection State:                                       │   │
│  │  - clientWs: WebSocket to frontend                          │   │
│  │  - openaiWs: WebSocket to OpenAI                            │   │
│  │  - sessionId, conversationId, currentSources                │   │
│  │  - accumulatedText (streaming response)                     │   │
│  │  - isVoiceCallActive, isSTTSessionActive                    │   │
│  │                                                               │   │
│  │  Message Types Handled:                                      │   │
│  │  - start_session       → Initialize connection              │   │
│  │  - user_message        → Text chat                          │   │
│  │  - audio_chunk         → Voice streaming                    │   │
│  │  - start_voice_call    → Voice mode init                    │   │
│  │  - upload_image_meta   → Image uploads                      │   │
│  │  - commit_audio        → Finalize buffer                    │   │
│  │  - start_stt_session   → Mic transcription                  │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  Services Layer:                                                     │
│  - openaiService: embeddings, entity extraction                    │
│  - supabaseService: database queries                               │
│  - chunking: text splitting with overlap                           │
│  - entities: key concept extraction                                │
└──────────────────────┬──────────────────────────────────────────────┘
                       │
          ┌────────────┼────────────┐
          │            │            │
          ▼            ▼            ▼
    ┌─────────┐  ┌────────────┐  ┌──────────────┐
    │ OpenAI  │  │ Supabase   │  │   Vercel     │
    │ Realtime│  │ PostgreSQL │  │  Analytics   │
    │   API   │  │ + pgvector │  │              │
    │         │  │            │  │              │
    │ Models: │  │ Tables:    │  └──────────────┘
    │ - gpt-  │  │ - rag_docs │
    │  realti-│  │ - conversa-│
    │  me-    │  │   tions    │
    │  mini   │  │ - messages │
    │ - text- │  │            │
    │ embedding│ │ Functions: │
    │ -3-small │ │ - match_doc│
    │         │  │   uments() │
    └─────────┘  └────────────┘
```

## Data Flow: Text Chat

```
User types message
    ↓
[Chatbar] "onSendMessage" callback
    ↓
useRealtime: sendMessage(text)
    ↓
wsClient.send({
  type: "user_message",
  text: "What is Newton's law?"
})
    ↓
Backend WebSocket Handler
    ↓
handleUserMessage()
    ├─ Extract query text
    ├─ RAG Query: openaiService.createEmbedding(text)
    ├─ Supabase: match_documents(embedding, top_k=3)
    └─ Get RAG results: [{source, page, snippet, score}, ...]
    ↓
initializeOpenAIConnection() already connected
    ↓
Forward to OpenAI Realtime API with:
{
  type: "conversation.item.create",
  item: {
    type: "message",
    role: "user",
    content: [{ type: "input_text", text: "..." }]
  }
}
+ RAG context injected into system prompt
    ↓
OpenAI streams response via "response.text.delta"
    ↓
Backend accumulates: accumulatedText += chunk
    ↓
Send partial_response to frontend every chunk:
{
  type: "partial_response",
  text: "..." (accumulated so far)
}
    ↓
Frontend: useRealtime receives, updates UI
    ↓
User sees response streaming in real-time
    ↓
OpenAI completes response
    ↓
Backend: Save to Supabase
{
  conversations: { id, title, created_at, updated_at }
  messages: { id, conversation_id, role: "user", content }
  messages: { id, conversation_id, role: "assistant", content, sources }
}
    ↓
Send final_response + rag_sources to frontend:
{
  type: "final_response",
  text: "Newton's second law states...",
  sources: [
    { source: "Physics Textbook", page_number: 42, snippet: "...", score: 0.92 },
    { source: "AP Physics Notes", page_number: 15, snippet: "...", score: 0.88 }
  ]
}
    ↓
Frontend: Display complete message + citations in SourcesPanel
```

## Data Flow: Voice Call

```
User clicks Phone Icon
    ↓
[Chatbar] onCallToggle(true)
    ↓
ChatInterface: handleCallToggle(true)
    ├─ startVoiceCall() → send WS "start_voice_call"
    └─ startCall(sendAudioChunk) → access microphone
    ↓
Backend: handleStartVoiceCall()
    ├─ Set isVoiceCallActive = true
    ├─ Set OpenAI to voice mode
    └─ Send "voice_call_started" to frontend
    ↓
Frontend: useVoiceCall captures audio frames
    ↓
Every 100ms or on buffer full:
    send { type: "audio_chunk", audio: base64(...) }
    ↓
Backend: handleAudioChunk()
    ├─ Accumulate audio frames
    ├─ Forward to OpenAI Realtime API
    └─ Handle buffer management
    ↓
OpenAI:
    ├─ Transcribes user audio (STT)
    ├─ Generates response (LLM)
    └─ Synthesizes audio (TTS)
    ↓
OpenAI streams back:
    ├─ "conversation.item.create" (user message)
    ├─ "response.audio.delta" (TTS chunks)
    └─ "response.text.delta" (text response)
    ↓
Backend:
    ├─ Accumulate TTS audio
    ├─ Send { type: "audio_response", audio: base64(...) } every chunk
    └─ Accumulate text response
    ↓
Frontend: useVoiceCall
    ├─ Receives audio chunks
    ├─ Plays audio via Web Audio API
    └─ Shows transcript in real-time
    ↓
User hears voice response and can interrupt
    ↓
User clicks Phone Icon again
    ↓
Frontend: handleCallToggle(false)
    ├─ endVoiceCall() → send WS "end_voice_call"
    └─ endCall() → stop microphone
    ↓
Backend: handleEndVoiceCall()
    ├─ Set isVoiceCallActive = false
    ├─ Commit pending audio buffers
    └─ Save full conversation to Supabase
    ↓
Voice call ends
```

## Data Flow: STT (Mic Button)

```
User clicks Mic Icon
    ↓
[Chatbar] onMicClick()
    ↓
useSTT: toggleRecording()
    ├─ Access microphone
    └─ Send WS "start_stt_session"
    ↓
Backend: handleStartSTTSession()
    ├─ Set isSTTSessionActive = true
    ├─ Initialize audio buffer
    └─ Send "stt_session_started"
    ↓
Frontend: Capture audio frames every 100ms
    ↓
send { type: "stt_audio_chunk", audio: base64(...) }
    ↓
Backend: handleSTTAudioChunk()
    ├─ Buffer audio frames
    ├─ Send to OpenAI (STT only)
    └─ OpenAI returns transcription deltas
    ↓
Backend: Forward deltas to frontend
    send { type: "stt_transcript_delta", transcript: "what..." }
    ↓
Frontend: useSTT accumulates transcript
    ↓
useRealtime hook receives transcript
    ↓
setMessage(transcript) → Input field auto-populates
    ↓
User clicks Mic Icon again to stop
    ↓
send { type: "end_stt_session" }
    ↓
Backend: Finalize transcript, clean up STT session
    ↓
Frontend: Mic stops, transcript in input ready to send
    ↓
User clicks Send button
    ↓
Transcript sent as regular text message
```

## RAG Pipeline Details

```
INGESTION PHASE (PDF Upload)
─────────────────────────────────────────────────────────
POST /api/rag/ingest
    ↓
multer middleware: extract file
    ↓
pdfParse: extract text from PDF
    ↓
cleanText(): normalize whitespace, remove control chars
    ↓
Split by form feeds (\f) into pages
    ↓
For each page:
  chunkTextByTokens(pageText, 600 tokens, 75 overlap)
    - Approximate tokens: 4 chars = 1 token
    - Break at sentence boundaries
    - Create overlapping chunks
    ↓
For all chunks:
  extractEntitiesBatch(chunks)
    - GPT-3.5-turbo: "Extract key concepts"
    - Returns: ["Newton", "force", "acceleration", ...]
    ↓
For each chunk:
  openaiService.createEmbedding(chunk_text)
    - text-embedding-3-small
    - Returns: 1536-dimensional vector
    ↓
supabaseService.insertDocument({
  source: "filename.pdf",
  page_number: 42,
  chunk_text: "...",
  embedding: [0.123, -0.456, ...],
  entity_tags: ["Newton", "force", ...]
})
    ↓
Database: INSERT INTO rag_documents
    ↓
CREATE INDEX on embedding (ivfflat)
    ↓
Response: { success: true, chunks_created: 150, time_taken_ms: 12345 }


QUERY PHASE (During Chat)
─────────────────────────────────────────────────────────
User asks: "What is Newton's second law?"
    ↓
Backend: RAG Query
  openaiService.createEmbedding(query)
    ↓
  Returns: [0.234, -0.567, ...] (1536 dimensions)
    ↓
  supabaseService.queryDocuments(embedding, top_k=3)
    ↓
  Supabase RPC: match_documents(
    query_embedding: [0.234, -0.567, ...],
    match_count: 3,
    similarity: 1 - (embedding <=> query_embedding)
  )
    ↓
  Uses pgvector cosine distance: <=>
  Sorts by distance (nearest = highest similarity)
  Returns top 3:
    [
      {
        id: uuid,
        source: "Physics Textbook",
        page_number: 42,
        chunk_text: "Newton's second law: F=ma",
        similarity: 0.92
      },
      ...
    ]
    ↓
  Construct RAG context for OpenAI:
  
  "You are a tutoring AI. Here are relevant sources:
  
  [1] Physics Textbook, p.42: 'Newton's second law states F=ma where...'
  [2] AP Physics Notes, p.15: 'The second law relates force to acceleration...'
  
  Use these sources in your response. Cite them."
    ↓
  Forward to OpenAI Realtime with enhanced prompt
    ↓
  OpenAI generates response using RAG context
    ↓
  Response goes to client with sources array
    ↓
Frontend: Display in SourcesPanel
  [1] Physics Textbook — p. 42
      "Newton's second law states F=ma where..."
      Relevance: 92%
  [2] AP Physics Notes — p. 15
      "The second law relates force to acceleration..."
      Relevance: 88%
```

## Database Schema (Quick)

```sql
-- RAG Documents with vector embeddings
rag_documents:
  - id: UUID
  - source: TEXT (filename)
  - page_number: INTEGER
  - chunk_text: TEXT (~600 tokens)
  - embedding: vector(1536) [INDEX: ivfflat]
  - entity_tags: TEXT[]
  - inserted_at: TIMESTAMP

-- Conversation Metadata
conversations:
  - id: UUID
  - title: TEXT (auto-generated)
  - created_at: TIMESTAMP
  - updated_at: TIMESTAMP [TRIGGER: auto-update]
  - user_id: TEXT (nullable)

-- Chat Messages
messages:
  - id: UUID
  - conversation_id: UUID [FOREIGN KEY]
  - role: 'user' | 'assistant'
  - content: TEXT
  - sources: JSONB (RAG citations)
  - image_data: TEXT (base64)
  - image_filename: TEXT
  - is_spoken: BOOLEAN
  - created_at: TIMESTAMP

-- Key Function
match_documents(vector, count, source_filter)
  → Returns top-K similar documents by cosine distance
```

## Hook Dependency Chain

```
ChatInterface Component
    ↓
    ├─ useRealtime()
    │   ├─ WebSocket connection management
    │   ├─ Message state (partial, final)
    │   ├─ Conversation switching
    │   └─ Returns: wsClient, sendMessage, sendImage, etc.
    │
    ├─ useConversations()
    │   ├─ Fetch conversations list
    │   ├─ Fetch single conversation
    │   └─ Returns: conversations[], loading, fetchConversation()
    │
    ├─ useSTT()
    │   ├─ Mic recording state
    │   ├─ Audio capture
    │   └─ Returns: isRecording, transcript, toggleRecording()
    │
    └─ useVoiceCall()
        ├─ Voice mode state
        ├─ Audio playback (TTS)
        └─ Returns: isCallActive, startCall(), endCall()
            └─ Internally uses wsClient from useRealtime
```

## Component Hierarchy

```
RootLayout
  └─ Dashboard
      ├─ Navigation
      ├─ ConversationList
      ├─ FloatingSphere
      └─ ChatInterface
          ├─ Navigation
          ├─ ConversationSidebar
          │   └─ Conversation items (with delete buttons)
          ├─ Main Chat Area
          │   ├─ Card (container)
          │   │   ├─ Connection status banner
          │   │   ├─ Error banner
          │   │   ├─ Messages scroll area
          │   │   │   ├─ ChatMessage (user & assistant)
          │   │   │   └─ Thinking indicator
          │   │   └─ Chatbar (input)
          │   │       ├─ Input field
          │   │       ├─ Image preview
          │   │       ├─ Mic button (STT)
          │   │       ├─ Phone button (voice call)
          │   │       └─ Send button
          │   └─ SourcesPanel (citations)
          │       └─ Collapsible list of sources
          └─ FloatingSphere
```

## Message State Machine

```
Client sends message
    ↓
{ type: "user_message", text: "..." }
    ↓
isLoading = true (UI shows spinner)
    ↓
Backend processes, gets RAG results
    ↓
Forward to OpenAI, get streaming response
    ↓
isThinking = true (thinking indicator shows)
    ↓
Receive partial_response chunks
    ↓
isLoading = false (spinner hides)
    ↓
Accumulate response in UI
    ↓
Receive final_response (complete)
    ↓
isThinking = false (thinking hides)
    ↓
Receive rag_sources
    ↓
Display complete message + sources
    ↓
Save to Supabase (backend already did this)
    ↓
Conversation ready for next message
```

## Critical File Locations

```
Frontend Entry Points:
  src/app/page.tsx              → Dashboard home
  src/app/chat/page.tsx         → New chat
  src/app/chat/[id]/page.tsx    → Resume chat
  src/components/chat-interface.tsx → Core UI (303 lines)
  src/hooks/useRealtime.ts      → Chat logic (568 lines)

Backend Entry Points:
  backend/src/index.ts          → Server startup
  backend/src/websocket/handler.ts → Real-time (1365 lines)
  backend/src/routes/rag.ts     → RAG endpoints

Database:
  supabase/schema.sql           → Full schema + functions

Configuration:
  .env, .env.local              → Secrets (NEVER COMMIT)
  next.config.ts                → Next.js settings
  backend/railway.json          → Railway deployment
```

## Performance Hotspots

```
Bottleneck              Solution
─────────────────────────────────────────────────────────
Large PDF ingestion     → Async chunking + batch embedding
Vector search          → ivfflat index + top-3 results
Message streaming      → Send partial response every chunk
Voice audio buffer     → Handle frames in background
Reconnection logic     → Exponential backoff + debounce
```

## Environment Variable Reference

```
FRONTEND (.env.local or .env.production)
  NEXT_PUBLIC_BACKEND_WS_URL=ws://backend:3001
  NEXT_PUBLIC_BACKEND_HTTP_URL=http://backend:3001

BACKEND (.env)
  OPENAI_API_KEY=sk-...
  SUPABASE_URL=https://xxx.supabase.co
  SUPABASE_SERVICE_KEY=eyJ...
  PORT=3001
  NODE_ENV=development|production
  CORS_ORIGIN=http://localhost:3000,https://app.vercel.app

PRODUCTION (Vercel/Railway Dashboards)
  Same keys, no .env files
  Always use dashboard UI to set secrets
```

---

## Quick Commands

```bash
# Frontend Development
cd frontend && npm run dev         # Start on :3000

# Backend Development
cd backend && npm run dev          # Start on :3001

# Production Builds
npm run build                      # Build everything
cd backend && npm start            # Run backend

# Database
# Access Supabase dashboard for SQL execution

# Testing RAG
cd backend && npm run test-rag     # Test RAG pipeline
```

---

**Last Updated**: October 23, 2025
**Full Documentation**: See CODEBASE_EXPLORATION.md for comprehensive details
