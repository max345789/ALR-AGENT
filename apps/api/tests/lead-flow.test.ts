import { afterEach, describe, expect, it } from 'vitest';

import { buildTestApp } from './helpers.js';

describe('lead flow', () => {
  it('captures, qualifies, and books a lead through the API', async () => {
    const { app, container } = await buildTestApp();

    try {
      const created = await app.inject({
        method: 'POST',
        url: '/api/v1/leads',
        payload: {
          source: 'web',
          firstName: 'Ava',
          lastName: 'Patel',
          email: 'ava@example.com',
          company: 'Northwind',
          jobTitle: 'Head of Growth',
          message: 'Need pricing and want to book a demo this week.',
          intentHint: 'pricing and demo',
          metadata: {
            tags: ['inbound', 'demo']
          }
        }
      });

      expect(created.statusCode).toBe(201);
      const createdBody = created.json() as { lead: { id: string; status: string } };
      expect(createdBody.lead.id).toMatch(/[0-9a-f-]{36}/);

      const qualified = await app.inject({
        method: 'POST',
        url: `/api/v1/leads/${createdBody.lead.id}/qualify`
      });

      expect(qualified.statusCode).toBe(202);
      const qualifiedBody = qualified.json() as { result: { score: number; segment: string } };
      expect(qualifiedBody.result.score).toBeGreaterThan(0);
      expect(['hot', 'warm', 'cold']).toContain(qualifiedBody.result.segment);

      const offer = await app.inject({
        method: 'POST',
        url: '/api/v1/bookings/offers',
        payload: {
          leadId: createdBody.lead.id
        }
      });

      expect(offer.statusCode).toBe(201);
      const offerBody = offer.json() as { booking: { bookingToken: string; status: string } };
      expect(offerBody.booking.bookingToken).toMatch(/^bk_/);
      expect(offerBody.booking.status).toBe('pending');

      const confirm = await app.inject({
        method: 'POST',
        url: `/api/v1/bookings/${offerBody.booking.bookingToken}/confirm`,
        payload: {
          notes: 'Confirmed during test'
        }
      });

      expect(confirm.statusCode).toBe(200);
      const confirmBody = confirm.json() as { booking: { status: string } };
      expect(confirmBody.booking.status).toBe('confirmed');

      const timeline = await app.inject({
        method: 'GET',
        url: `/api/v1/leads/${createdBody.lead.id}`
      });

      expect(timeline.statusCode).toBe(200);
      const timelineBody = timeline.json() as { bookings: Array<{ status: string }> };
      expect(timelineBody.bookings.some((booking) => booking.status === 'confirmed')).toBe(true);
    } finally {
      await app.close();
      await container.dispose();
    }
  });
});
