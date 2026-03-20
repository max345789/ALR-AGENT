'use client';

import Link from 'next/link';
import { useEffect, useState, type FormEvent } from 'react';

import { addCrmNote, createBookingOffer, getLead, getLeadMetrics, runQualification } from '../lib/api';
import type { LeadTimelineResponse } from '../lib/types';
import { ActionButton, Badge, Card, MetricCard } from './ui';

interface LeadDetailClientProps {
  leadId: string;
}

type LeadAction = 'qualify' | 'booking' | 'note' | null;

function formatDate(value: string | null | undefined) {
  return value ? new Date(value).toLocaleDateString() : '—';
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString();
}

export function LeadDetailClient({ leadId }: LeadDetailClientProps) {
  const [data, setData] = useState<LeadTimelineResponse | null>(null);
  const [metrics, setMetrics] = useState<{ leadId: string; messages: number; bookings: number; followUps: number; activities: number } | null>(null);
  const [note, setNote] = useState('');
  const [savingAction, setSavingAction] = useState<LeadAction>(null);
  const [loading, setLoading] = useState(true);
  const [lastAction, setLastAction] = useState<LeadAction>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const saving = savingAction !== null;

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const [timeline, leadMetrics] = await Promise.all([getLead(leadId), getLeadMetrics(leadId)]);
        if (!active) return;
        setData(timeline);
        setMetrics(leadMetrics);
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : 'Unable to load lead');
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
  }, [leadId]);

  async function refresh() {
    setLoading(true);
    setError(null);

    try {
      const [timeline, leadMetrics] = await Promise.all([getLead(leadId), getLeadMetrics(leadId)]);
      setData(timeline);
      setMetrics(leadMetrics);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to refresh lead');
    } finally {
      setLoading(false);
    }
  }

  async function sendQualification() {
    setSavingAction('qualify');
    setError(null);

    try {
      await runQualification(leadId);
      await refresh();
      setLastAction('qualify');
      setMessage('Qualification job launched.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to requalify lead');
    } finally {
      setSavingAction(null);
    }
  }

  async function handleBookingOffer() {
    setSavingAction('booking');
    setError(null);

    try {
      await createBookingOffer(leadId);
      await refresh();
      setLastAction('booking');
      setMessage('Booking offer prepared.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to prepare booking offer');
    } finally {
      setSavingAction(null);
    }
  }

  async function handleAddNote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!note.trim()) return;

    setSavingAction('note');
    setError(null);

    try {
      await addCrmNote(leadId, note.trim());
      setNote('');
      await refresh();
      setLastAction('note');
      setMessage('Note saved.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save note');
    } finally {
      setSavingAction(null);
    }
  }

  if (loading && !data) {
    return (
      <div className="app-shell dashboard-shell">
        <div className="grid gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-28 animate-pulse rounded-[24px] border border-white/70 bg-white/70" />
          ))}
        </div>
        <div className="mt-6 h-72 animate-pulse rounded-[28px] border border-white/70 bg-white/70" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="app-shell dashboard-shell">
        <Card className="py-20 text-center">
          <p className="text-sm text-slate-500">{error ?? 'Lead not found'}</p>
          <ActionButton variant="ghost" className="mt-6" onClick={() => window.location.assign('/dashboard')}>
            Back to dashboard
          </ActionButton>
        </Card>
      </div>
    );
  }

  const lead = data.lead;
  const segmentTone = lead.segment === 'hot' ? 'danger' : lead.segment === 'warm' ? 'warning' : 'info';
  const statusTone = lead.status === 'won' ? 'success' : lead.status === 'lost' ? 'danger' : lead.status === 'booked' ? 'info' : 'neutral';

  return (
    <main className="app-shell dashboard-shell">
      <div className="mb-6">
        <Link href="/dashboard" className="text-sm font-medium text-slate-500 transition-colors hover:text-slate-900">
          ← Back to dashboard
        </Link>
      </div>

      <section className="hero dashboard-hero">
        <div className="hero-copy">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            {lead.segment && <Badge tone={segmentTone}>{lead.segment}</Badge>}
            <Badge tone={statusTone}>{lead.status}</Badge>
          </div>
          <h1>{[lead.firstName, lead.lastName].filter(Boolean).join(' ') || 'Unnamed lead'}</h1>
          <p>
            {lead.company || 'No company'} · {lead.email || 'No email'}
          </p>

          <div className="hero-actions">
            <ActionButton onClick={() => void sendQualification()} disabled={saving} loading={savingAction === 'qualify'} success={lastAction === 'qualify' && !saving}>
              Run qualification
            </ActionButton>
            <ActionButton variant="secondary" onClick={() => void handleBookingOffer()} disabled={saving} loading={savingAction === 'booking'} success={lastAction === 'booking' && !saving}>
              Prepare booking offer
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

        <Card className="space-y-3">
          <div className="rounded-[24px] border border-white/70 bg-white/70 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Score</p>
            <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">{lead.score ?? '—'}</p>
          </div>
          <div className="rounded-[24px] border border-white/70 bg-white/70 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Owner</p>
            <p className="mt-2 text-sm font-semibold text-slate-900">{lead.ownerName || 'Unassigned'}</p>
          </div>
          <div className="rounded-[24px] border border-white/70 bg-white/70 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Next follow-up</p>
            <p className="mt-2 text-sm font-semibold text-slate-900">{formatDate(lead.nextFollowUpAt)}</p>
          </div>
          <div className="rounded-[24px] border border-white/70 bg-white/70 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Metrics</p>
            <p className="mt-2 text-sm font-semibold text-slate-900">
              {metrics ? `${metrics.messages} msgs · ${metrics.bookings} bookings` : '—'}
            </p>
          </div>
        </Card>
      </section>

      <div className="metrics-grid">
        <MetricCard label="Activities" value={metrics?.activities ?? '—'} />
        <MetricCard label="Messages" value={metrics?.messages ?? '—'} />
        <MetricCard label="Bookings" value={metrics?.bookings ?? '—'} />
        <MetricCard label="Follow-up runs" value={metrics?.followUps ?? '—'} />
      </div>

      <div className="content-grid">
        <Card>
          <h2 className="page-title">Lead summary</h2>
          <p className="page-subtitle">{lead.summary || lead.message || 'No summary yet.'}</p>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {[
              { label: 'Intent', value: lead.intent || lead.intentHint || 'Unknown' },
              { label: 'Qualified', value: formatDate(lead.qualifiedAt) },
              { label: 'Booked', value: formatDate(lead.bookedAt) },
              { label: 'Converted', value: formatDate(lead.convertedAt) }
            ].map((item) => (
              <div key={item.label} className="rounded-[20px] border border-white/70 bg-white/75 p-4">
                <p className="text-xs text-slate-500">{item.label}</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">{item.value}</p>
              </div>
            ))}
          </div>

          {lead.tags.length > 0 && (
            <div className="mt-6 flex flex-wrap gap-2">
              {lead.tags.map((tag) => (
                <Badge key={tag} tone="neutral">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <h2 className="page-title">CRM note</h2>
          <p className="page-subtitle">Capture manual context alongside autonomous activity.</p>

          <form className="mt-6 space-y-4" onSubmit={(event) => void handleAddNote(event)}>
            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              rows={5}
              placeholder="Add a note for the sales team"
              className="w-full resize-none rounded-[24px] border border-white/70 bg-white/80 px-4 py-3 text-sm text-slate-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)] outline-none transition-all duration-300 placeholder:text-slate-400 focus:border-slate-300 focus:bg-white"
            />
            <ActionButton type="submit" disabled={saving} loading={savingAction === 'note'} success={lastAction === 'note' && !saving}>
              Save note
            </ActionButton>
          </form>
        </Card>
      </div>

      <Card className="mt-6">
        <h2 className="page-title">Timeline</h2>
        <p className="page-subtitle">Lead activity, outbound messages, bookings, and follow-up runs.</p>

        <div className="mt-6 space-y-4">
          {data.activities.map((activity) => (
            <article key={activity.id} className="rounded-[24px] border border-white/70 bg-white/75 p-4">
              <div className="flex items-start gap-4">
                <span className="mt-1 size-3 rounded-full bg-amber-300" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-900">{activity.title}</p>
                    <span className="text-xs text-slate-400">{formatDateTime(activity.createdAt)}</span>
                  </div>
                  <p className="mt-1 text-sm text-slate-600">{activity.body}</p>
                </div>
              </div>
            </article>
          ))}

          {data.messages.map((messageItem) => (
            <article key={messageItem.id} className="rounded-[24px] border border-white/70 bg-white/75 p-4">
              <div className="flex items-start gap-4">
                <span className="mt-1 size-3 rounded-full bg-emerald-300" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-900">{messageItem.subject || 'Message'}</p>
                    <span className="text-xs text-slate-400">
                      {messageItem.channel} · {messageItem.status} · {formatDateTime(messageItem.createdAt)}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-slate-600">{messageItem.body}</p>
                </div>
              </div>
            </article>
          ))}

          {data.bookings.map((booking) => (
            <article key={booking.id} className="rounded-[24px] border border-white/70 bg-white/75 p-4">
              <div className="flex items-start gap-4">
                <span className="mt-1 size-3 rounded-full bg-sky-300" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-900">Booking {booking.status}</p>
                    <span className="text-xs text-slate-400">{formatDateTime(booking.createdAt)}</span>
                  </div>
                  <p className="mt-1 text-sm text-slate-600">
                    {formatDateTime(booking.slotStart)} - {formatDateTime(booking.slotEnd)}
                  </p>
                  <p className="mt-1 break-all text-xs text-slate-400">{booking.meetingLink}</p>
                </div>
              </div>
            </article>
          ))}

          {data.followUpRuns.map((run) => (
            <article key={run.id} className="rounded-[24px] border border-white/70 bg-white/75 p-4">
              <div className="flex items-start gap-4">
                <span className="mt-1 size-3 rounded-full bg-violet-300" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-900">{run.sequenceSlug}</p>
                    <Badge tone={run.status === 'completed' ? 'success' : run.status === 'running' ? 'warning' : 'neutral'}>
                      {run.status}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm text-slate-600">
                    Step {run.currentStep} · Attempt {run.attemptCount}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    Next run {formatDate(run.nextRunAt)} · Last run {formatDate(run.lastRunAt)}
                  </p>
                </div>
              </div>
            </article>
          ))}

          {data.activities.length === 0 && data.messages.length === 0 && data.bookings.length === 0 && data.followUpRuns.length === 0 && (
            <div className="py-12 text-center">
              <p className="text-sm text-slate-500">No timeline events yet.</p>
            </div>
          )}
        </div>
      </Card>
    </main>
  );
}
