import type { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';

import { env } from '../config/env.js';
import type { AgentServices } from '../bootstrap/container.js';
import { createRateLimitGuard } from '../core/security/rate-limit.js';

const cronFollowUpSchema = z.object({
  limit: z.coerce.number().int().positive().max(200).default(100)
}).strict();

const cronRateLimit = createRateLimitGuard({
  scope: 'internal.cron',
  ip: { limit: 60, windowMs: 60_000 }
});

function isAuthorizedCronRequest(request: FastifyRequest): boolean {
  if (!env.CRON_SECRET) {
    return env.NODE_ENV !== 'production';
  }
  const header = request.headers['x-alr-cron-secret'];
  return typeof header === 'string' && header === env.CRON_SECRET;
}

export async function registerCronRoutes(app: FastifyInstance, services: AgentServices) {
  app.post('/internal/cron/followups', { preHandler: cronRateLimit }, async (request, reply) => {
    if (!isAuthorizedCronRequest(request)) {
      reply.code(401).send({ error: 'Unauthorized' });
      return;
    }

    const parsed = cronFollowUpSchema.safeParse(request.body ?? {});
    if (!parsed.success) {
      reply.code(400).send({ error: 'Validation failed', issues: parsed.error.flatten() });
      return;
    }

    const dueLeads = await services.leadService.listDueFollowUps(new Date(), undefined, parsed.data.limit);
    const processed: Array<{ leadId: string; completed: boolean; messageId?: string }> = [];
    const failures: Array<{ leadId: string; error: string }> = [];

    for (const lead of dueLeads) {
      try {
        const result = await services.followUpService.runNextStep(lead.id);
        processed.push({
          leadId: lead.id,
          completed: result.completed,
          ...(result.messageId ? { messageId: result.messageId } : {})
        });
      } catch (error) {
        failures.push({
          leadId: lead.id,
          error: error instanceof Error ? error.message : 'Unknown follow-up error'
        });
      }
    }

    return {
      ok: true,
      mode: env.SERVERLESS_MODE || !env.REDIS_URL ? 'serverless' : 'queue',
      processed: processed.length,
      failures: failures.length,
      processedLeads: processed,
      errors: failures
    };
  });
}
