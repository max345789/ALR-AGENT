import { describe, expect, it } from 'vitest';

import { buildTestContainer } from './helpers.js';

describe('booking system', () => {
  it('creates and confirms a booking from the local availability abstraction', async () => {
    const container = await buildTestContainer();

    try {
      const lead = await container.context.store.leads.create({
        source: 'webhook',
        firstName: 'Maya',
        email: 'maya@example.com',
        company: 'Sunrise Labs',
        message: 'Interested in a demo and a quick discovery call.',
        intentHint: 'demo'
      });

      const offer = await container.services.bookingService.prepareBookingOffer(lead.id);
      expect(offer.booking.bookingToken).toMatch(/^bk_/);
      expect(offer.slots.length).toBeGreaterThan(0);

      const confirmed = await container.services.bookingService.confirmBooking(offer.booking.bookingToken, 'Looks good');
      expect(confirmed.status).toBe('confirmed');

      const leadTimeline = await container.services.leadService.getTimeline(lead.id);
      expect(leadTimeline.bookings.some((booking) => booking.status === 'confirmed')).toBe(true);
    } finally {
      await container.dispose();
    }
  });
});
