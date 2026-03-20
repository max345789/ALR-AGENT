import fastify, { type FastifyInstance } from 'fastify';
import rawBody from 'fastify-raw-body';

import { env } from '../config/env.js';
import type { AgentContainer } from './container.js';
import { registerRoutes } from '../routes/index.js';
import { buildIntegrationOverview } from '../modules/integrations/integration.service.js';
import { createRateLimitGuard, closeRateLimitStore } from '../core/security/rate-limit.js';

const healthRateLimit = createRateLimitGuard({
  scope: 'public.health',
  ip: { limit: 60, windowMs: 60_000 }
});

const integrationRateLimit = createRateLimitGuard({
  scope: 'public.integrations',
  ip: { limit: 60, windowMs: 60_000 }
});

export async function createApp(container: AgentContainer): Promise<FastifyInstance> {
  const app = fastify({
    logger: {
      level: env.LOG_LEVEL
    },
    bodyLimit: 1_048_576,
    // Trust only local and private-network proxy hops so rate limiting can
    // see the real client IP while direct public connections are still treated
    // as untrusted.
    trustProxy: ['127.0.0.1', '::1', '10.0.0.0/8', '172.16.0.0/12', '192.168.0.0/16', 'fc00::/7']
  });

  app.addHook('onSend', async (_request, reply, payload) => {
    reply.header('X-Content-Type-Options', 'nosniff');
    reply.header('X-Frame-Options', 'DENY');
    reply.header('Referrer-Policy', 'strict-origin-when-cross-origin');
    reply.header('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    reply.header('Cache-Control', 'no-store');
    return payload;
  });

  await app.register(rawBody, {
    field: 'rawBody',
    global: true,
    encoding: 'utf8',
    runFirst: true
  });

  app.setErrorHandler((error: Error & { statusCode?: number }, _request, reply) => {
    app.log.error({ err: error }, 'Unhandled request error');
    const statusCode = error.statusCode ?? 500;
    reply.status(statusCode).send({
      error: statusCode === 500 ? 'Internal Server Error' : error.message
    });
  });

  app.get('/health', { preHandler: healthRateLimit }, async () => ({ status: 'ok', ts: new Date().toISOString() }));
  app.get('/api/v1/integrations', { preHandler: integrationRateLimit }, async () => buildIntegrationOverview());

  app.register(
    async (instance) => {
      await registerRoutes(instance, container.services);
    },
    { prefix: '/api/v1' }
  );

  app.addHook('onClose', async () => {
    await closeRateLimitStore();
  });

  return app;
}
