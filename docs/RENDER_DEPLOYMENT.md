# Moving R4R AI to Render Cloud (onrender.com)

This guide walks you through moving and hosting the full R4R AI platform (PostgreSQL + pgvector, FastAPI Backend, Next.js Frontend) on **Render Cloud**.

---

## Architecture on Render

```
                          ┌────────────────────────┐
                          │   User Web Browser     │
                          └───────────┬────────────┘
                                      │ HTTPS
                                      ▼
                      ┌────────────────────────────────┐
                      │    voicenexus-frontend         │
                      │  (Render Web Service: Node 18) │
                      │       Next.js 14 Dashboard     │
                      └───────────────┬────────────────┘
                                      │ REST & WS
                                      ▼
                      ┌────────────────────────────────┐
                      │    voicenexus-backend          │
                      │ (Render Web Service: Python 3) │
                      │   FastAPI, WebSockets, STT/TTS │
                      └───────────────┬────────────────┘
                                      │ Internal Network
                                      ▼
                      ┌────────────────────────────────┐
                      │    voicenexus-postgres         │
                      │  (Render Managed PostgreSQL)   │
                      │       pgvector Extension       │
                      └────────────────────────────────┘
```

> **Why Nginx is not needed on Render:**
> Render provides automated global load balancers with free, managed SSL/TLS certificates, DDoS protection, and native WebSocket support. You do not need the Docker Nginx reverse proxy on Render.

---

## Prerequisites

