import { randomUUID } from 'node:crypto';

import { addDays, addMinutes, isWeekend, setHours, setMinutes, startOfDay } from 'date-fns';

import type { BookingSlot } from '@alr/shared';

import { env } from '../../config/env.js';
import { nextWorkingSlot } from '../../utils/dates.js';

function normalizeBaseUrl(value: string): string {
  const trimmed = value.trim().replace(/\/$/, '');
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  return `https://${trimmed}`;
}

export interface CalendarAvailabilityRequest {
  timezone: string;
  slotMinutes: number;
  windowDays: number;
  count?: number;
  now?: Date;
}

export interface CalendarGateway {
  readonly provider: string;
  findAvailability(request: CalendarAvailabilityRequest): Promise<BookingSlot[]>;
  generateBookingLink(token: string): string;
}

class LocalCalendarGateway implements CalendarGateway {
  readonly provider = 'local';

  constructor(private readonly appUrl: string, private readonly bookingPrefix = '/book') {}

  async findAvailability(request: CalendarAvailabilityRequest): Promise<BookingSlot[]> {
    const count = request.count ?? 5;
    const slots: BookingSlot[] = [];
    let cursor = nextWorkingSlot({
      ...(request.now ? { now: request.now } : {}),
      timezone: request.timezone,
      slotMinutes: request.slotMinutes,
      windowDays: request.windowDays
    }).start;

    while (slots.length < count) {
      if (isWeekend(cursor)) {
        cursor = addDays(startOfDay(cursor), 1);
        cursor = setMinutes(setHours(cursor, 9), 0);
        continue;
      }

      const slotEnd = addMinutes(cursor, request.slotMinutes);
      if (slotEnd.getHours() > 17 || (slotEnd.getHours() === 17 && slotEnd.getMinutes() > 0)) {
        cursor = addDays(startOfDay(cursor), 1);
        cursor = setMinutes(setHours(cursor, 9), 0);
        continue;
      }

      slots.push({
        start: cursor.toISOString(),
        end: slotEnd.toISOString(),
        timezone: request.timezone
      });

      cursor = addMinutes(cursor, request.slotMinutes + 60);
    }

    return slots;
  }

  generateBookingLink(token: string): string {
    const base = this.appUrl.replace(/\/$/, '');
    return `${base}${this.bookingPrefix}/${token}`;
  }
}

class WebhookCalendarGateway implements CalendarGateway {
  readonly provider = 'webhook';

  constructor(
    private readonly webhookUrl: string,
    private readonly fallback: CalendarGateway,
    private readonly publicBookingBase?: string
  ) {}

  async findAvailability(request: CalendarAvailabilityRequest): Promise<BookingSlot[]> {
    try {
      const response = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          action: 'availability',
          timezone: request.timezone,
          slotMinutes: request.slotMinutes,
          windowDays: request.windowDays,
          count: request.count ?? 5,
          now: request.now?.toISOString() ?? new Date().toISOString()
        })
      });

      if (!response.ok) {
        throw new Error(`Webhook returned ${response.status}`);
      }

      const data = (await response.json()) as { slots?: BookingSlot[] };
      if (Array.isArray(data.slots) && data.slots.length > 0) {
        return data.slots;
      }
    } catch (error) {
      console.warn('Calendar webhook unavailable, falling back to local scheduling.', error);
    }

    return this.fallback.findAvailability(request);
  }

  generateBookingLink(token: string): string {
    const base = this.publicBookingBase?.replace(/\/$/, '');
    return base ? `${base}/book/${token}` : this.fallback.generateBookingLink(token);
  }
}

export function createCalendarGateway(): CalendarGateway {
  const publicBase = normalizeBaseUrl(env.CALENDAR_PUBLIC_URL ?? env.APP_URL);
  const fallback = new LocalCalendarGateway(publicBase, '/book');
  if (env.CALENDAR_PROVIDER === 'webhook' && env.CALENDAR_WEBHOOK_URL) {
    return new WebhookCalendarGateway(env.CALENDAR_WEBHOOK_URL, fallback, publicBase);
  }
  return fallback;
}

export function createBookingToken(): string {
  return `bk_${randomUUID().replace(/-/g, '').slice(0, 24)}`;
}
