import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import { env } from './config/env.js';
import { logger } from './utils/logger.js';
import { requireAdminKey } from './middleware/auth.js';
import { leadsRoutes } from './routes/leads.routes.js';
import { bookingRoutes } from './routes/booking.routes.js';
import { analyticsRoutes } from './routes/analytics.routes.js';
import { optimizationRoutes } from './routes/optimization.routes.js';
import { buildIntegrationOverview } from './modules/integrations/integration.service.js';

function normalizeOrigin(value: string): string {
  const trimmed = value.trim().replace(/\/$/, '');
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  return `https://${trimmed}`;
}

export async function buildApp() {
  const app = Fastify({ logger: false }); // Use our own pino instance

  await app.register(helmet, { contentSecurityPolicy: false });
  await app.register(cors, { origin: normalizeOrigin(env.CORS_ORIGIN), credentials: true });
  await app.register(rateLimit, { max: 200, timeWindow: '1 minute' });

  app.setErrorHandler((err, _req, reply) => {
    logger.error(err);
    if (err.name === 'ZodError') {
      return reply.code(400).send({ success: false, error: 'Validation error', details: err.message });
    }
    return reply.code(err.statusCode ?? 500).send({ success: false, error: err.message ?? 'Internal server error' });
  });

  app.get('/health', async () => ({ status: 'ok', ts: new Date().toISOString() }));
  app.get('/api/v1/integrations', async () => buildIntegrationOverview());

  // Public lead capture routes (no API key)
  await app.register(async (publicApp) => {
    await publicApp.register(leadsRoutes);
    publicApp.addHook('preHandler', async (req, reply) => {
      // Only protect non-capture routes
      const isCapture = req.url === '/api/v1/leads' && req.method === 'POST';
      const isWebhook = req.url === '/api/v1/webhook';
      if (!isCapture && !isWebhook) {
        await requireAdminKey(req, reply);
      }
    });
  }, { prefix: '/api/v1' });

  // Admin protected routes
  await app.register(async (adminApp) => {
    adminApp.addHook('preHandler', requireAdminKey);
    await adminApp.register(bookingRoutes);
    await adminApp.register(analyticsRoutes);
    await adminApp.register(optimizationRoutes);
  }, { prefix: '/api/v1' });

  return app;
}
