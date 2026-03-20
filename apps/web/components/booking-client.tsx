'use client';

import { useEffect, useState, type FormEvent } from 'react';

import { confirmBooking, getBooking } from '../lib/api';
import type { BookingResponse } from '../lib/types';
import { ActionButton, Badge, Card } from './ui';

interface BookingClientProps {
  token: string;
}

export function BookingClient({ token }: BookingClientProps) {
  const [data, setData] = useState<BookingResponse | null>(null);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const booking = await getBooking(token);
        if (active) {
          setData(booking);
        }
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : 'Unable to load booking');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      active = false;
    };
  }, [token]);

  async function handleConfirm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setSaving(true);
    setMessage(null);
    setError(null);

    try {
      const confirmed = await confirmBooking(token, notes.trim() || undefined);
      setData(confirmed);
      setMessage('Booking confirmed.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to confirm booking');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="app-shell dashboard-shell">
        <Card className="h-72 animate-pulse">
          <div className="h-full w-full rounded-[20px] bg-white/50" />
        </Card>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="app-shell dashboard-shell">
        <Card className="py-20 text-center">
          <p className="text-sm text-slate-500">{error ?? 'Booking not found'}</p>
          <ActionButton variant="ghost" className="mt-6" onClick={() => window.location.assign('/dashboard')}>
            Back to dashboard
          </ActionButton>
        </Card>
      </div>
    );
  }

  const booking = data.booking;
  const confirmed = booking.status === 'confirmed';

  return (
    <main className="app-shell dashboard-shell">
      <section className="hero dashboard-hero">
        <div className="hero-copy">
          <Badge tone={confirmed ? 'success' : 'warning'}>{booking.status}</Badge>
          <h1>Confirm your meeting</h1>
          <p>
            This slot is reserved for {new Date(booking.slotStart).toLocaleString()}.
          </p>

          <div className="hero-actions">
            <ActionButton variant="ghost" onClick={() => window.location.assign('/dashboard')}>
              Back to dashboard
            </ActionButton>
          </div>

          {message && (
            <div className="mt-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700">
              {message}
            </div>
          )}
          {error && (
            <div className="mt-4 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          )}
        </div>

        <Card className="space-y-4">
          <div className="rounded-[24px] border border-white/70 bg-white/70 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Slot</p>
            <p className="mt-2 text-sm font-semibold text-slate-900">{new Date(booking.slotStart).toLocaleString()}</p>
          </div>
          <div className="rounded-[24px] border border-white/70 bg-white/70 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Ends</p>
            <p className="mt-2 text-sm font-semibold text-slate-900">{new Date(booking.slotEnd).toLocaleString()}</p>
          </div>
          <div className="rounded-[24px] border border-white/70 bg-white/70 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Link</p>
            <p className="mt-2 break-all text-sm font-semibold text-slate-900">{booking.meetingLink}</p>
          </div>
        </Card>
      </section>

      <div className="content-grid single">
        <Card>
          <h2 className="page-title">Finalize booking</h2>
          <p className="page-subtitle">Add a short note if you want to share context with the sales team.</p>

          <form className="mt-6 space-y-4" onSubmit={(event) => void handleConfirm(event)}>
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={5}
              placeholder="Optional note"
              className="w-full resize-none rounded-[24px] border border-white/70 bg-white/80 px-4 py-3 text-sm text-slate-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)] outline-none transition-all duration-300 placeholder:text-slate-400 focus:border-slate-300 focus:bg-white"
            />

            <ActionButton type="submit" loading={saving} success={confirmed}>
              Confirm meeting
            </ActionButton>
          </form>
        </Card>
      </div>
    </main>
  );
}
