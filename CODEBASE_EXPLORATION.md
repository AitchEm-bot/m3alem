# M3alem AI Tutoring Platform - Codebase Exploration Report

## Executive Summary

M3alem is a comprehensive AI-powered tutoring platform built with modern web technologies. It combines real-time conversational AI with RAG (Retrieval-Augmented Generation) capabilities to provide personalized education with textbook citations.

**Current Status**: Deployment-ready MVP with voice call support, vector-based RAG system, and multi-conversation management.

---

## 1. Project Architecture Overview

### Technology Stack

#### Frontend
- **Framework**: Next.js 15 (with App Router)
- **Language**: TypeScript
- **UI Components**: Radix UI + shadcn/ui
- **Styling**: Tailwind CSS v4
- **Real-time**: WebSocket (browser native)
- **Additional Libraries**:
  - React Markdown (with KaTeX & syntax highlighting)
  - Lucide React (icons)
  - DOMPurify (HTML sanitization)
  - Vercel Analytics

#### Backend
- **Runtime**: Node.js (v20+)
- **Framework**: Express.js + TypeScript
- **Real-time**: WebSocket server (`ws` library)
- **Database**: Supabase (PostgreSQL with pgvector)
- **AI Integration**: OpenAI API (Realtime API + embeddings)
- **File Processing**: pdf-parse (PDF extraction)

#### Infrastructure
- **Frontend Hosting**: Vercel
- **Backend Hosting**: Railway
- **Database**: Supabase (managed PostgreSQL)
- **API Provider**: OpenAI (gpt-realtime-mini for chat, text-embedding-3-small for embeddings)

---

## 2. Directory Structure

```
m3alem/
├── frontend/                      # Next.js application (deployed to Vercel)
│   ├── app/
│   │   ├── page.tsx              # Dashboard home page
│   │   ├── layout.tsx            # Root layout
│   │   ├── chat/
│   │   │   ├── page.tsx          # New chat interface
│   │   │   └── [conversationId]/
│   │   │       └── page.tsx      # Existing conversation
│   │   ├── settings/
│   │   │   └── page.tsx          # Settings page
│   │   └── subjects/
│   │       └── page.tsx          # Subject selection
│   ├── components/
│   │   ├── dashboard.tsx         # Main dashboard
│   │   ├── chat-interface.tsx    # Chat UI orchestrator
│   │   ├── Chatbar.tsx          # Message input bar
│   │   ├── ChatMessage.tsx      # Message display
│   │   ├── ConversationSidebar.tsx
│   │   ├── ConversationList.tsx
│   │   ├── SourcesPanel.tsx     # RAG citations display
│   │   ├── floating-sphere.tsx
│   │   └── ui/                  # Base UI components
│   ├── hooks/
│   │   ├── useRealtime.ts       # WebSocket and chat logic (568 lines)
│   │   ├── useSTT.ts            # Speech-to-text
│   │   ├── useVoiceCall.ts      # Voice call handler
│   │   └── useConversations.ts  # Conversation data management
│   ├── lib/
│   │   ├── wsClient.ts          # WebSocket client abstraction
│   │   └── utils.ts             # Utility functions
│   └── package.json
│
├── backend/                       # Express.js server (deployed to Railway)
│   ├── src/
│   │   ├── index.ts             # Server entry point
│   │   ├── routes/
│   │   │   ├── rag.ts           # RAG ingest & query endpoints
│   │   │   ├── conversations.ts # Conversation CRUD
│   │   │   ├── transcribe.ts    # Transcription
│   │   │   └── upload.ts        # Image upload
│   │   ├── services/
│   │   │   ├── openai.ts        # OpenAI API wrapper
│   │   │   ├── supabase.ts      # Supabase client
│   │   │   ├── chunking.ts      # Text chunking for RAG
│   │   │   └── entities.ts      # Entity extraction
│   │   ├── websocket/
│   │   │   └── handler.ts       # WebSocket logic (1365 lines)
│   │   └── types/
│   │       ├── index.ts         # Type definitions
│   │       └── pdf-parse.d.ts   # PDF parser types
│   ├── dist/                    # Compiled JavaScript
│   ├── migrations/              # Database migrations
│   ├── scripts/
│   │   └── test-rag.sh          # RAG testing script
│   └── package.json
│
├── supabase/
│   └── schema.sql               # Database schema with pgvector
│
└── Configuration files
    ├── .env & .env.local        # Environment variables
    ├── next.config.ts           # Next.js config
    ├── tsconfig.json            # TypeScript config
    ├── package.json             # Root dependencies
    └── Documentation
        ├── CLAUDE.md            # Project requirements
        ├── GETTING_STARTED.md   # Setup guide
        ├── DEPLOYMENT.md        # Deployment guide
        ├── RAG.md               # RAG implementation details
        └── OpenAI.md            # OpenAI Realtime API guide
```

