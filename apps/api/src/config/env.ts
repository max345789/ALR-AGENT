import 'dotenv/config';

import { z } from 'zod';

const emptyStringToUndefined = (value: unknown) => (value === '' ? undefined : value);

const optionalUrl = () => z.preprocess(emptyStringToUndefined, z.string().url().optional());
const defaultUrl = (fallback: string) => z.preprocess(emptyStringToUndefined, z.string().url().default(fallback));

const schema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(4000),
  LOG_LEVEL: z.string().default('info'),
  DATABASE_URL: optionalUrl(),
  REDIS_URL: optionalUrl(),
  ADMIN_API_KEY: z.string().optional(),
  ADMIN_API_KEYS: z.string().optional(),
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
  APP_URL: z.string().default('http://localhost:3000'),
  PUBLIC_APP_URL: z.string().default('http://localhost'),

  // Auth
  AUTH_COOKIE_NAME: z.string().default('alr_session'),
  AUTH_COOKIE_SECURE: z.string().default('false').transform((value) => value === 'true'),
  AUTH_SESSION_TTL_DAYS: z.coerce.number().default(30),
  AUTH_PASSWORD_RESET_TTL_MINUTES: z.coerce.number().default(60),
  AUTH_OAUTH_STATE_TTL_MINUTES: z.coerce.number().default(10),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_REDIRECT_URI: optionalUrl(),

  // LLM
  LLM_PROVIDER: z.enum(['openai', 'anthropic', 'local', 'mock']).default('mock'),
  LLM_MODEL: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_BASE_URL: defaultUrl('https://api.openai.com/v1'),
  ANTHROPIC_API_KEY: z.string().optional(),
  ANTHROPIC_BASE_URL: defaultUrl('https://api.anthropic.com'),
  LOCAL_LLM_BASE_URL: defaultUrl('http://localhost:11434/v1'),

  // Email
  EMAIL_PROVIDER: z.enum(['smtp', 'console', 'webhook']).default('console'),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  EMAIL_WEBHOOK_URL: optionalUrl(),
  EMAIL_FROM: z.string().default('lead-agent@example.com'),

  // WhatsApp
  WHATSAPP_PROVIDER: z.enum(['whatsapp_cloud', 'stub', 'webhook']).default('stub'),
  WHATSAPP_API_URL: optionalUrl(),
  WHATSAPP_API_TOKEN: z.string().optional(),

  // Booking/Calendar
  CALENDAR_PROVIDER: z.enum(['local', 'caldav', 'google', 'webhook']).default('local'),
  CALENDAR_PUBLIC_URL: optionalUrl(),
  CALENDAR_WEBHOOK_URL: optionalUrl(),
  CALENDAR_TIMEZONE: z.string().default('Asia/Kolkata'),
  BOOKING_SLOT_MINUTES: z.coerce.number().default(30),
  BOOKING_WINDOW_DAYS: z.coerce.number().default(14),
  WORKER_CONCURRENCY: z.coerce.number().int().min(1).max(100).default(10),

  // Billing / SaaS
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  STRIPE_PRICE_STARTER: z.string().optional(),
  STRIPE_PRICE_PRO: z.string().optional(),
  STRIPE_PRICE_ENTERPRISE: z.string().optional(),
  STRIPE_PORTAL_RETURN_URL: optionalUrl(),
  WORKSPACE_TRIAL_DAYS: z.coerce.number().default(14),
  CAPTURE_KEY_PREFIX: z.string().default('cap'),

  // Automation
  AUTO_PROMOTION: z.string().transform((value) => value === 'true').default('true'),
  DEFAULT_SEQUENCE_NAME: z.string().default('default-outreach'),
  DEFAULT_TIMEZONE: z.string().default('Asia/Kolkata')
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error('Invalid environment variables:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
export const runtimeMode = {
  usesDatabase: Boolean(env.DATABASE_URL),
  usesRedis: Boolean(env.REDIS_URL)
} as const;

export type Env = typeof env;
