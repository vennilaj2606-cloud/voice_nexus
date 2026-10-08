# R4R AI – Production-Ready Voice AI SaaS Platform

R4R AI is an enterprise-grade, multi-tenant Voice AI SaaS platform designed to handle incoming and outgoing telephone calls, understand natural human speech, respond dynamically using GPT-4, search business data via database function calling, schedule appointments, and perform vector RAG knowledge retrieval.

---

## Key Features

- **Real-Time Streaming Telephony**: Telnyx and Twilio integration via WebSockets.
- **Low-Latency STT**: Deepgram Nova-2 streaming speech-to-text.
- **GPT-4 Function Calling**: Auto-executes DB searches (`search_properties`, `check_availability`, `book_appointment`, `save_lead`).
- **Interruption Handling**: Instant cancellation of active TTS audio output when caller interrupts.
- **Low-Latency TTS**: ElevenLabs Turbo v2 streaming text-to-speech.
- **RAG Knowledge Base**: Upload PDFs, DOCX files for pgvector vector search.
- **Multi-Tenant SaaS**: Tenant isolation with organization API keys and configurable prompts.
- **Interactive Browser Simulator**: Test live voice conversations directly inside the Next.js enterprise dashboard.

---

## Getting Started

### Prerequisites

- Docker and Docker Compose
- Python 3.12+
- Node.js 18+

### Quickstart with Docker Compose

```bash
# 1. Clone & enter repository
git clone https://github.com/voicenexus/voicenexus-ai.git
cd VoiceNexus-AI

# 2. Copy environment file
cp .env.example .env

# 3. Start all services (PostgreSQL, Redis, FastAPI, Next.js, Nginx)
docker-compose up -d --build
```

Access the applications:
- **Next.js Dashboard**: http://localhost:3000
- **FastAPI API Documentation**: http://localhost:8000/docs
- **Health Check Endpoint**: http://localhost:8000/health

### Cloud Deployment (Render)

To deploy R4R AI to **Render Cloud** in 1 click or manually, follow our detailed [Render Deployment Guide](file:///d:/VoiceNexus%20AI/docs/RENDER_DEPLOYMENT.md). The repository includes a pre-configured `render.yaml` Blueprint.

---

## Project Structure

```
VoiceNexus-AI/
├── backend/
│   ├── app/
│   │   ├── api/             # FastAPI routers
│   │   ├── ai/              # GPT-4 engine, prompt manager & tool executor
│   │   ├── core/            # Security, config & logger
│   │   ├── database/        # Async session & init DB
│   │   ├── models/          # SQLAlchemy pgvector models
│   │   ├── prompts/         # Industry prompt templates
│   │   ├── schemas/         # Pydantic schemas
│   │   ├── services/        # RAG, CRM, Analytics, Auth
│   │   ├── stt/             # Deepgram streaming STT
│   │   ├── telephony/       # Telnyx & Twilio adapters & audio bridge
│   │   ├── tts/             # ElevenLabs streaming TTS
│   │   └── websocket/       # Real-time audio stream handlers
│   ├── alembic/             # Database migrations
│   └── tests/               # Pytest integration tests
├── frontend/
│   ├── app/                 # Next.js App Router pages
│   ├── components/          # Reusable UI components & Sidebar
│   ├── store/               # Zustand state management
│   └── services/            # Axios API client
├── nginx/                   # Nginx reverse proxy & WS config
├── docker-compose.yml       # Docker orchestrator
└── README.md
```