---

## 3. Key Features & Functionality

### 3.1 Core Chat Interface
- **Real-time Communication**: WebSocket-based bidirectional chat with OpenAI Realtime API
- **Multi-modal Input**: Text, voice, and image support
- **Message History**: Persistent conversation storage in Supabase
- **Streaming Responses**: Partial response updates shown in real-time
- **Thinking Indicator**: Visual feedback when AI is processing

### 3.2 Retrieval-Augmented Generation (RAG)
- **Document Ingestion**: PDF parsing and chunking (`/api/rag/ingest`)
- **Vector Embeddings**: OpenAI text-embedding-3-small (1536 dimensions)
- **Semantic Search**: pgvector similarity search in Supabase
- **Citation Display**: Source panel showing book title, page number, and relevance score
- **Entity Extraction**: Key concepts tagged and indexed

**RAG Flow**:
1. User uploads PDF → parsed into chunks (600 tokens, 75-token overlap)
2. Each chunk embedded using OpenAI embeddings API
3. Stored in Supabase `rag_documents` table with vector index
4. On user query → vector embedding generated → similarity search → top-3 results
5. Results sent to OpenAI along with query for context-aware response

### 3.3 Voice Features
- **Voice Call Mode**: Real-time audio conversation with TTS/STT
- **STT (Speech-to-Text)**: Mic button for transcription (populates input)
- **Voice Streaming**: Audio chunks sent to backend and streamed to OpenAI
- **Audio Response**: Backend streams TTS audio back to frontend
- **Audio Buffer Management**: Handles voice activity detection and commits

### 3.4 Conversation Management
- **Dashboard**: Quick-start sphere, streak counter, recent conversations
- **Conversation Sidebar**: Collapsible list of all chats
- **Conversation History**: Load existing conversations and resume
- **Auto-Titling**: First message generates conversation title
- **Delete Operations**: Remove conversations with confirmation

