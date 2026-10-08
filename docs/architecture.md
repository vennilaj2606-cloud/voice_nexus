# R4R AI Architecture & System Specification

R4R AI is an enterprise-grade multi-tenant Voice AI SaaS platform engineered for real-time natural telephone conversations, dynamic database function calling, appointment scheduling, and vector RAG document search.

---

## High-Level Telephony & AI Streaming Architecture

```
[ Caller Telephone ]
        │
        ▼ (PSTN Call)
[ Telnyx / Twilio Voice Gateway ]
        │
        ▼ (G.711 u-law / WebSocket Audio Stream)
[ Nginx Reverse Proxy ]
        │
        ▼ (WebSocket Bridge)
[ FastAPI Async Engine (app/websocket/call_stream_handler.py) ]
   ├── AudioBridge: Convert G.711 u-law (8kHz) ↔ Linear PCM (16kHz)
   ├── STT Engine: Deepgram Nova-2 Streaming API (Low-latency speech-to-text)
   ├── Conversation Engine: OpenAI GPT-4o Streaming + System Prompts + Function Calling
   │       ├── Tool Executor: Database Queries (search_properties, book_appointment, save_lead)
   │       └── RAG Engine: PostgreSQL pgvector Cosine Search
   └── TTS Engine: ElevenLabs Turbo v2 Streaming (Text-to-speech)
```

---

## Core Components

1. **Backend Service**: FastAPI with Python 3.12, AsyncIO, and WebSockets for low-latency streaming pipeline handling.
2. **Telephony Layer**: Pluggable provider adapters (Telnyx & Twilio) implementing `BaseTelephonyProvider`.
3. **Database Architecture**: PostgreSQL 16 with `pgvector` extension for multi-tenant data storage, RAG embeddings, and call conversation logs.
4. **Frontend Dashboard**: Next.js 14, React 18, Tailwind CSS, TypeScript, Zustand, and WebSockets for real-time call monitoring and test simulation.
