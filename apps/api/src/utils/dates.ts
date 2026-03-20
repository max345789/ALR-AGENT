import { addMinutes, addHours, addDays, endOfDay, isBefore, isWeekend, setHours, setMinutes, startOfDay } from 'date-fns';

export function nextWorkingSlot({
  now = new Date(),
  timezone = 'Asia/Kolkata',
  slotMinutes = 30,
  windowDays = 14
}: {
  now?: Date;
  timezone?: string;
  slotMinutes?: number;
  windowDays?: number;
}): { start: Date; end: Date; timezone: string } {
  const candidate = new Date(now);

  for (let dayOffset = 0; dayOffset <= windowDays; dayOffset += 1) {
    const day = addDays(startOfDay(candidate), dayOffset);
    if (isWeekend(day)) {
      continue;
    }

    const dayStart = setMinutes(setHours(day, 9), 0);
    const dayEnd = setMinutes(setHours(day, 17), 0);
    let slotStart = dayOffset === 0 ? addHours(now, 1) : dayStart;
    if (isBefore(slotStart, dayStart)) {
      slotStart = dayStart;
    }

    while (slotStart <= dayEnd) {
      const slotEnd = addMinutes(slotStart, slotMinutes);
      if (slotEnd <= dayEnd) {
        return { start: slotStart, end: slotEnd, timezone };
      }
      slotStart = addMinutes(slotStart, 15);
    }
  }

  const fallbackStart = addHours(now, 48);
  return {
    start: fallbackStart,
    end: addMinutes(fallbackStart, slotMinutes),
    timezone
  };
}

export function toIsoDate(date: Date): string {
  return date.toISOString();
}

export function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export function isExpired(reference: Date, thresholdHours: number): boolean {
  return reference.getTime() < addHours(new Date(), -thresholdHours).getTime();
}

export function clampDate(date: Date, min: Date, max: Date): Date {
  if (date.getTime() < min.getTime()) {
    return min;
  }
  if (date.getTime() > max.getTime()) {
    return max;
  }
  return date;
}
