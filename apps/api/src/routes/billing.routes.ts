import type { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';

import { env } from '../config/env.js';
import type { AgentServices } from '../bootstrap/container.js';
import { createRateLimitGuard } from '../core/security/rate-limit.js';
import { resolveRequestUserId } from '../utils/request-scope.js';
import { extractHeaderValue } from '../utils/request.js';
import { extractSessionToken } from '../utils/session.js';
import { validate } from '../utils/validation.js';

const checkoutSchema = z.object({
  plan: z.enum(['starter', 'pro', 'enterprise'])
}).strict();

const billingReadRateLimit = createRateLimitGuard({
  scope: 'public.billing.read',
  ip: { limit: 60, windowMs: 60_000 },
  user: {
    limit: 120,
    windowMs: 60_000,
    extract: (request) => extractSessionToken(request)
  }
});

const billingActionRateLimit = createRateLimitGuard({
  scope: 'public.billing.action',
  ip: { limit: 20, windowMs: 60_000 },
  user: {
    limit: 10,
    windowMs: 60_000,
    extract: (request) => extractSessionToken(request)
  }
});

const billingWebhookRateLimit = createRateLimitGuard({
  scope: 'public.billing.webhook',
  ip: { limit: 30, windowMs: 60_000 }
});

export async function registerBillingRoutes(app: FastifyInstance, services: AgentServices) {
  app.get('/billing', { preHandler: billingReadRateLimit }, async (request, reply) => {
    const userId = await resolveRequestUserId(request, services, { allowCaptureKey: false });
    if (!userId) {
      reply.code(401).send({ error: 'Unauthorized' });
      return;
    }

    const billing = await services.billingService.getOverview(userId);
    return { billing };
  });

  app.post('/billing/capture-key/rotate', { preHandler: billingActionRateLimit }, async (request, reply) => {
    const userId = await resolveRequestUserId(request, services, { allowCaptureKey: false });
    if (!userId) {
      reply.code(401).send({ error: 'Unauthorized' });
      return;
    }

    const result = await services.billingService.rotateCaptureKey(userId);
    return result;
  });

  app.post('/billing/checkout', { preHandler: billingActionRateLimit }, async (request, reply) => {
    const userId = await resolveRequestUserId(request, services, { allowCaptureKey: false });
    if (!userId) {
      reply.code(401).send({ error: 'Unauthorized' });
      return;
    }

    const parsed = validate(checkoutSchema, request.body, reply);
    if (!parsed.ok) {
      return;
    }

    const checkout = await services.billingService.createCheckoutSession(userId, parsed.data.plan);
    return checkout;
  });

  app.post('/billing/portal', { preHandler: billingActionRateLimit }, async (request, reply) => {
    const userId = await resolveRequestUserId(request, services, { allowCaptureKey: false });
    if (!userId) {
      reply.code(401).send({ error: 'Unauthorized' });
      return;
    }

    const portal = await services.billingService.createPortalSession(userId);
    return portal;
  });

  app.post('/billing/stripe/webhook', { preHandler: billingWebhookRateLimit }, async (request, reply) => {
    if (!env.STRIPE_WEBHOOK_SECRET) {
      reply.code(503).send({ error: 'Stripe webhook is not configured' });
      return;
    }

    const signature = extractHeaderValue(request, 'stripe-signature');
    if (!signature) {
      reply.code(400).send({ error: 'Missing Stripe signature' });
      return;
    }

    const rawBody = (request as FastifyRequest & { rawBody?: string | Buffer }).rawBody;
    if (!rawBody) {
      reply.code(400).send({ error: 'Missing raw request body' });
      return;
    }

    try {
      const event = services.billingService.verifyStripeWebhookEvent(rawBody, signature);
      await services.billingService.syncFromStripeEvent(event);
      return { received: true };
    } catch (error) {
      reply.code(400).send({ error: error instanceof Error ? error.message : 'Stripe webhook failed' });
    }
  });
}
