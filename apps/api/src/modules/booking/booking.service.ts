import { prisma } from '../../db/client.js';
import { env } from '../../config/env.js';
import { logger } from '../../utils/logger.js';
import { v4 as uuidv4 } from 'uuid';

export async function getAvailableSlots(timezone: string, windowDays?: number): Promise<Array<{ start: string; end: string; timezone: string }>> {
  const slotMinutes = env.BOOKING_SLOT_MINUTES;
  const daysWindow = windowDays ?? env.BOOKING_WINDOW_DAYS;
  const slots: Array<{ start: string; end: string; timezone: string }> = [];

  const existingBookings = await prisma.booking.findMany({
    where: { status: { in: ['confirmed', 'pending'] }, slotStart: { gte: new Date() } },
    select: { slotStart: true, slotEnd: true }
  });

  const bookedTimes = new Set(existingBookings.map(b => b.slotStart.toISOString()));
  const now = new Date();

  for (let d = 1; d <= daysWindow; d++) {
    const day = new Date(now);
    day.setDate(day.getDate() + d);
    const dayOfWeek = day.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) continue; // Skip weekends

    // 9am–5pm slots
    for (let hour = 9; hour < 17; hour++) {
      for (let min = 0; min < 60; min += slotMinutes) {
        const start = new Date(day);
        start.setHours(hour, min, 0, 0);
        if (start <= now) continue;
        const end = new Date(start.getTime() + slotMinutes * 60000);
        if (!bookedTimes.has(start.toISOString())) {
          slots.push({ start: start.toISOString(), end: end.toISOString(), timezone });
        }
      }
    }
    if (slots.length >= 20) break;
  }

  return slots.slice(0, 20);
}

export async function bookSlot(leadId: string, slotStart: string, timezone: string, durationMinutes: number, notes?: string) {
  const lead = await prisma.lead.findUniqueOrThrow({ where: { id: leadId } });
  const start = new Date(slotStart);
  const end = new Date(start.getTime() + durationMinutes * 60000);
  const bookingId = uuidv4();
  const meetingLink = `${env.APP_URL}/booking/${bookingId}`;

  const booking = await prisma.booking.create({
    data: {
      leadId,
      slotStart: start,
      slotEnd: end,
      timezone,
      meetingLink,
      provider: env.CALENDAR_PROVIDER,
      status: 'confirmed',
      notes: notes ?? null,
      metadata: { bookingId }
    }
  });

  await prisma.lead.update({ where: { id: leadId }, data: { status: 'booked' } });

  await prisma.timelineEvent.create({
    data: {
      leadId,
      type: 'booking_created',
      title: 'Meeting booked',
      body: `Meeting scheduled for ${start.toISOString()}. Link: ${meetingLink}`
    }
  });

  logger.info({ leadId, slotStart, meetingLink }, 'Booking confirmed');
  return booking;
}

export async function getBookings(leadId?: string) {
  return prisma.booking.findMany({
    where: leadId ? { leadId } : undefined,
    orderBy: { slotStart: 'asc' },
    include: { lead: { select: { firstName: true, lastName: true, email: true } } }
  });
}

export async function cancelBooking(bookingId: string) {
  const booking = await prisma.booking.update({
    where: { id: bookingId },
    data: { status: 'cancelled' }
  });
  await prisma.timelineEvent.create({
    data: {
      leadId: booking.leadId,
      type: 'booking_cancelled',
      title: 'Meeting cancelled',
      body: `Booking ${bookingId} was cancelled`
    }
  });
  return booking;
}
