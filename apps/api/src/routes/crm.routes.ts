import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { leadStatusEnum } from '@alr/shared';

import { env } from '../config/env.js';
import type { AgentServices } from '../bootstrap/container.js';
import { validate } from '../utils/validation.js';
import { createAdminGuard } from '../utils/auth.js';
import { createRateLimitGuard, extractFieldIdentity } from '../core/security/rate-limit.js';
import { resolveRequestUserId } from '../utils/request-scope.js';

const statusSchema = z.object({
  status: leadStatusEnum,
  note: z.string().trim().max(5000).optional()
}).strict();

const ownerSchema = z.object({
  ownerName: z.string().trim().min(1).max(120)
}).strict();

const noteSchema = z.object({
  note: z.string().trim().min(1).max(5000),
  metadata: z.record(z.unknown()).optional()
}).strict();

const leadIdParamSchema = z.object({
  id: z.string().uuid()
}).strict();

const crmTimelineRateLimit = createRateLimitGuard({
  scope: 'public.crm.timeline',
  ip: { limit: 120, windowMs: 60_000 },
  user: {
    limit: 30,
    windowMs: 60_000,
    extract: (request) => extractFieldIdentity([request.params], ['id'])
  }
});

export async function registerCrmRoutes(app: FastifyInstance, services: AgentServices) {
  const adminGuard = createAdminGuard();

  app.get('/crm/:id/timeline', { preHandler: crmTimelineRateLimit }, async (request, reply) => {
    const parsedParams = leadIdParamSchema.safeParse(request.params);
    if (!parsedParams.success) {
      reply.code(400).send({ error: 'Validation failed', issues: parsedParams.error.flatten() });
      return;
    }

    const { id } = parsedParams.data;
    const ownerUserId = await resolveRequestUserId(request, services);
    if (ownerUserId === null || (ownerUserId === undefined && env.NODE_ENV === 'production')) {
      reply.code(401).send({ error: 'Unauthorized' });
      return;
    }
    if (ownerUserId !== undefined) {
      await services.billingService.assertWorkspaceAccess(ownerUserId);
    }
    try {
      const timeline = await services.crmService.timeline(id, ownerUserId);
      return timeline;
    } catch (error) {
      reply.code(404).send({ error: error instanceof Error ? error.message : 'Lead not found' });
    }
  });

  app.patch('/crm/:id/status', { preHandler: adminGuard }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const parsed = validate(statusSchema, request.body, reply);
    if (!parsed.ok) {
      return;
    }
    await services.crmService.updateStatus(id, parsed.data.status, parsed.data.note);
    return { ok: true };
  });

  app.post('/crm/:id/note', { preHandler: adminGuard }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const parsed = validate(noteSchema, request.body, reply);
    if (!parsed.ok) {
      return;
    }
    await services.crmService.addNote(id, parsed.data.note, parsed.data.metadata ?? {});
    return { ok: true };
  });

  app.post('/crm/:id/owner', { preHandler: adminGuard }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const parsed = validate(ownerSchema, request.body, reply);
    if (!parsed.ok) {
      return;
    }
    await services.crmService.assignOwner(id, parsed.data.ownerName);
    return { ok: true };
  });
}
