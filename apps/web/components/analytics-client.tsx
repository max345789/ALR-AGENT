'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

import { getDashboard } from '../lib/api';
import type { DashboardResponse } from '../lib/types';
import { ActionButton, Badge, Card, MetricCard } from './ui';

const previewDashboard: DashboardResponse = {
  summary: {
    totalLeads: 12847,
    qualifiedLeads: 6420,
    hotLeads: 2890,
    warmLeads: 4280,
    coldLeads: 5677,
    bookedLeads: 2340,
    wonLeads: 890,
    lostLeads: 1045,
    conversionRate: 34.2,
    averageScore: 78.4,
    openFollowUps: 89
  },
  byStatus: {
    new: 234,
    qualified: 189,
    nurturing: 124,
    booked: 89,
    won: 53
  },
  bySource: {
    web: 6420,
    api: 3120,
    webhook: 2307,
    referral: 1000
  },
  bySegment: {
    hot: 2890,
    warm: 4280,
    cold: 5677
  },
  recentLeads: [
    {
      id: 'preview-1',
      source: 'web',
      firstName: 'Sarah',
      lastName: 'Chen',
      email: 'sarah@techventure.example',
      company: 'TechVenture',
      status: 'booked',
      segment: 'hot',
      score: 94,
      createdAt: new Date().toISOString()
    },
    {
      id: 'preview-2',
      source: 'api',
      firstName: 'Miguel',
      lastName: 'Rivera',
      email: 'miguel@northstar.example',
      company: 'Northstar',
      status: 'qualified',
      segment: 'warm',
      score: 86,
      createdAt: new Date().toISOString()
    },
    {
      id: 'preview-3',
      source: 'webhook',
      firstName: 'Anika',
      lastName: 'Patel',
      email: 'anika@brightloop.example',
      company: 'Brightloop',
      status: 'nurturing',
      segment: 'warm',
      score: 81,
      createdAt: new Date().toISOString()
    }
  ]
};

function formatNumber(value: number) {
  return new Intl.NumberFormat('en-US').format(value);
}

