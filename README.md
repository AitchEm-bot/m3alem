# M3alem - AI-Powered Educational Assistant 🎓

M3alem (معلم, Arabic for "teacher") is an intelligent educational assistant that leverages OpenAI's Realtime API for conversational streaming and Supabase's pgvector for RAG (Retrieval Augmented Generation) to provide contextual, citation-backed answers from educational materials.

[![Next.js](https://img.shields.io/badge/Next.js-15-black)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-blue)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)
[![OpenAI](https://img.shields.io/badge/OpenAI-Realtime_API-green)](https://openai.com/)
[![Supabase](https://img.shields.io/badge/Supabase-pgvector-green)](https://supabase.com/)

## ✨ Features

- **🎙️ Real-time Voice Interaction**: Full-duplex voice conversations using OpenAI Realtime API
- **💬 Streaming Text Chat**: WebSocket-based real-time messaging with typing indicators
- **📚 RAG-Enhanced Answers**: Context-aware responses using vector embeddings from textbooks and course materials
- **🗣️ Speech-to-Text**: Transcribe voice recordings to populate text input
- **📊 Learning Analytics**: Track streaks, study sessions, and progress across subjects
- **📖 Citation Sources**: View relevant passages with page numbers and relevance scores
- **🎨 Modern UI**: Clean, responsive interface built with Tailwind CSS and Radix UI
- **📷 Image Support**: Upload and analyze educational screenshots

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Frontend (Next.js 15)                  │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐           │
│  │  Chat UI   │  │  Voice UI  │  │ Dashboard  │           │
│  └─────┬──────┘  └─────┬──────┘  └─────┬──────┘           │
│        │               │               │                    │
│        └───────────────┴───────────────┘                    │
│                        │                                    │
│              ┌─────────▼──────────┐                        │
│              │  useRealtime Hook  │                        │
│              │  (WebSocket Client)│                        │
│              └─────────┬──────────┘                        │
└────────────────────────┼─────────────────────────────────┘
                         │ WebSocket (ws/wss)
┌────────────────────────▼─────────────────────────────────┐
│              Backend (Express + WebSocket)                │
│  ┌──────────────────────────────────────────────────┐    │
│  │         WebSocket Handler (handler.ts)           │    │
│  │  ┌──────────────┐  ┌──────────────┐             │    │
│  │  │   Session    │  │  OpenAI RT   │             │    │
│  │  │  Management  │  │  Connection  │             │    │
│  │  └──────────────┘  └──────────────┘             │    │
│  └──────────────────────────────────────────────────┘    │
│                                                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
│  │  RAG Routes  │  │   Upload     │  │Transcription │   │
│  │/api/rag/ingest│ │/api/upload-  │  │/api/transcribe│  │
│  │/api/rag/query│  │  image       │  │              │   │
│  └──────┬───────┘  └──────────────┘  └──────────────┘   │
│         │                                                 │
└─────────┼─────────────────────────────────────────────────┘
          │
┌─────────▼─────────────────────────────────────────────────┐
│           Supabase (PostgreSQL + pgvector)                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
│  │rag_documents │  │conversations │  │   messages   │   │
│  │ (vectors)    │  │              │  │              │   │
│  └──────────────┘  └──────────────┘  └──────────────┘   │
└───────────────────────────────────────────────────────────┘
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- Supabase account with a project created
- OpenAI API key with Realtime API access
- (Optional) Vercel and Railway accounts for deployment

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/m3alem.git
cd m3alem
```

### 2. Set Up Backend

```bash
cd backend
npm install
```

Create `backend/.env`:

```env
OPENAI_API_KEY=sk-...
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=eyJ...
PORT=3001
NODE_ENV=development
CORS_ORIGIN=*
```

### 3. Set Up Database

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Run the schema from `supabase/schema.sql`
4. Verify tables and functions were created:
   - `rag_documents` (with pgvector extension)
   - `conversations`
   - `messages`
   - `match_documents()` function

### 4. Set Up Frontend

```bash
# From project root
npm install
```

Create `.env.local`:

```env
NEXT_PUBLIC_BACKEND_WS_URL=ws://localhost:3001
NEXT_PUBLIC_BACKEND_HTTP_URL=http://localhost:3001
NEXT_PUBLIC_ENV=development
```

### 5. Run the Application

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📚 Using RAG with Educational Content

### Ingest a PDF

Upload a textbook or syllabus to the RAG system:

```bash
curl -X POST http://localhost:3001/api/rag/ingest \
  -F "file=@/path/to/textbook.pdf" \
  -F "source=Physics Textbook - Chapter 3"
```

Response:
```json
{
  "success": true,
  "chunks_created": 245,
  "time_taken_ms": 8340,
  "source": "Physics Textbook - Chapter 3"
}
```

### Query RAG

Test the retrieval system:

```bash
curl -X POST http://localhost:3001/api/rag/query \
  -H "Content-Type: application/json" \
  -d '{
    "query": "What is photosynthesis?",
    "top_k": 3
  }'
```

## 🎙️ Voice Mode

M3alem supports real-time voice conversations using OpenAI's Realtime API:

1. Click the **teal orb** button in the chat interface
2. Grant microphone permissions
3. Speak naturally - the AI responds with voice
4. Click again to end the voice session

Voice features:
- Full-duplex audio (interrupt the AI anytime)
- Automatic transcription display
- Seamless transition between voice and text

## 🛠️ Project Structure

```
m3alem/
├── src/                    # Frontend Next.js app
│   ├── app/                # App router pages
│   │   ├── page.tsx        # Dashboard
│   │   ├── chat/           # Chat interface
│   │   └── layout.tsx      # Root layout
│   ├── components/         # React components
│   │   ├── chat/           # Chat-related components
│   │   ├── voice/          # Voice interaction components
│   │   └── ui/             # Reusable UI components
│   ├── hooks/              # Custom React hooks
│   │   └── useRealtime.ts  # Main WebSocket hook (568 lines)
│   └── lib/                # Utilities
│
├── backend/                # Express.js backend
│   ├── src/
│   │   ├── routes/         # API endpoints
│   │   │   ├── rag.ts      # RAG ingestion & query
│   │   │   ├── upload.ts   # Image upload
│   │   │   ├── transcribe.ts # Speech-to-text
│   │   │   └── conversations.ts # History management
│   │   ├── services/       # Business logic
│   │   │   ├── supabase.ts # Database & vector search
│   │   │   ├── chunking.ts # Text chunking
│   │   │   └── entities.ts # Entity extraction
│   │   ├── websocket/      # WebSocket server
│   │   │   └── handler.ts  # Main WS handler (1,365 lines)
│   │   └── index.ts        # Server entry point
│   └── scripts/
│       └── test-rag.sh     # RAG testing script
│
├── supabase/
│   └── schema.sql          # Database schema
│
├── CLAUDE.md               # AI integration guide
├── DEPLOYMENT.md           # Production deployment guide
├── GETTING_STARTED.md      # Detailed setup instructions
└── package.json            # Frontend dependencies
```

## 🔌 API Reference

### REST Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Health check |
| `/api/rag/ingest` | POST | Upload & process PDF |
| `/api/rag/query` | POST | Query vector database |
| `/api/upload-image` | POST | Upload educational screenshot |
| `/api/transcribe` | POST | Transcribe audio to text |
| `/api/conversations` | GET | List conversation history |
| `/api/conversations/:id` | GET | Get specific conversation |

### WebSocket Messages

**Client → Server:**

```typescript
// Start a session
{ type: "start_session", session_id: string }

// Send user message
{
  type: "user_message",
  session_id: string,
  text: string,
  use_rag: boolean
}

// Start voice mode
{ type: "start_voice_call" }

// Send audio chunk
{ type: "audio_chunk", audio: string (base64) }

// End voice call
{ type: "end_voice_call" }
```

**Server → Client:**

```typescript
// Streaming response
{ type: "partial_response", text: string }

// RAG sources
{
  type: "rag_sources",
  sources: Array<{
    source: string,
    page_number: number,
    snippet: string,
    score: number
  }>
}

// Voice call started
{ type: "voice_call_started" }

// Audio response
{ type: "audio_delta", audio: string (base64) }

// Transcription
{
  type: "transcription",
  text: string,
  speaker: "user" | "assistant"
}

// Final response
{ type: "final_response", text: string, sources: [...] }
```

## 🧪 Testing

Run backend sanity checks:

```bash
cd backend
npm run test-rag
```

This tests:
- Server health
- RAG query functionality
- Image upload endpoint

## 🌐 Deployment

### Frontend (Vercel)

1. Connect your GitHub repository to Vercel
2. Set environment variables in Vercel dashboard:
   ```
   NEXT_PUBLIC_BACKEND_WS_URL=wss://your-backend.railway.app
   NEXT_PUBLIC_BACKEND_HTTP_URL=https://your-backend.railway.app
   NEXT_PUBLIC_ENV=production
   ```
3. Deploy automatically on push to main

### Backend (Railway)

1. Create new Railway project
2. Add environment variables:
   ```
   OPENAI_API_KEY=sk-...
   SUPABASE_URL=https://...
   SUPABASE_SERVICE_KEY=eyJ...
   NODE_ENV=production
   CORS_ORIGIN=https://your-vercel-app.vercel.app
   ```
3. Deploy from GitHub or CLI

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed instructions.

## 🔐 Security Notes

- API keys stored as environment variables only
- File upload limits: 50MB (PDF), 10MB (images)
- CORS configured for specific origins in production
- Input validation on all endpoints
- Rate limiting recommended for production

## 🐛 Troubleshooting

### WebSocket Connection Fails
- Verify `NEXT_PUBLIC_BACKEND_WS_URL` is correct
- Check backend server is running
- Ensure WebSocket upgrades enabled (Railway/hosting)

### RAG Returns No Results
- Confirm documents were ingested successfully
- Check Supabase pgvector extension is enabled
- Verify `match_documents()` function exists

### Voice Mode Not Working
- Ensure microphone permissions granted
- Check OpenAI API key has Realtime API access
- Verify WebSocket connection is stable

### Build Errors
- Run `npm install` to ensure all dependencies installed
- Clear `.next` folder: `rm -rf .next`
- Verify Node.js version >= 18

## 📖 Documentation

- [GETTING_STARTED.md](./GETTING_STARTED.md) - Detailed setup guide
- [DEPLOYMENT.md](./DEPLOYMENT.md) - Production deployment
- [CLAUDE.md](./CLAUDE.md) - AI integration guide
- [RAG.md](./RAG.md) - RAG system details
- [OpenAI.md](./OpenAI.md) - Realtime API implementation
- [CODEBASE_EXPLORATION.md](./CODEBASE_EXPLORATION.md) - Complete technical reference
- [ARCHITECTURE_QUICK_REFERENCE.md](./ARCHITECTURE_QUICK_REFERENCE.md) - Architecture diagrams & flows

## 🛣️ Roadmap

- [ ] User authentication & authorization
- [ ] Multi-language support (Arabic, French, etc.)
- [ ] Mobile app (React Native)
- [ ] Collaborative study sessions
- [ ] Spaced repetition system
- [ ] Export conversation history
- [ ] Advanced analytics dashboard
- [ ] Integration with LMS platforms

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [OpenAI](https://openai.com/) for the Realtime API
- [Supabase](https://supabase.com/) for database and vector search
- [Vercel](https://vercel.com/) for frontend hosting
- [Railway](https://railway.app/) for backend hosting

---

**Built with:**
- Next.js 15 + React 19 + TypeScript
- Express.js + WebSocket
- OpenAI Realtime API
- Supabase + pgvector
- Tailwind CSS v4 + Radix UI

Made with ❤️ for students everywhere
