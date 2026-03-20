import type { FastifyInstance } from 'fastify';

import { runtimeMode, env } from '../config/env.js';
import { createRateLimitGuard } from '../core/security/rate-limit.js';

const healthRateLimit = createRateLimitGuard({
  scope: 'public.health',
  ip: { limit: 60, windowMs: 60_000 }
});

export async function registerHealthRoutes(app: FastifyInstance) {
  app.get('/health', { preHandler: healthRateLimit }, async () => ({
    status: 'ok',
    service: 'autonomous-lead-to-revenue-agent',
    runtime: {
      nodeEnv: env.NODE_ENV,
      database: runtimeMode.usesDatabase ? 'postgresql' : 'memory',
      redis: runtimeMode.usesRedis ? 'redis' : 'in-memory',
      llmProvider: env.LLM_PROVIDER,
      emailProvider: env.EMAIL_PROVIDER,
      calendarProvider: env.CALENDAR_PROVIDER
    },
    time: new Date().toISOString()
  }));

  app.get('/ready', { preHandler: healthRateLimit }, async () => ({
    ready: true
  }));
}
