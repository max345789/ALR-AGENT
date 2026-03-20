import type { FastifyInstance, FastifyReply } from 'fastify';
import { z } from 'zod';
import { leadCaptureSchema, leadUpdateSchema, leadSourceEnum, leadSegmentEnum, leadStatusEnum } from '@alr/shared';

import { env } from '../config/env.js';
import { createRateLimitGuard, extractFieldIdentity } from '../core/security/rate-limit.js';
import { resolveRequestUserId } from '../utils/request-scope.js';
import { validate } from '../utils/validation.js';
import type { AgentServices } from '../bootstrap/container.js';

const leadListQuerySchema = z.object({
  status: z.union([leadStatusEnum, z.literal('any')]).optional(),
  segment: z.union([leadSegmentEnum, z.literal('any')]).optional(),
  source: z.union([leadSourceEnum, z.literal('any')]).optional(),
  search: z.string().trim().max(200).optional(),
  limit: z.coerce.number().int().positive().max(500).default(100)
}).strict();

const leadIdParamSchema = z.object({
  id: z.string().uuid()
}).strict();

const noteBodySchema = z.object({
  note: z.string().trim().min(1).max(5000),
  metadata: z.record(z.unknown()).optional()
}).strict();

const leadListRateLimit = createRateLimitGuard({
  scope: 'public.leads.list',
  ip: { limit: 120, windowMs: 60_000 }
});

const leadCaptureRateLimit = createRateLimitGuard({
  scope: 'public.leads.capture',
  ip: { limit: 30, windowMs: 60_000 },
  user: {
    limit: 10,
    windowMs: 60_000,
    extract: (request) => extractFieldIdentity([request.body], ['externalId', 'email', 'phone'])
  }
});

const leadDetailRateLimit = createRateLimitGuard({
  scope: 'public.leads.detail',
  ip: { limit: 120, windowMs: 60_000 },
  user: {
    limit: 30,
    windowMs: 60_000,
    extract: (request) => extractFieldIdentity([request.params], ['id'])
  }
});

const leadActionRateLimit = createRateLimitGuard({
  scope: 'public.leads.action',
  ip: { limit: 30, windowMs: 60_000 },
  user: {
    limit: 15,
    windowMs: 60_000,
    extract: (request) => extractFieldIdentity([request.params], ['id'])
  }
});

function applyPublicCors(reply: FastifyReply) {
  reply.header('Access-Control-Allow-Origin', '*');
  reply.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
  reply.header('Access-Control-Allow-Headers', 'Content-Type, X-ALR-Capture-Key, X-Requested-With');
  reply.header('Access-Control-Max-Age', '86400');
}

export async function registerLeadsRoutes(app: FastifyInstance, services: AgentServices) {
  app.options('/leads', async (_request, reply) => {
    applyPublicCors(reply);
    return reply.code(204).send();
  });

  app.get('/leads', { preHandler: leadListRateLimit }, async (request, reply) => {
    const parsed = leadListQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      reply.code(400).send({ error: 'Validation failed', issues: parsed.error.flatten() });
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
    const filter: NonNullable<Parameters<typeof services.leadService.listLeads>[0]> = {
      limit: parsed.data.limit
    };
    if (ownerUserId !== undefined) {
      filter.ownerUserId = ownerUserId;
    }

    if (parsed.data.status !== undefined) {
      filter.status = parsed.data.status;
    }
    if (parsed.data.segment !== undefined) {
      filter.segment = parsed.data.segment;
    }
    if (parsed.data.source !== undefined) {
      filter.source = parsed.data.source;
    }
    if (parsed.data.search !== undefined) {
      filter.search = parsed.data.search;
    }

    const leads = await services.leadService.listLeads(filter);
    return { leads };
  });

  app.post('/leads', { preHandler: leadCaptureRateLimit }, async (request, reply) => {
    applyPublicCors(reply);
    const parsed = validate(leadCaptureSchema, request.body, reply);
    if (!parsed.ok) {
      return;
    }
    const ownerUserId = await resolveRequestUserId(request, services);
    if (ownerUserId === null || (ownerUserId === undefined && env.NODE_ENV === 'production')) {
      reply.code(401).send({ error: 'Capture key required for production lead capture' });
      return;
    }
    if (ownerUserId !== undefined) {
      await services.billingService.assertWorkspaceAccess(ownerUserId);
    }

    const lead = await services.leadService.captureLead(parsed.data, ownerUserId !== undefined ? { ownerUserId } : {});
    if (env.SERVERLESS_MODE || !env.REDIS_URL) {
      const qualified = await services.qualificationService.qualifyLead(lead.id, ownerUserId);
      reply.code(201);
      return { lead: qualified.lead };
    }
    reply.code(201);
    return { lead };
  });

  app.post('/leads/:id/qualify', { preHandler: leadActionRateLimit }, async (request, reply) => {
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
      const result = await services.qualificationService.qualifyLead(id, ownerUserId);
      reply.code(202);
      return result;
    } catch (error) {
      reply.code(404).send({ error: error instanceof Error ? error.message : 'Lead not found' });
    }
  });

  app.get('/leads/:id', { preHandler: leadDetailRateLimit }, async (request, reply) => {
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
      const timeline = await services.leadService.getTimeline(id, ownerUserId);
      return timeline;
    } catch (error) {
      reply.code(404).send({ error: error instanceof Error ? error.message : 'Lead not found' });
    }
  });

  app.patch('/leads/:id', { preHandler: leadActionRateLimit }, async (request, reply) => {
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
    const parsed = validate(leadUpdateSchema, request.body, reply);
    if (!parsed.ok) {
      return;
    }
    const patch: Parameters<typeof services.leadService.updateLead>[1] = {};

    if (parsed.data.status !== undefined) {
      patch.status = parsed.data.status;
    }
    if (parsed.data.segment !== undefined) {
      patch.segment = parsed.data.segment;
    }
    if (parsed.data.score !== undefined) {
      patch.score = parsed.data.score;
    }
    if (parsed.data.tags !== undefined) {
      patch.tags = parsed.data.tags;
    }
    if (parsed.data.ownerName !== undefined) {
      patch.ownerName = parsed.data.ownerName;
    }
    if (parsed.data.notes !== undefined) {
      patch.notes = parsed.data.notes;
    }
    if (parsed.data.metadata !== undefined) {
      patch.metadata = parsed.data.metadata;
    }

    const lead = await services.leadService.updateLead(
      id,
      ownerUserId !== undefined ? { ...patch, ownerUserId } : patch
    );
    return { lead };
  });

  app.post('/leads/:id/note', { preHandler: leadActionRateLimit }, async (request, reply) => {
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
    const parsed = validate(noteBodySchema, request.body, reply);
    if (!parsed.ok) {
      return;
    }
    const lead = await services.leadService.addNote(
      id,
      parsed.data.note,
      parsed.data.metadata ?? {},
      ownerUserId
    );
    return { lead };
  });
}
