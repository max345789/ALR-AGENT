import type { FastifyInstance, FastifyReply } from 'fastify';
import { webhookPayloadSchema } from '@alr/shared';

import { env } from '../config/env.js';
import { validate } from '../utils/validation.js';
import type { AgentServices } from '../bootstrap/container.js';
import { createRateLimitGuard, extractFieldIdentity } from '../core/security/rate-limit.js';
import { resolveRequestUserId } from '../utils/request-scope.js';

const webhookLeadRateLimit = createRateLimitGuard({
  scope: 'public.webhooks.leads',
  ip: { limit: 20, windowMs: 60_000 },
  user: {
    limit: 10,
    windowMs: 60_000,
    extract: (request) => extractFieldIdentity([request.body], ['externalId', 'email'])
  }
});

function applyPublicCors(reply: FastifyReply) {
  reply.header('Access-Control-Allow-Origin', '*');
  reply.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
  reply.header('Access-Control-Allow-Headers', 'Content-Type, X-ALR-Capture-Key, X-Requested-With');
  reply.header('Access-Control-Max-Age', '86400');
}

export async function registerWebhookRoutes(app: FastifyInstance, services: AgentServices) {
  app.options('/webhooks/leads', async (_request, reply) => {
    applyPublicCors(reply);
    return reply.code(204).send();
  });

  app.post('/webhooks/leads', { preHandler: webhookLeadRateLimit }, async (request, reply) => {
    applyPublicCors(reply);
    const parsed = validate(webhookPayloadSchema, request.body, reply);
    if (!parsed.ok) {
      return;
    }
    const ownerUserId = await resolveRequestUserId(request, services);
    if (ownerUserId === null || (ownerUserId === undefined && env.NODE_ENV === 'production')) {
      reply.code(401).send({ error: 'Capture key required for production webhook ingest' });
      return;
    }
    if (ownerUserId !== undefined) {
      await services.billingService.assertWorkspaceAccess(ownerUserId);
    }

    const lead = await services.leadService.captureLead(parsed.data, ownerUserId !== undefined ? { ownerUserId } : {});
    reply.code(201);
    return {
      lead,
      accepted: true
    };
  });
}
