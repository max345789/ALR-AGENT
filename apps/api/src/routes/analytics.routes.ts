import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import { env } from '../config/env.js';
import type { AgentServices } from '../bootstrap/container.js';
import { createRateLimitGuard, extractFieldIdentity } from '../core/security/rate-limit.js';
import { resolveRequestUserId } from '../utils/request-scope.js';
import { validate } from '../utils/validation.js';

const dailyReportSchema = z.object({
  date: z.string().datetime().optional()
}).strict();

const leadMetricsParamsSchema = z.object({
  leadId: z.string().uuid()
}).strict();

const analyticsReadRateLimit = createRateLimitGuard({
  scope: 'public.analytics.read',
  ip: { limit: 120, windowMs: 60_000 }
});

const analyticsReportRateLimit = createRateLimitGuard({
  scope: 'public.analytics.report',
  ip: { limit: 12, windowMs: 60 * 60_000 }
});

const analyticsLeadRateLimit = createRateLimitGuard({
  scope: 'public.analytics.lead',
  ip: { limit: 120, windowMs: 60_000 },
  user: {
    limit: 30,
    windowMs: 60_000,
    extract: (request) => extractFieldIdentity([request.params], ['leadId'])
  }
});

export async function registerAnalyticsRoutes(app: FastifyInstance, services: AgentServices) {
  app.get('/analytics/summary', { preHandler: analyticsReadRateLimit }, async (request, reply) => {
    const ownerUserId = await resolveRequestUserId(request, services);
    if (ownerUserId === null || (ownerUserId === undefined && env.NODE_ENV === 'production')) {
      reply.code(401).send({ error: 'Unauthorized' });
      return;
    }
    if (ownerUserId !== undefined) {
      await services.billingService.assertWorkspaceAccess(ownerUserId);
    }

    const summary = await services.analyticsService.summary(ownerUserId);
    return { summary };
  });

  app.get('/analytics/dashboard', { preHandler: analyticsReadRateLimit }, async (request, reply) => {
    const ownerUserId = await resolveRequestUserId(request, services);
    if (ownerUserId === null || (ownerUserId === undefined && env.NODE_ENV === 'production')) {
      reply.code(401).send({ error: 'Unauthorized' });
      return;
    }
    if (ownerUserId !== undefined) {
      await services.billingService.assertWorkspaceAccess(ownerUserId);
    }

    const dashboard = await services.analyticsService.dashboard(ownerUserId);
    return dashboard;
  });

  app.post('/analytics/daily-report', { preHandler: analyticsReportRateLimit }, async (request, reply) => {
    const parsed = validate(dailyReportSchema, request.body ?? {}, reply);
    if (!parsed.ok) {
      return;
    }
    const ownerUserId = await resolveRequestUserId(request, services);
    if (ownerUserId === null || (ownerUserId === undefined && env.NODE_ENV === 'production')) {
      reply.code(401).send({ error: 'Unauthorized' });
      return;
    }
    if (ownerUserId !== undefined) {
      await services.billingService.assertWorkspaceAccess(ownerUserId);
    }

    const report = await services.analyticsService.dailyReport(parsed.data.date ? new Date(parsed.data.date) : new Date(), ownerUserId);
    reply.code(201);
    return report;
  });

  app.get('/analytics/leads/:leadId', { preHandler: analyticsLeadRateLimit }, async (request, reply) => {
    const parsedParams = leadMetricsParamsSchema.safeParse(request.params);
    if (!parsedParams.success) {
      reply.code(400).send({ error: 'Validation failed', issues: parsedParams.error.flatten() });
      return;
    }

    const { leadId } = parsedParams.data;
    const ownerUserId = await resolveRequestUserId(request, services);
    if (ownerUserId === null || (ownerUserId === undefined && env.NODE_ENV === 'production')) {
      reply.code(401).send({ error: 'Unauthorized' });
      return;
    }
    if (ownerUserId !== undefined) {
      await services.billingService.assertWorkspaceAccess(ownerUserId);
    }

    const metrics = await services.analyticsService.leadMetrics(leadId, ownerUserId);
    return metrics;
  });
}
