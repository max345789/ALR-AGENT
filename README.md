# Autonomous Lead-to-Revenue Agent

Autonomous Lead-to-Revenue Agent is a production-oriented monorepo for capturing leads, qualifying them with a model-agnostic LLM layer, scheduling follow-ups, generating booking offers, syncing CRM state, and running optimization loops.

## Architecture

- `apps/api`: Fastify + TypeScript API, worker entrypoint, queue processing, Prisma persistence, LLM/messaging/calendar abstractions.
- `apps/web`: Next.js app router frontend for strict V1 onboarding, workflow guidance, lead capture, dashboarding, lead detail, and booking confirmation.
- `packages/shared`: Shared Zod schemas, prompt seeds, and domain enums used by both apps.
- `docker-compose.yml`: PostgreSQL, Redis, API, worker, web, and Nginx.

## Folder Structure

```text
apps/
  api/
    prisma/
    src/
      bootstrap/
      config/
      core/
      modules/
      routes/
      utils/
    tests/
  web/
    app/
    components/
    lib/
packages/
  shared/
nginx/
```

## Quick Start (Local)

### Prerequisites

- Node.js 22+
- Docker + Docker Compose

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
# Defaults work out-of-the-box for local development (mock LLM, console email)
```

### 3. Start PostgreSQL and Redis

```bash
docker compose up postgres redis -d
```

### 4. Run database migrations + seed

```bash
# Generate Prisma client
npm run db:generate

# Deploy migrations
npm run migrate:deploy

# Seed default prompts and follow-up sequence
npx tsx apps/api/prisma/seed.ts
```

### 5. Start all services

```bash
# Terminal 1: API + Web (concurrent)
npm run dev

# Terminal 2: Background worker (qualification, follow-up, optimization jobs)
cd apps/api && npx tsx watch src/bootstrap/worker.ts
```

| Service | URL |
|---------|-----|
| Web dashboard | http://localhost:3000 |
| API | http://localhost:4000/api/v1 |
| API health | http://localhost:4000/health |

### Run tests

```bash
npm test
```

### Typecheck all packages

```bash
npm run lint
```

## Dockerized Local Stack

1. Copy `.env.example` to `.env` only if you want to override the built-in defaults.
2. Start the stack:
   ```bash
   docker compose up --build
   ```

The stack includes:

- API on `http://localhost:4000`
- Web on `http://localhost:3000`
- Nginx on `http://localhost:80`
- PostgreSQL on `localhost:5432`
- Redis on `localhost:6379`

## Environment Variables

The project runs with safe defaults for local development, but the following variables are available for production overrides.

- `NODE_ENV`
- `LOG_LEVEL`
- `PORT`
- `WEB_PORT`
- `APP_URL`
- `API_URL`
- `NEXT_PUBLIC_API_BASE_URL`
- `DATABASE_URL`
- `REDIS_URL`
- `CORS_ORIGIN`
- `ADMIN_API_KEYS`
- `ADMIN_API_KEY`
- `WORKSPACE_TRIAL_DAYS`
- `CAPTURE_KEY_PREFIX`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRICE_STARTER`
- `STRIPE_PRICE_PRO`
- `STRIPE_PRICE_ENTERPRISE`
- `STRIPE_PORTAL_RETURN_URL`
- `LLM_PROVIDER`
- `LLM_MODEL`
- `OPENAI_API_KEY`
- `OPENAI_BASE_URL`
- `ANTHROPIC_API_KEY`
- `ANTHROPIC_BASE_URL`
- `LOCAL_LLM_BASE_URL`
- `EMAIL_PROVIDER`
- `EMAIL_WEBHOOK_URL`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASS`
- `EMAIL_FROM`
- `WHATSAPP_PROVIDER`
- `WHATSAPP_API_URL`
- `WHATSAPP_API_TOKEN`
- `CALENDAR_PROVIDER`
- `CALENDAR_PUBLIC_URL`
- `CALENDAR_WEBHOOK_URL`
- `CALENDAR_TIMEZONE`
- `BOOKING_SLOT_MINUTES`
- `BOOKING_WINDOW_DAYS`
- `AUTO_PROMOTION`
- `DEFAULT_SEQUENCE_NAME`
- `DEFAULT_TIMEZONE`

`ADMIN_API_KEYS` accepts a comma-separated list, which lets you rotate admin keys without breaking existing clients. `ADMIN_API_KEY` remains as a legacy fallback for local compatibility, but production deployments should prefer `ADMIN_API_KEYS`.

### Email provider setup

- The local Docker stack ships with Mailpit, so the default SMTP target is `mailpit:1025`.
- Open `http://localhost:8025` to inspect password reset and follow-up emails during local development.
- `EMAIL_PROVIDER=smtp` sends through any SMTP provider. Set `SMTP_HOST`, `SMTP_PORT`, and optionally `SMTP_USER` and `SMTP_PASS`.
- `EMAIL_PROVIDER=webhook` POSTs email payloads to `EMAIL_WEBHOOK_URL`, which is useful if you want to route mail through your own relay.
- Keep `EMAIL_FROM` set to a verified sender address for your mail provider.
- Password reset, follow-up, and notification emails all use the same server-side mail path; the browser never receives mail credentials.

## API Overview

### Visible in strict V1

