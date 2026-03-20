# Google Cloud Deployment

This repository supports a Google Cloud setup that does not require an always-on worker.

## Architecture

- Cloud Run: `web`
- Cloud Run: `api`
- Cloud SQL: PostgreSQL
- Cloud Scheduler: triggers follow-up processing
- Secret Manager: stores secrets

## Why this mode works

- Lead capture still writes to PostgreSQL.
- Lead qualification runs immediately on lead capture when `SERVERLESS_MODE=true`.
- Follow-ups are processed by a Cloud Scheduler call to the API cron route.
- OpenAI remains the model provider.
- Redis and the standalone worker are not required in this mode.

## Environment variables

Set these in Cloud Run:

```env
NODE_ENV=production
SERVERLESS_MODE=true
CRON_SECRET=your-long-random-secret
LLM_PROVIDER=openai
OPENAI_API_KEY=...
OPENAI_BASE_URL=https://api.openai.com/v1
EMAIL_PROVIDER=smtp
SMTP_HOST=...
SMTP_PORT=587
SMTP_USER=...
SMTP_PASS=...
EMAIL_FROM=...
DATABASE_URL=postgresql://...
APP_URL=https://your-web-service-url
PUBLIC_APP_URL=https://your-domain.com
CORS_ORIGIN=https://your-domain.com
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REDIRECT_URI=https://your-api-service-url/api/v1/auth/google/callback
```

You can leave `REDIS_URL` empty in this mode.

## Deploy steps

1. Create a Google Cloud project.
2. Enable Cloud Run, Cloud SQL, Secret Manager, Cloud Scheduler, and Artifact Registry.
3. Create a PostgreSQL Cloud SQL instance.
4. Deploy the API container to Cloud Run.
5. Deploy the web container to Cloud Run.
6. Point the app to the Cloud SQL connection string.
7. Add the secrets in Secret Manager and attach them to the Cloud Run services.
8. Create a Cloud Scheduler job that calls:

```http
POST /api/v1/internal/cron/followups
X-ALR-CRON-SECRET: <your-secret>
```

9. Set the Scheduler cadence to every 15 minutes or every hour.
10. Send one test lead and confirm it is qualified and visible in the dashboard.

## Cost notes

- Cloud Run scales to zero when idle.
- Cloud SQL is the main fixed monthly cost.
- Cloud Scheduler is inexpensive for a single follow-up job.
- This mode avoids Memorystore and an always-on worker.
