# CLAUDE.md — AI Tutoring Platform (M3alem) Integration Guide

## OVERVIEW
This document defines the structure, dependencies, and responsibilities for integrating and finalizing the functionality of the M3alem AI tutoring platform. The goal is to minimize ambiguity and prevent hallucinations by keeping all steps clear and verifiable.

---

## 1. PROJECT STACK
**Frontend:** React + Next.js  
**Backend:** Node.js + Express (hosted on Railway)  
**Database:** Supabase (Vector DB)  
**Deployment:** Vercel (Frontend) + Railway (Backend)

---

## 2. EXISTING STATUS
- The UI is already designed and generated using V0.
- Some dependencies are listed in `package.txt`; Claude must install only relevant ones.
- Routing and API endpoints need to be created.
- No authentication for MVP.
- GPT Realtime API will handle both STT and TTS natively.
- RAG system must use Supabase for vector embeddings and retrieval.

---

## 3. FUNCTIONAL REQUIREMENTS

### 3.1 FRONTEND (Next.js)
- Implement clean routing:
  - `/` → Home/Dashboard (subject buttons, learning streak)
  - `/chat` → Chat interface with M3alem
- Integrate WebSocket connection with backend for GPT Realtime API
- Add UI panel for RAG sources display (entity, page number, source)
- Ensure “Ask M3alem” button or voice sphere is globally accessible

### 3.2 BACKEND (Railway)
- Create WebSocket server to handle:
  - GPT Realtime API communication
  - Event forwarding between frontend and GPT
- Create API endpoints:
  - `/api/rag/upload` → Upload and process syllabus/book PDFs
  - `/api/rag/query` → Query Supabase vector DB for relevant chunks
  - `/api/health` → Simple status check
- Integrate Supabase for RAG storage (using pgvector)
- Ensure low-latency communication between chat and backend

---

## 4. FILES PROVIDED
- `package.txt` — dependency list (use only necessary ones)
- `OpenAI.md` — contains instructions for GPT Realtime implementation
- `RAG.md` — details for embedding, chunking, and querying

---

## 5. DESIGN THEMES
Use the following color scheme consistently:
- White (#FFFFFF) — background and general
- Mint (#A8FBD3) — word-specific highlights
- Teal (#4FB7B3) — key accents and active elements

Maintain a futuristic and sleek tone with friendly, educational energy.

---

## 6. RULES FOR CLAUDE
- Do **not** invent or assume files, functions, or APIs not mentioned.
- Do **not** rewrite the UI structure — only add missing functionality.
- If a dependency is ambiguous, verify it from `package.txt`.
- If any part of the flow is unclear, leave a placeholder comment `// TODO: clarify implementation`.
- Prioritize modular, maintainable, and minimal code.
- Avoid generating unrelated explanations or documentation.

---

## 7. OUTPUT EXPECTATION
Claude’s output should include:
1. Fixed imports and working routing for all pages.
2. Implemented backend WebSocket flow for GPT Realtime.
3. Connected Supabase RAG pipeline (upload → embed → retrieve).
4. Added “Sources” panel logic in chat UI.
5. Minimal logs for debugging and clarity.

---

### END OF CLAUDE.md