function FlashBar({
  label,
  value,
  max
}: {
  label: string;
  value: number;
  max: number;
}) {
  const pct = max > 0 ? Math.max(8, Math.round((value / max) * 100)) : 0;

  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs font-medium text-slate-500">
        <span className="capitalize">{label}</span>
        <span>{value.toLocaleString()}</span>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-[linear-gradient(90deg,rgba(79,98,126,0.96),rgba(127,146,175,0.92),rgba(234,111,74,0.9))]" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function AnalyticsClient() {
  const [dashboard, setDashboard] = useState<DashboardResponse>(previewDashboard);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshSuccess, setRefreshSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const successTimer = useRef<number | null>(null);

  useEffect(() => {
    void refresh();

    return () => {
      if (successTimer.current) {
        window.clearTimeout(successTimer.current);
      }
    };
  }, []);

  function flashSuccess() {
    if (successTimer.current) {
      window.clearTimeout(successTimer.current);
    }

    setRefreshSuccess(true);
    successTimer.current = window.setTimeout(() => {
      setRefreshSuccess(false);
      successTimer.current = null;
    }, 1200);
  }

  async function refresh() {
    setRefreshing(true);
    setError(null);

    try {
      const data = await getDashboard();
      setDashboard(data);
      flashSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to refresh analytics');
    } finally {
      setRefreshing(false);
    }
  }

  const summary = dashboard.summary;
  const total = Math.max(summary.totalLeads, 1);
  const conversionRate = Math.round((summary.wonLeads / total) * 100);
  const bookingRate = Math.round((summary.bookedLeads / total) * 100);
  const maxStatus = Math.max(...Object.values(dashboard.byStatus), 1);
  const maxSource = Math.max(...Object.values(dashboard.bySource), 1);
  const maxSegment = Math.max(...Object.values(dashboard.bySegment), 1);

  return (
    <main className="app-shell dashboard-shell">
      <section className="hero dashboard-hero">
        <div className="hero-copy">
          <Badge tone="accent">Insights</Badge>
          <h1>Analytics</h1>
          <p>
            Review the calm version of the funnel: conversion, booking, source distribution, and the current health of the autonomous pipeline.
          </p>

          <div className="hero-actions">
            <ActionButton variant="secondary" onClick={() => void refresh()} loading={refreshing} success={refreshSuccess}>
              Refresh analytics
            </ActionButton>
            <ActionButton variant="ghost" onClick={() => window.location.assign('/dashboard')}>
              Open dashboard
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
            <MetricCard label="Total leads" value={formatNumber(summary.totalLeads)} hint="Captured across all sources" />
            <MetricCard label="Qualified" value={formatNumber(summary.qualifiedLeads)} hint="Hot + warm leads" />
            <MetricCard label="Conversion" value={`${summary.conversionRate.toFixed(1)}%`} hint="Won / total" />
            <MetricCard label="Booking" value={`${bookingRate}%`} hint="Booked / total" />
          </div>
        </Card>
      </section>

      <div className="content-grid">
        <Card className="lg:col-span-2">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="page-title">Pipeline funnel</h2>
              <p className="page-subtitle">The sequence is clear, from captured lead to won deal.</p>
            </div>
            <Badge tone="success">Live</Badge>
          </div>

          <div className="mt-8 space-y-5">
            {[
              { label: 'Captured', value: summary.totalLeads },
              { label: 'Qualified', value: summary.qualifiedLeads },
              { label: 'Booked', value: summary.bookedLeads },
              { label: 'Won', value: summary.wonLeads }
            ].map((row) => (
              <FlashBar key={row.label} label={row.label} value={row.value} max={summary.totalLeads} />
            ))}
          </div>
        </Card>

        <Card>
          <h2 className="page-title">By segment</h2>
          <p className="page-subtitle">Hot, warm, and cold leads keep a gentle visual hierarchy.</p>
          <div className="mt-6 space-y-5">
            {Object.entries(dashboard.bySegment).map(([segment, value]) => (
              <FlashBar key={segment} label={segment} value={value} max={maxSegment} />
            ))}
          </div>
        </Card>

        <Card>
          <h2 className="page-title">By source</h2>
          <p className="page-subtitle">Traffic sources feed the same system with no special cases.</p>
          <div className="mt-6 space-y-5">
            {Object.entries(dashboard.bySource).map(([source, value]) => (
              <FlashBar key={source} label={source} value={value} max={maxSource} />
            ))}
          </div>
        </Card>

        <Card>
          <h2 className="page-title">By status</h2>
          <p className="page-subtitle">The current CRM state is easy to scan at a glance.</p>
          <div className="mt-6 space-y-5">
            {Object.entries(dashboard.byStatus).map(([status, value]) => (
              <FlashBar key={status} label={status} value={value} max={maxStatus} />
            ))}
          </div>
        </Card>
      </div>

      <div className="content-grid single">
        <Card>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="page-title">Recent leads</h2>
              <p className="page-subtitle">Latest captured leads from the live snapshot.</p>
            </div>
            <Link href="/leads" className="text-sm font-medium text-slate-600 transition-colors hover:text-slate-900">
              View all
            </Link>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {dashboard.recentLeads.map((lead) => (
              <Link key={lead.id} href={`/leads/${lead.id}`} className="block">
                <div className="rounded-[24px] border border-white/70 bg-white/75 p-5 transition-all duration-300 hover:-translate-y-0.5 hover:bg-white">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-900">
                        {[lead.firstName, lead.lastName].filter(Boolean).join(' ')}
                      </p>
                      <p className="mt-1 text-sm text-slate-500">{lead.company ?? 'No company'}</p>
                    </div>
                    <Badge tone={lead.segment === 'hot' ? 'danger' : lead.segment === 'warm' ? 'warning' : 'info'}>
                      {lead.status}
                    </Badge>
                  </div>
                  <div className="mt-5 flex items-center justify-between text-sm">
                    <span className="text-slate-500 capitalize">{lead.source}</span>
                    <span className="font-semibold text-slate-900">{lead.score}/100</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </Card>
      </div>

      <div className="content-grid single">
        <Card className="bg-[linear-gradient(135deg,rgba(255,255,255,0.96),rgba(247,244,239,0.82))]">
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-slate-400">Deals won</p>
          <p className="mt-3 text-6xl font-semibold tracking-tight text-slate-900">{summary.wonLeads}</p>
          <p className="mt-2 text-sm text-slate-500">{conversionRate}% conversion rate</p>
        </Card>
      </div>
    </main>
  );
}
