import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { promptSlugEnum } from '@alr/shared';

import type { AgentServices } from '../bootstrap/container.js';
import { validate } from '../utils/validation.js';
import { createAdminGuard } from '../utils/auth.js';
import { createRateLimitGuard } from '../core/security/rate-limit.js';

const createPromptSchema = z.object({
  title: z.string().trim().min(1).max(200),
  content: z.string().trim().min(1),
  active: z.boolean().default(false)
}).strict();

const promptsReadRateLimit = createRateLimitGuard({
  scope: 'public.prompts.read',
  ip: { limit: 60, windowMs: 60_000 }
});

export async function registerPromptsRoutes(app: FastifyInstance, services: AgentServices) {
  const adminGuard = createAdminGuard();

  app.get('/prompts/:slug', { preHandler: promptsReadRateLimit }, async (request, reply) => {
    const slugResult = promptSlugEnum.safeParse((request.params as { slug: string }).slug);
    if (!slugResult.success) {
      reply.code(400).send({ error: 'Invalid prompt slug' });
      return;
    }
    const prompt = await services.promptService.getActive(slugResult.data);
    return { prompt };
  });

  app.get('/prompts/:slug/versions', { preHandler: promptsReadRateLimit }, async (request, reply) => {
    const slugResult = promptSlugEnum.safeParse((request.params as { slug: string }).slug);
    if (!slugResult.success) {
      reply.code(400).send({ error: 'Invalid prompt slug' });
      return;
    }
    const versions = await services.promptService.listVersions(slugResult.data);
    return { versions };
  });

  app.post('/prompts/:slug', { preHandler: adminGuard }, async (request, reply) => {
    const slugResult = promptSlugEnum.safeParse((request.params as { slug: string }).slug);
    if (!slugResult.success) {
      reply.code(400).send({ error: 'Invalid prompt slug' });
      return;
    }

    const parsed = validate(createPromptSchema, request.body, reply);
    if (!parsed.ok) {
      return;
    }

    const version = await services.promptService.createVersion(slugResult.data, parsed.data.title, parsed.data.content, parsed.data.active);
    reply.code(201);
    return { version };
  });

  app.post('/prompts/:slug/:version/activate', { preHandler: adminGuard }, async (request, reply) => {
    const slugResult = promptSlugEnum.safeParse((request.params as { slug: string }).slug);
    if (!slugResult.success) {
      reply.code(400).send({ error: 'Invalid prompt slug' });
      return;
    }
    const version = Number((request.params as { version: string }).version);
    if (!Number.isInteger(version) || version <= 0) {
      reply.code(400).send({ error: 'Invalid prompt version' });
      return;
    }
    const updated = await services.promptService.activate(slugResult.data, version);
    return { version: updated };
  });
}
