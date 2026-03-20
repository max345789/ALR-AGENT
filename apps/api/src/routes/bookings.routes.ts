import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import { env } from '../config/env.js';
import type { AgentServices } from '../bootstrap/container.js';
import { createRateLimitGuard, extractFieldIdentity } from '../core/security/rate-limit.js';
import { resolveRequestUserId } from '../utils/request-scope.js';
import { validate } from '../utils/validation.js';

const bookingOfferSchema = z.object({
  leadId: z.string().uuid()
}).strict();

const confirmBookingSchema = z.object({
  notes: z.string().trim().max(2000).optional()
}).strict();

const leadBookingsParamsSchema = z.object({
  leadId: z.string().uuid()
}).strict();

const bookingTokenParamsSchema = z.object({
  token: z.string().regex(/^bk_[a-f0-9]{24}$/)
}).strict();

const bookingOfferRateLimit = createRateLimitGuard({
  scope: 'public.bookings.offer',
  ip: { limit: 30, windowMs: 60_000 },
  user: {
    limit: 10,
    windowMs: 60_000,
    extract: (request) => extractFieldIdentity([request.body], ['leadId'])
  }
});

const bookingReadRateLimit = createRateLimitGuard({
  scope: 'public.bookings.read',
  ip: { limit: 60, windowMs: 60_000 },
  user: {
    limit: 20,
    windowMs: 60_000,
    extract: (request) => extractFieldIdentity([request.params], ['leadId', 'token'])
  }
});

const bookingConfirmRateLimit = createRateLimitGuard({
  scope: 'public.bookings.confirm',
  ip: { limit: 20, windowMs: 60_000 },
  user: {
    limit: 10,
    windowMs: 60_000,
    extract: (request) => extractFieldIdentity([request.params], ['token'])
  }
});

export async function registerBookingRoutes(app: FastifyInstance, services: AgentServices) {
  app.post('/bookings/offers', { preHandler: bookingOfferRateLimit }, async (request, reply) => {
    const parsed = validate(bookingOfferSchema, request.body, reply);
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

    const offer = await services.bookingService.prepareBookingOffer(parsed.data.leadId, ownerUserId);
    reply.code(201);
    return offer;
  });

  app.get('/bookings/lead/:leadId', { preHandler: bookingReadRateLimit }, async (request, reply) => {
    const parsedParams = leadBookingsParamsSchema.safeParse(request.params);
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

    const bookings = await services.bookingService.listBookings(leadId, ownerUserId);
    return { bookings };
  });

  app.get('/bookings/:token', { preHandler: bookingReadRateLimit }, async (request, reply) => {
    const parsedParams = bookingTokenParamsSchema.safeParse(request.params);
    if (!parsedParams.success) {
      reply.code(400).send({ error: 'Validation failed', issues: parsedParams.error.flatten() });
      return;
    }

    const { token } = parsedParams.data;
    try {
      const ownerUserId = await resolveRequestUserId(request, services);
      if (ownerUserId === null || (ownerUserId === undefined && env.NODE_ENV === 'production')) {
        reply.code(401).send({ error: 'Unauthorized' });
        return;
      }
      if (ownerUserId !== undefined) {
        await services.billingService.assertWorkspaceAccess(ownerUserId);
      }

      const booking = await services.bookingService.getBookingByToken(token, ownerUserId);
      return { booking };
    } catch (error) {
      reply.code(404).send({ error: error instanceof Error ? error.message : 'Booking not found' });
    }
  });

  app.post('/bookings/:token/confirm', { preHandler: bookingConfirmRateLimit }, async (request, reply) => {
    const parsedParams = bookingTokenParamsSchema.safeParse(request.params);
    if (!parsedParams.success) {
      reply.code(400).send({ error: 'Validation failed', issues: parsedParams.error.flatten() });
      return;
    }

    const { token } = parsedParams.data;
    const parsed = validate(confirmBookingSchema, request.body, reply);
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
    const booking = await services.bookingService.confirmBooking(token, parsed.data.notes, ownerUserId);
    return { booking };
  });
}
