'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import { getLeads } from '../lib/api';
import type { LeadCard } from '../lib/types';
import { ActionButton, Badge, Card, MetricCard } from './ui';

type Status =
  | 'new'
  | 'qualifying'
  | 'qualified'
  | 'nurturing'
  | 'booked'
  | 'won'
  | 'lost'
  | 'disqualified'
  | 'all';

type Segment = 'hot' | 'warm' | 'cold' | 'all';

const STATUS_TONE: Record<Exclude<Status, 'all'>, 'neutral' | 'success' | 'warning' | 'danger' | 'accent' | 'info'> = {
  new: 'neutral',
  qualifying: 'warning',
  qualified: 'info',
  nurturing: 'warning',
  booked: 'success',
  won: 'accent',
  lost: 'danger',
  disqualified: 'danger'
};

const SEGMENT_TONE: Record<Exclude<Segment, 'all'>, 'danger' | 'warning' | 'info'> = {
  hot: 'danger',
  warm: 'warning',
  cold: 'info'
};

const STATUSES: Status[] = ['all', 'new', 'qualifying', 'qualified', 'nurturing', 'booked', 'won', 'lost', 'disqualified'];
const SEGMENTS: Segment[] = ['all', 'hot', 'warm', 'cold'];

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric'
  });
}

export function LeadsClient() {
  const [leads, setLeads] = useState<LeadCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<Status>('all');
  const [segment, setSegment] = useState<Segment>('all');
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    setLoading(true);
    setError(null);

    try {
      const result = await getLeads();
      setLeads(result.leads);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load leads');
    } finally {
      setLoading(false);
    }
  }

  const filtered = useMemo(() => {
    return leads.filter((lead) => {
      if (status !== 'all' && lead.status !== status) return false;
      if (segment !== 'all' && lead.segment !== segment) return false;
      if (!search.trim()) return true;

      const query = search.trim().toLowerCase();
      return (
        (lead.firstName ?? '').toLowerCase().includes(query) ||
        (lead.lastName ?? '').toLowerCase().includes(query) ||
        (lead.email ?? '').toLowerCase().includes(query) ||
        (lead.company ?? '').toLowerCase().includes(query)
      );
    });
  }, [leads, search, segment, status]);

  const stats = useMemo(() => {
    return {
      total: leads.length,
      hot: leads.filter((lead) => lead.segment === 'hot').length,
      warm: leads.filter((lead) => lead.segment === 'warm').length,
      booked: leads.filter((lead) => lead.status === 'booked').length
    };
  }, [leads]);

  return (
    <main className="app-shell dashboard-shell">
      <section className="hero dashboard-hero">
        <div className="hero-copy">
          <Badge tone="accent">CRM</Badge>
          <h1>Leads</h1>
          <p>
            Browse every captured lead, filter by status or segment, and jump straight into the timeline when you need context.
          </p>

          <div className="hero-actions">
            <ActionButton variant="secondary" onClick={() => void load()} loading={loading}>
              Refresh leads
            </ActionButton>
            <ActionButton variant="ghost" onClick={() => window.location.assign('/dashboard')}>
              Back to dashboard
            </ActionButton>
          </div>

          {error && (
            <div className="mt-4 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          )}
        </div>

        <Card className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <MetricCard label="Total" value={stats.total} hint="All captured leads" />
            <MetricCard label="Booked" value={stats.booked} hint="Meeting-ready leads" />
            <MetricCard label="Hot" value={stats.hot} hint="High-intent leads" />
            <MetricCard label="Warm" value={stats.warm} hint="Engaged leads" />
          </div>
        </Card>
      </section>

      <div className="content-grid single">
        <Card>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="page-title">Lead library</h2>
              <p className="page-subtitle">
                Search by name, company, or email and filter the CRM state without leaving the page.
              </p>
            </div>
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search leads"
              className="w-full max-w-sm rounded-full border border-white/70 bg-white/80 px-4 py-3 text-sm text-slate-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)] outline-none transition-all duration-300 placeholder:text-slate-400 focus:border-slate-300 focus:bg-white"
            />
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Status</span>
            {STATUSES.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setStatus(item)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold capitalize transition-all duration-300 ${
                  status === item ? 'bg-slate-900 text-white shadow-sm' : 'bg-white/70 text-slate-500 hover:bg-white hover:text-slate-900'
                }`}
              >
                {item}
              </button>
            ))}
            <span className="mx-1 hidden h-5 w-px bg-slate-200 lg:inline-block" />
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Segment</span>
            {SEGMENTS.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setSegment(item)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold capitalize transition-all duration-300 ${
                  segment === item ? 'bg-slate-900 text-white shadow-sm' : 'bg-white/70 text-slate-500 hover:bg-white hover:text-slate-900'
                }`}
              >
                {item}
              </button>
            ))}
          </div>
        </Card>
      </div>

      <div className="content-grid single">
        {loading ? (
          <Card>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="h-52 animate-pulse rounded-[24px] border border-white/70 bg-white/70" />
              ))}
            </div>
          </Card>
        ) : filtered.length === 0 ? (
          <Card className="py-20 text-center">
            <p className="text-sm text-slate-500">No leads match the current filters.</p>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((lead) => (
              <Link key={lead.id} href={`/leads/${lead.id}`} className="block">
                <Card hover className="flex h-full flex-col justify-between">
                  {(() => {
                    const statusTone = STATUS_TONE[lead.status as Exclude<Status, 'all'>] ?? 'neutral';
                    const segmentTone = SEGMENT_TONE[lead.segment as Exclude<Segment, 'all'>] ?? 'info';

                    return (
                      <>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-semibold tracking-tight text-slate-900">
                        {[lead.firstName, lead.lastName].filter(Boolean).join(' ') || 'Unnamed lead'}
                      </h3>
                      <p className="mt-1 text-sm text-slate-500">{lead.company ?? 'No company'}</p>
                      <p className="mt-1 text-xs text-slate-400">{lead.email ?? 'No email'}</p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <Badge tone={statusTone}>{lead.status}</Badge>
                      <Badge tone={segmentTone}>{lead.segment}</Badge>
                    </div>
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-3">
                    <div className="rounded-[20px] border border-white/70 bg-white/75 p-4">
                      <p className="text-xs text-slate-500">Source</p>
                      <p className="mt-1 text-sm font-semibold text-slate-900 capitalize">{lead.source ?? 'web'}</p>
                    </div>
                    <div className="rounded-[20px] border border-white/70 bg-white/75 p-4">
                      <p className="text-xs text-slate-500">Score</p>
                      <p className="mt-1 text-sm font-semibold text-slate-900">{lead.score != null ? `${lead.score}/100` : '—'}</p>
                    </div>
                  </div>

                  <div className="mt-5 flex items-center justify-between gap-3 text-xs text-slate-500">
                    <span>Captured {formatDate(lead.createdAt)}</span>
                    <span className="font-medium text-slate-900">Open lead</span>
                  </div>
                      </>
                    );
                  })()}
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