### 3.5 User Experience
- **Learning Streak**: Visual counter of consecutive learning days (hardcoded: 7)
- **Color Scheme**: Mint accent (#A8FBD3), Teal (#4FB7B3), White backgrounds
- **Responsive Design**: Desktop-optimized chat interface
- **Error Handling**: Connection status, error messages, loading states
- **Analytics**: Vercel Analytics integration

---

## 4. API Endpoints & Routes

### Backend Routes

#### RAG Endpoints (`/api/rag/`)
```
POST /api/rag/ingest
  - Upload and process PDF documents
  - Chunks text, extracts entities, creates embeddings
  - Request: multipart/form-data (file + source)
  - Response: { success, chunks_created, time_taken_ms, source, errors? }

POST /api/rag/query
  - Query vector database for relevant chunks
  - Request: { query, top_k? }
  - Response: { query, top_k, results[] }
```

#### Conversation Endpoints (`/api/conversations/`)
```
GET /api/conversations
  - List all conversations (ordered by most recent)
  - Response: { conversations[] }

GET /api/conversations/:id
  - Get specific conversation with all messages
  - Response: { id, title, created_at, updated_at, messages[] }

DELETE /api/conversations/:id
  - Delete conversation
```

#### Other Endpoints
```
POST /api/upload-image
  - Upload images with OCR processing
  - Request: { file, caption? }

POST /api/transcribe
  - Transcribe audio files
  - Uses OpenAI Whisper API

GET /
  - Health check
  - Response: { status, service, version, timestamp }
```

### WebSocket Connection (`/ws`)

**Connection Flow**:
1. Client initiates WebSocket connection to `ws://backend:3001/ws`
2. Client sends `start_session` message with session ID and conversation ID
3. Backend connects to OpenAI Realtime API
4. Bidirectional message exchange

**Message Types**:
- `start_session` - Initialize connection
- `user_message` - Send text message
- `user_audio_chunk` - Send audio data
- `upload_image_meta` - Upload image
- `start_voice_call` / `end_voice_call` - Voice mode control
- `audio_chunk` - Audio streaming
- `audio_response` - TTS response
- `audio_transcript` / `user_audio_transcript` - Transcription results
- `partial_response` / `final_response` - Streaming chat response
- `rag_sources` - Citation data
- `start_stt_session` / `end_stt_session` - STT mode

---

## 5. Database Schema

### Tables

#### `rag_documents`
```sql
- id: UUID (primary key)
- source: TEXT (filename/title)
- page_number: INTEGER
- chunk_text: TEXT (2400 chars max ~600 tokens)
- embedding: vector(1536) (OpenAI embeddings)
- entity_tags: TEXT[] (extracted keywords)
- inserted_at: TIMESTAMPTZ
```
**Indexes**: embedding (ivfflat), source, page_number

#### `conversations`
```sql
- id: UUID (primary key)
- title: TEXT (generated from first message)
- created_at: TIMESTAMPTZ
- updated_at: TIMESTAMPTZ (auto-updated)
- user_id: TEXT (nullable for MVP)
```
**Indexes**: created_at DESC, user_id
**Trigger**: Auto-updates `updated_at` on each modification

#### `messages`
```sql
- id: UUID (primary key)
- conversation_id: UUID (foreign key → conversations)
- role: TEXT (CHECK: 'user' | 'assistant')
- content: TEXT (message body)
- sources: JSONB (RAG citations)
- image_data: TEXT (base64 encoded)
- image_filename: TEXT
- is_spoken: BOOLEAN (voice message flag)
- created_at: TIMESTAMPTZ
```
**Indexes**: conversation_id, created_at

### Key Functions
```sql
match_documents(query_embedding vector(1536), match_count INT, filter_source TEXT)
  - Returns top-K most similar documents
  - Uses cosine distance operator (<=>)
```

---

## 6. Frontend Components & Hooks

### Key Components

#### `chat-interface.tsx` (303 lines)
- Orchestrates entire chat experience
- Manages connection state, messages, voice call state
- Handles initial conversation loading
- Coordinates between useRealtime, useSTT, useVoiceCall hooks
- Props: `conversationId?: string | null`

#### `dashboard.tsx`
- Landing page with welcome message, stats cards
- Displays learning streak, total conversations, continue learning
- Recent conversations list
- Links to `/chat` for new conversations

#### `SourcesPanel.tsx`
- Collapsible panel showing RAG citations
- Displays source title, page number, snippet, relevance score
- Expandable/collapsible with scroll area

#### `Chatbar.tsx`
- Text input field with message sending
- Mic button for STT recording
- Phone icon for voice call toggle
- Image upload with preview
- Auto-populates with STT transcript

#### UI Components (shadcn/ui)
- `Card` - Container component
- `Button` - Interactive buttons
- `Input` - Text input field
- `ScrollArea` - Scrollable regions
- `Avatar` - User/bot avatars
- `Separator` - Visual dividers

### Key Hooks

#### `useRealtime.ts` (568 lines)
**Core chat logic**
```typescript
const {
  isConnected,           // WebSocket connection status
  messages,              // Chat message history
  isLoading,             // Sending message
  isThinking,            // AI processing
  error,                 // Connection/error messages
  conversationId,        // Current conversation ID
  sendMessage,           // Send text message
  sendImage,             // Send image with caption
  startVoiceCall,        // Begin voice chat
  endVoiceCall,          // End voice chat
  sendAudioChunk,        // Send audio data
  commitAudio,           // Finalize audio buffer
  wsClient,              // WebSocket client reference
} = useRealtime({ conversationId, initialMessages })
```
- Manages WebSocket connection lifecycle
- Handles partial and final responses
- Manages conversation switching
- Implements reconnection logic with exponential backoff

#### `useConversations.ts`
- Fetch all conversations from `/api/conversations`
- Fetch specific conversation by ID
- Delete conversations
- Update local state on message additions

#### `useSTT.ts`
- Uses browser Web Audio API
- Captures microphone input
- Streams audio chunks to backend
- Receives transcription updates
- Populates transcript into input

#### `useVoiceCall.ts`
- Higher-level wrapper for voice mode
- Handles audio playback of TTS responses
- Manages call start/end
- Integrates with useRealtime for audio streaming

### Custom Utilities
```typescript
generateSessionId()      // UUID generation
cn()                     // ClassNames merging (clsx + tailwind-merge)
truncateText()          // Truncate strings with ellipsis
formatTimestamp()       // Format dates
```

---

## 7. WebSocket Handler (`backend/websocket/handler.ts`)

### Architecture
- One handler per client connection
- Each client maintains connection to both frontend and OpenAI Realtime API
- Proxies messages between client and OpenAI with additional logic

### Key State Per Connection
```typescript
interface ClientConnection {
  clientWs: WebSocket                    // Frontend connection
  openaiWs: WebSocket | null             // OpenAI connection
  sessionId: string | null               // Session identifier
  conversationId: string | null          // Conversation in database
  currentSources: RAGQueryResult[]        // Latest citations
  accumulatedText: string                // Building response
  isVoiceCallActive: boolean             // Voice mode flag
  isSTTSessionActive: boolean            // STT-only mode
  accumulatedTranscript: string          // Building voice transcript
  isResponseInProgress: boolean          // AI generating response
  pendingBufferCommit: boolean           // Delayed audio commit
}
```

### Message Handling Functions

**User Message Flow**:
1. Client sends `user_message` with text
2. RAG query performed if enabled
3. OpenAI Realtime API called with RAG context
4. Responses streamed back as `partial_response` / `final_response`
5. Conversation saved to Supabase

**Image Upload**:
- Parse base64 image
- Store in messages table
- Currently no OCR (marked as future enhancement)

**Voice Call Mode**:
- `start_voice_call` → initialize audio stream handling
- `audio_chunk` → buffer audio frames
- Stream to OpenAI Realtime for transcription
- Route TTS response back to client as `audio_response`
- `end_voice_call` → cleanup

**STT Mode (Mic Button)**:
- `start_stt_session` → begin transcription
- `stt_audio_chunk` → process audio frames
- `stt_transcript_delta` → send partial transcription back
- `end_stt_session` → finalize transcript, send to client
- Transcript appears in input bar for manual send

### Key Functions
```typescript
handleUserMessage()        // Process text messages
handleImageUpload()        // Process image uploads
handleStartVoiceCall()     // Initialize voice mode
handleAudioChunk()         // Buffer audio frames
handleStartSTTSession()    // Begin STT transcription
initializeOpenAIConnection() // Connect to OpenAI Realtime API
loadConversationHistory()  // (Currently disabled)
```

---

## 8. Services & Utilities

### OpenAI Service (`backend/services/openai.ts`)
```typescript
createEmbedding(text)           // Generate 1536-dim embedding
extractEntities(text)           // Extract key concepts via LLM
createStreamingCompletion()     // For RAG-based completions (not used in Realtime)
```
- Uses `text-embedding-3-small` model
- Uses `gpt-3.5-turbo` for entity extraction
- Realtime API handled separately in WebSocket handler

### Supabase Service (`backend/services/supabase.ts`)
```typescript
insertDocument()                // Store RAG chunk with embedding
queryDocuments(embedding, topK) // Vector similarity search
getClient()                     // Direct Supabase client access
```

### Text Chunking (`backend/services/chunking.ts`)
- `chunkTextByTokens()` - Chunk by token count with overlap
  - Default: 600 tokens per chunk, 75 token overlap
  - Breaks at sentence boundaries
  - ~4 characters per token approximation

- `chunkByParagraphs()` - Chunk by paragraph boundaries

### Entity Extraction (`backend/services/entities.ts`)
- Batch extraction using GPT-3.5-turbo
- Extracts key concepts from text chunks
- Stored as `TEXT[]` array in database

---

## 9. Frontend-Backend Communication Flow

### Text Chat Flow
```
Client sends message
  ↓
useRealtime hook → wsClient.send('user_message')
  ↓
Backend WebSocket handler
  ↓
RAG query (if enabled)
  ↓
Forward to OpenAI Realtime API
  ↓
Stream response back
  ↓
Accumulate and format response
  ↓
Send 'partial_response' events to client
  ↓
On completion, save to Supabase
  ↓
Send 'final_response' + 'rag_sources'
  ↓
Client updates UI with full message + citations
```

### Voice Call Flow
```
Client: startVoiceCall()
  ↓
Send 'start_voice_call' WS message
  ↓
Backend: Initialize OpenAI Realtime in voice mode
  ↓
Client: Start audio capture, send 'audio_chunk'
  ↓
Backend: Buffer and forward to OpenAI
  ↓
OpenAI: Real-time transcription + response generation
  ↓
Backend: Stream TTS back as 'audio_response'
  ↓
Client: Play audio, show transcript
  ↓
Client: Send 'end_voice_call'
  ↓
Backend: Cleanup, save conversation
```

### Conversation Loading Flow
```
User navigates to /chat/[id]
  ↓
fetchConversation(id) from useConversations
  ↓
GET /api/conversations/:id
  ↓
Supabase returns messages with sources
  ↓
Pass as initialMessages to useRealtime
  ↓
Messages loaded into chat history
  ↓
User can continue conversation
```

---

## 10. Environment Configuration

### Frontend
```env
NEXT_PUBLIC_BACKEND_WS_URL=ws://localhost:3001         # WebSocket endpoint
NEXT_PUBLIC_BACKEND_HTTP_URL=http://localhost:3001     # HTTP API base
NEXT_PUBLIC_ENV=development                             # Environment
```

### Backend
```env
OPENAI_API_KEY=sk-...                                   # OpenAI API key
SUPABASE_URL=https://xxx.supabase.co                   # Database URL
SUPABASE_SERVICE_KEY=eyJ...                            # Service role key
PORT=3001                                              # Server port
NODE_ENV=development|production                        # Environment
CORS_ORIGIN=http://localhost:3000,*.vercel.app         # CORS whitelist
```

### Production Secrets (Vercel/Railway Dashboard)
- Never commit API keys to `.env` files in production
- Use environment variable dashboards for secret management
- `vercel.json` references environment variable names, not values

---

## 11. Build & Deployment Configuration

### Frontend (`next.config.ts`)
```typescript
{
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true }
}
```
- Allows builds despite linting/TypeScript warnings (should be fixed before production)

### Backend (`railway.json`)
```json
{
  "build": {
    "builder": "nixpacks"
  }
}
```
- Configured for Railway deployment
- Uses Nixpacks builder

### Package Managers
- Frontend: npm + Next.js built-in
- Backend: npm + ts-node for development, tsc for production builds

---

## 12. Testing & Development

### Backend Testing
```bash
npm run dev          # Start with nodemon + ts-node
npm run build        # Compile TypeScript to dist/
npm start            # Run compiled JavaScript
npm run test-rag     # Test RAG pipeline (bash script)
```

### Frontend Development
```bash
npm run dev          # Next.js dev server with turbopack
npm run build        # Production build
npm start            # Start production server
```

### Health Checks
- Backend: `GET /` returns status JSON
- Frontend: Vercel Analytics integration
- Database: Supabase connection tested on startup

---

## 13. Notable Implementation Details

### 1. Token Approximation
- Uses ~4 characters = 1 token approximation for chunking
- Actual tokenizer would be more accurate

### 2. Partial Responses
- Streaming handled at character level
- `partial_response` sent continuously
- `final_response` sent on completion
- Client accumulates into complete message

### 3. Session Management
- Session ID generated client-side
- Conversation ID optional (new chats have null initially)
- Auto-created on first message

### 4. Conversation Auto-Titling
- Database function generates title from first message
- Currently not fully integrated in code
- Falls back to message preview in UI

### 5. Voice & STT Separation
- Voice Call Mode: Full duplex audio streaming
- STT Mode: One-way transcription for mic button
- Both use OpenAI's capabilities via Realtime API

### 6. Error Handling
- Connection errors show in UI banner
- Auto-reconnect with exponential backoff
- Graceful degradation on service failures

### 7. Audio Buffer Management
- Audio frames accumulate in buffer
- Can be manually committed (mic button → Commit)
- Or auto-committed after response completes

### 8. Message Persistence
- Saved after conversation creation
- Includes role, content, sources, image data
- Sources stored as JSONB for flexibility

---

## 14. Code Quality & Patterns

### TypeScript Usage
- Strong typing throughout
- Custom interfaces for domain models
- Type-safe WebSocket messages

### React Best Practices
- Hooks-based functional components
- useCallback for memoized functions
- useRef for WebSocket persistence
- useEffect for side effects management

### Error Handling
- Try-catch blocks in async operations
- Specific error messages for debugging
- Console logging at key points

### Code Organization
- Separation of concerns (hooks, components, services)
- Reusable utility functions
- Custom hooks for complex logic
- Service layer for external APIs

---

## 15. Known Limitations & TODOs

### Current Limitations
1. **No Authentication**: MVP lacks user auth (hardcoded "Sarah", user_id nullable)
2. **Limited File Types**: Only PDF support (no EPUB, DOC, etc.)
3. **No OCR**: Image uploads don't extract text
4. **Conversation History Loading**: Currently disabled in WebSocket handler (line 154)
5. **Fixed Learning Streak**: Hardcoded to 7 days
6. **No Real Persistence**: Images not stored persistently
7. **Chunking Approximation**: Token count uses character estimation

### Code TODOs (from source)
- "TODO: clarify implementation" - Various integration points
- Conversation history loading requires investigation
- Image OCR pipeline not implemented
- STT transcript handling could be optimized

---

## 16. Performance Considerations

### Vector Search
- ivfflat index with 100 lists for ~1000 documents
- Cosine distance for semantic similarity
- Top-3 results per query (configurable)

### Streaming
- Partial messages sent immediately for responsiveness
- Audio chunks buffered server-side
- Lazy loading for conversation lists

### Database
- Indexed for fast lookups
- JSONB for flexible source storage
- Trigger-based auto-updates
- Cascade deletes for referential integrity

---

## 17. Security Notes

### Current MVP (No Auth)
- No user isolation
- All conversations publicly accessible
- API keys in environment (properly)
- CORS configured for specific origins in production

### Production Readiness
- Service role key used for database (not public)
- CORS whitelist prevents unauthorized API access
- WebSocket messages validated on receipt
- XSS protection via DOMPurify

---

## Conclusion

M3alem is a well-structured, modern full-stack application combining:
- **Frontend**: Responsive React/Next.js interface with real-time WebSocket
- **Backend**: Express/Node.js server proxying to OpenAI Realtime API
- **Database**: Supabase PostgreSQL with vector search (pgvector)
- **AI Integration**: OpenAI embeddings + Realtime API for chat & voice

The architecture supports scalability, the code follows TypeScript best practices, and deployment infrastructure is properly configured. The MVP is feature-complete for core functionality with clear paths for future enhancements (authentication, additional file types, OCR, conversation history).

