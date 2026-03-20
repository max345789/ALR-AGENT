import type { FastifyInstance } from 'fastify';
import { bookingRequestSchema } from '@alr/shared';
import { getAvailableSlots, bookSlot, getBookings, cancelBooking } from '../modules/booking/booking.service.js';

export async function bookingRoutes(app: FastifyInstance) {
  app.get('/bookings/slots', async (req, reply) => {
    const query = req.query as any;
    const slots = await getAvailableSlots(query.timezone ?? 'Asia/Kolkata', query.days ? parseInt(query.days) : undefined);
    return reply.send({ success: true, data: slots });
  });

  app.post('/bookings', async (req, reply) => {
    const data = bookingRequestSchema.parse(req.body);
    const booking = await bookSlot(data.leadId, data.requestedDate ?? new Date(Date.now() + 24 * 3600 * 1000).toISOString(), data.timezone, data.durationMinutes, data.notes);
    return reply.code(201).send({ success: true, data: booking });
  });

  app.get('/bookings', async (req, reply) => {
    const query = req.query as any;
    const bookings = await getBookings(query.leadId);
    return reply.send({ success: true, data: bookings });
  });

  app.delete('/bookings/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    const booking = await cancelBooking(id);
    return reply.send({ success: true, data: booking });
  });
}