1. A **GitHub** or **GitLab** account.
2. A **Render** account ([render.com](https://render.com)).
3. API Keys for your AI and Voice providers:
   - **OpenAI API Key** (for GPT-4o engine and text embeddings)
   - **Deepgram API Key** (for streaming STT)
   - **ElevenLabs API Key** (for streaming TTS)
   - *(Optional)* **Twilio** or **Telnyx** credentials (for inbound/outbound phone numbers).

---

## Method 1: 1-Click Blueprint Deployment (Recommended)

R4R AI includes a pre-configured `render.yaml` Blueprint file in the root directory.

### Step 1: Push Code to your GitHub Repository

Run these commands in your project root terminal:

```bash
# 1. Initialize git (already completed if you ran git init)
git init

# 2. Stage all files and commit
git add .
git commit -m "Add Render cloud deployment configuration"

# 3. Create a new repository on GitHub, then link and push
git remote add origin https://github.com/<your-username>/<your-repo-name>.git
git branch -M main
git push -u origin main
```

### Step 2: Deploy via Blueprint on Render

1. Log into your [Render Dashboard](https://dashboard.render.com).
2. Click **New +** in the top right, then select **Blueprint**.
3. Connect your **R4R AI** GitHub repository.
4. Render will read `render.yaml` and show:
   - `voicenexus-postgres` (PostgreSQL 16)
   - `voicenexus-backend` (FastAPI Web Service)
   - `voicenexus-frontend` (Next.js 14 Web Service)
5. Fill in the required secret environment variables prompted by Render:
   - `OPENAI_API_KEY`
   - `DEEPGRAM_API_KEY`
   - `ELEVENLABS_API_KEY`
   - `TELNYX_API_KEY` (or leave placeholder if not yet using)
   - `TWILIO_ACCOUNT_SID` & `TWILIO_AUTH_TOKEN` (or leave placeholder)
6. Click **Apply**.
7. Render will automatically provision the database, build both services, run migrations/seed data, and assign live public URLs:
   - Backend: `https://voicenexus-backend.onrender.com`
   - Frontend: `https://voicenexus-frontend.onrender.com`

---

## Method 2: Manual Step-by-Step Setup via Render Dashboard

If you prefer to configure each service manually via the Render UI:

### Step 1: Create PostgreSQL Database

1. In Render Dashboard, click **New +** -> **PostgreSQL**.
2. Set:
   - **Name**: `voicenexus-postgres`
   - **Database**: `voicenexus_db`
   - **User**: `voicenexus`
   - **Region**: Choose your nearest region (e.g., Oregon or Frankfurt).
   - **PostgreSQL Version**: `16`
   - **Plan**: `Starter` (Persistent; Note: Render Free PostgreSQL expires after 30 days).
3. Click **Create Database**.
4. Once created, copy the **Internal Database URL** (e.g. `postgres://voicenexus:pass@dpg-xxx:5432/voicenexus_db`).

---

### Step 2: Create FastAPI Backend Web Service

1. Click **New +** -> **Web Service**.
2. Connect your repository.
3. Configure the service:
   - **Name**: `voicenexus-backend`
   - **Root Directory**: `backend`
   - **Environment**: `Python 3`
   - **Region**: Select the **same region** as your PostgreSQL database.
   - **Branch**: `main`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - **Health Check Path**: `/health`
4. In the **Environment Variables** section, add:

| Key | Value | Description |
|---|---|---|
| `ENVIRONMENT` | `production` | Production environment flag |
| `PROJECT_NAME` | `R4R AI` | App name |
| `DATABASE_URL` | *Paste Internal Database URL* | Render automatically handles asyncpg conversion |
| `SECRET_KEY` | *Generate a random 32+ char key* | JWT secret |
| `ALLOWED_ORIGINS` | `https://voicenexus-frontend.onrender.com` | Frontend origin allowed by CORS |
| `OPENAI_API_KEY` | `sk-...` | OpenAI API Key |
| `OPENAI_MODEL` | `gpt-4o` | Model name |
| `DEEPGRAM_API_KEY` | `...` | Deepgram STT key |
| `ELEVENLABS_API_KEY` | `sk_...` | ElevenLabs TTS key |
| `ELEVENLABS_VOICE_ID` | `21m00Tcm4TlvDq8ikWAM` | Preferred voice ID |
| `TWILIO_ACCOUNT_SID` | *(Your Twilio SID)* | Optional |
| `TWILIO_AUTH_TOKEN` | *(Your Twilio Token)* | Optional |
| `TELNYX_API_KEY` | *(Your Telnyx Key)* | Optional |

5. Click **Create Web Service**.
6. When deployment finishes, copy your live backend URL (e.g., `https://voicenexus-backend.onrender.com`).

---

### Step 3: Create Next.js Frontend Web Service

1. Click **New +** -> **Web Service**.
2. Connect your repository.
3. Configure the service:
   - **Name**: `voicenexus-frontend`
   - **Root Directory**: `frontend`
   - **Environment**: `Node`
   - **Region**: Same region as backend.
   - **Branch**: `main`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
4. In the **Environment Variables** section, add:

| Key | Value |
|---|---|
| `NODE_VERSION` | `18.20.0` |
| `NEXT_PUBLIC_API_BASE_URL` | `https://voicenexus-backend.onrender.com/api/v1` |

> ⚠️ **Important:** In Next.js, `NEXT_PUBLIC_*` variables are baked in during `npm run build`. Always ensure `NEXT_PUBLIC_API_BASE_URL` is set before triggering the build.

5. Click **Create Web Service**.

---

### Step 4: Link Frontend & Backend CORS

1. Go back to your `voicenexus-backend` service in Render.
2. In **Environment Variables**, ensure `ALLOWED_ORIGINS` includes your live frontend URL:
   ```
   ALLOWED_ORIGINS=https://voicenexus-frontend.onrender.com
   ```
3. Click **Save Changes** (Render will re-deploy backend within ~30 seconds).

---

## Post-Deployment Verification

1. **Backend Health Check**:
   Open in browser:
   `https://voicenexus-backend.onrender.com/health`
   Should return: `{"status":"healthy","service":"R4R AI","version":"1.0.0","environment":"production"}`

2. **Interactive API Documentation**:
   Visit:
   `https://voicenexus-backend.onrender.com/docs`

3. **Log in to Frontend**:
   Open:
   `https://voicenexus-frontend.onrender.com/login`
   Use default seeded admin credentials:
   - **Email**: `admin@apexrealty.com`
   - **Password**: `password123`

4. **Live Call Simulator**:
   Navigate to the **Live Calls** page to test browser-based voice synthesis and microphone transcription.

---

## Telephony Webhook Configuration

When you connect real telephone numbers, configure your webhooks to point to your live Render backend URL:

### Twilio
- In Twilio Console -> Phone Numbers -> Active Numbers -> Configure:
- Under **A Call Comes In**:
  - Webhook URL: `https://voicenexus-backend.onrender.com/api/v1/telephony/twilio/incoming`
  - HTTP Method: `POST`

### Telnyx
- In Telnyx Mission Control Portal -> Outbound Voice Profile / TeXml Webhooks:
- Webhook URL: `https://voicenexus-backend.onrender.com/api/v1/telephony/telnyx/webhook`
- HTTP Method: `POST`

---

## Free Tier vs Starter Tier (Important Note)

- **Render Free Web Services**:
  - Free instances spin down (sleep) after 15 minutes of inactivity. The first subsequent request can take 30–50 seconds to wake up.
  - For real-time voice telephony (inbound calls), an incoming call may time out if the instance is asleep.
  - **Recommendation**: Use the **Starter** plan ($7/mo per web service) so the backend remains active 24/7 with zero cold start latency.
- **Render Free PostgreSQL**:
  - Free PostgreSQL instances expire after 30 days and are deleted.
  - **Recommendation**: Use Render's Starter PostgreSQL ($7/mo) or connect a managed external database (e.g. Neon or Supabase) via `DATABASE_URL`.