- `POST /api/v1/auth/login`
- `POST /api/v1/auth/signup`
- `POST /api/v1/auth/forgot-password`
- `POST /api/v1/auth/reset-password`
- `GET /api/v1/auth/me`
- `GET /api/v1/auth/google/start`
- `GET /api/v1/auth/google/callback`
- `POST /api/v1/leads`
- `POST /api/v1/webhooks/leads`
- `GET /api/v1/leads`
- `GET /api/v1/leads/:id`
- `POST /api/v1/leads/:id/qualify`
- `POST /api/v1/bookings/offers`
- `POST /api/v1/bookings/:token/confirm`
- `GET /api/v1/integrations`
- `GET /api/v1/prompts/:slug`

### Hidden in strict V1

- `GET /api/v1/analytics/dashboard`
- `POST /api/v1/analytics/daily-report`

## Strict V1 User Workflow

1. Sign in or create an account with email or Google.
2. Open `/workflow` to see the exact customer journey and the remaining external setup checklist.
3. Open `/integrations` and connect one source first: website form, REST API, or webhook receiver.
4. Send one test lead from the source or from the integrations page.
5. Confirm the lead appears in `/leads` and `/dashboard`.
6. Let the agent qualify the lead, send follow-ups, and prepare booking.
7. Review the lead timeline and notes in the dashboard.

## Remaining External Setup

Everything needed for local development is already wired. These are the only tasks that still require your own accounts, infrastructure, or deployment targets:

- Create `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `GOOGLE_REDIRECT_URI` if you want Google login.
- Configure a real email provider and verified sender if you want mail to go to user inboxes instead of local testing.
- Connect a live calendar provider if you want booking sync outside local mode.
- Point your website, CRM, or automation platform at `POST /api/v1/leads` or `POST /api/v1/webhooks/leads`.
- Set production domain and runtime environment variables when you deploy off localhost.
- Set `ADMIN_API_KEYS` for secure server-side admin actions in production.
- Set `LLM_PROVIDER` and the provider-specific key or base URL if you switch away from the current provider.

## Connecting Customer Platforms

The product includes a dedicated onboarding surface for connecting a customer's own lead sources.

- Open `/integrations` in the web app to see the current capture endpoints, webhook receiver, runtime status, and copyable payload examples.
- Send website or backend leads to `POST /api/v1/leads`.
- Forward CRM or automation events to `POST /api/v1/webhooks/leads`.
- Verify the connection by sending a test lead from the integrations page and confirming it appears in `/leads` and `/dashboard`.
- The dashboard includes a connection guide card so customers can move from setup to active monitoring without guessing where data enters the system.

## Deployment

### VPS

1. Provision a VPS with Docker and Docker Compose.
2. Set production secrets in the environment.
3. Build and start the stack:
   ```bash
   docker compose up --build -d
   ```
4. Put a TLS certificate in front of Nginx using Let’s Encrypt or your preferred certificate provider.
5. Point your domain to the VPS and route traffic to Nginx.

### Nginx

- Reverse proxies `/api/` to the API service.
- Reverse proxies `/` to the Next.js web service.
- Includes an SSL-ready server block template in `nginx/default.conf`.

### Vercel

- Deploy `apps/web` as a standalone Next.js app.
- Set `NEXT_PUBLIC_API_BASE_URL` to the production API URL, for example `https://api.example.com/api/v1`.
- Keep the API, worker, Postgres, and Redis on your VPS or another backend platform.

### Render Blueprint

This repository also includes a `render.yaml` Blueprint for a split production deployment:

- `web`: Next.js frontend
- `api`: Fastify API
- `worker`: background jobs
- `postgres`: managed PostgreSQL
- `redis`: managed Redis / queue store

Recommended launch flow:

1. Push the repository to a Git remote.
2. Create the Render Blueprint from `render.yaml`.
3. Set the production secrets in Render:
   - OpenAI API key
   - Stripe secret key and price IDs
   - SMTP credentials
   - Google OAuth credentials
   - `ADMIN_API_KEYS`
4. Point your custom domain at the web service.
5. Set `APP_URL`, `PUBLIC_APP_URL`, and `CORS_ORIGIN` to the live domain.
6. Run a test lead, a password reset, and a booking confirmation before going live.

For a saleable MVP, keep the first launch simple:

- one workspace per customer
- lead capture plus qualification
- email follow-up
- booking handoff
- Stripe billing and plan gating
- no WhatsApp until after launch unless you already need it

## Connecting a Real LLM

Set in `.env` — no code changes needed:

```env
# OpenAI
LLM_PROVIDER=openai
LLM_MODEL=gpt-4o-mini
OPENAI_API_KEY=sk-...

# Anthropic
LLM_PROVIDER=anthropic
LLM_MODEL=claude-sonnet-4-6
ANTHROPIC_API_KEY=sk-ant-...

# Local (Ollama)
LLM_PROVIDER=local
LLM_MODEL=llama3
LOCAL_LLM_BASE_URL=http://localhost:11434/v1
```

## Notes

- LLM provider selection is adapter-based and switches between OpenAI-compatible, Anthropic, local (Ollama), and mock providers via `LLM_PROVIDER` env var.
- The strict V1 UI hides analytics and daily-report surfaces so customers only see the core revenue loop.
- Booking offers are generated from a calendar abstraction. Set `CALENDAR_PROVIDER=webhook` with `CALENDAR_WEBHOOK_URL` to integrate with an external calendar system.
- All LLM calls are logged to `PromptExecution` for full observability and prompt debugging.
- The system runs with an in-memory store in test mode (no database required for tests).
