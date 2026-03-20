'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, type FormEvent } from 'react';

import { captureLead, getBilling, getDashboard, getHealth } from '../lib/api';
import type { BillingOverviewResponse, DashboardResponse, LeadFormValues } from '../lib/types';
import { ActionButton, Badge, Card, MetricCard } from './ui';

const initialForm: LeadFormValues = {
  source: 'web',
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  company: '',
  jobTitle: '',
  message: '',
  intentHint: '',
  metadata: {}
};

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
      createdAt: new Date(Date.now() - 2 * 60 * 1000).toISOString()
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
      createdAt: new Date(Date.now() - 5 * 60 * 1000).toISOString()
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
      createdAt: new Date(Date.now() - 12 * 60 * 1000).toISOString()
    }
  ]
};

const previewHealth = {
  status: 'preview',
  runtime: {
    database: 'loading',
    redis: 'loading',
    llmProvider: 'loading',
    emailProvider: 'loading',
    calendarProvider: 'loading'
  }
};

const previewBilling: BillingOverviewResponse['billing'] = {
  workspaceId: 'preview-workspace',
  workspaceSlug: 'preview',
  workspaceName: 'Preview Workspace',
  plan: 'trial',
  status: 'trialing',
  trialEndsAt: null,
  leadLimit: 250,
  captureKeyConfigured: false,
  captureKeyLast4: null,
  isBillingConfigured: false
};

function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US').format(value);
}

function formatStatusLabel(status: string): string {
  return status.replace(/_/g, ' ');
}

export function DashboardClient() {
  const [dashboard, setDashboard] = useState<DashboardResponse>(previewDashboard);
  const [health, setHealth] = useState<typeof previewHealth>(previewHealth);
  const [billing, setBilling] = useState<BillingOverviewResponse['billing']>(previewBilling);
  const [form, setForm] = useState<LeadFormValues>(initialForm);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [refreshSuccess, setRefreshSuccess] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const refreshTimer = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (refreshTimer.current) {
        window.clearTimeout(refreshTimer.current);
      }
    };
  }, []);

  useEffect(() => {
    let active = true;

    async function loadInitialSnapshot() {
      try {
        const [dashboardData, healthData, billingData] = await Promise.all([getDashboard(), getHealth(), getBilling()]);
        if (!active) {
          return;
        }

        setDashboard(dashboardData);
        setHealth(healthData as typeof previewHealth);
        setBilling(billingData.billing);
      } catch (err) {
        if (!active) {
          return;
        }

        setError(err instanceof Error ? err.message : 'Unable to load dashboard');
      }
    }

    void loadInitialSnapshot();

    return () => {
      active = false;
    };
  }, []);

  function flashSuccess(setter: (value: boolean) => void, timerRef: typeof refreshTimer) {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
    }

    setter(true);
    timerRef.current = window.setTimeout(() => {
      setter(false);
      timerRef.current = null;
    }, 1300);
  }

  async function fetchSnapshot() {
    const [dashboardData, healthData, billingData] = await Promise.all([getDashboard(), getHealth(), getBilling()]);
    setDashboard(dashboardData);
    setHealth(healthData as typeof previewHealth);
    setBilling(billingData.billing);
  }

  async function refresh() {
    setRefreshing(true);
    setRefreshSuccess(false);
    setError(null);

    try {
      await fetchSnapshot();
      flashSuccess(setRefreshSuccess, refreshTimer);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to refresh dashboard');
    } finally {
      setRefreshing(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setMessage(null);
    setError(null);

    try {
      const payload = {
        ...form,
        metadata: {
          ...form.metadata,
          captureSource: 'dashboard-form',
          capturedAt: new Date().toISOString()
        }
      };

      const response = await captureLead(payload);
      setMessage(`Lead captured: ${response.lead.firstName ?? 'New lead'}.`);
      setForm(initialForm);
      window.location.href = `/leads/${response.lead.id}`;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to capture lead');
    } finally {
      setSubmitting(false);
    }
  }

  const summary = dashboard.summary;
  const pipelineRows = Object.entries(dashboard.byStatus)
    .filter(([, value]) => value > 0)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 4)
    .map(([stage, count], index) => ({
      stage: formatStatusLabel(stage),
      count,
      width: `${Math.max(20, 100 - index * 16)}%`,
      color: ['bg-blue-500', 'bg-purple-500', 'bg-cyan-500', 'bg-green-500'][index % 4]
    }));

  const activityRows = dashboard.recentLeads.slice(0, 3).map((lead) => ({
    action: `${[lead.firstName, lead.lastName].filter(Boolean).join(' ') || 'Lead'} captured`,
    source: lead.source,
    time: 'recently'
  }));
  const trialMode = billing.status === 'trialing' || billing.plan === 'trial';

  return (
    <main className="app-shell dashboard-shell">
      <section className="hero dashboard-hero stagger-fade">
        <div className="hero-copy stagger-fade">
          <Badge tone="accent">Strict V1 core loop</Badge>
          <h1>Autonomous Lead-to-Revenue Agent</h1>
          <p>
            Capture leads, qualify them with LLM-backed scoring, follow up autonomously, and push the right meetings into the pipeline.
            Strict V1 keeps the core loop visible and hides the advanced analytics surface.
          </p>

          <div className="hero-actions">
            <ActionButton variant="ghost" onClick={() => void refresh()} loading={refreshing} success={refreshSuccess}>
              Refresh
            </ActionButton>
            <ActionButton variant="primary" onClick={() => window.location.assign('/workflow')}>
              Workflow guide
            </ActionButton>
            <ActionButton variant="secondary" onClick={() => window.location.assign('/billing')}>
              Billing
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

        <Card className="space-y-4 stagger-fade">
          <div className="grid gap-3 sm:grid-cols-2 stagger-fade">
            <div className="rounded-2xl border border-white/70 bg-white/65 p-4 backdrop-blur-md">
              <p className="text-sm text-slate-500">Runtime</p>
              <p className="mt-1 text-xl font-semibold text-slate-900">{health.runtime.database}</p>
            </div>
            <div className="rounded-2xl border border-white/70 bg-white/65 p-4 backdrop-blur-md">
              <p className="text-sm text-slate-500">LLM</p>
              <p className="mt-1 text-xl font-semibold text-slate-900">{health.runtime.llmProvider}</p>
            </div>
            <div className="rounded-2xl border border-white/70 bg-white/65 p-4 backdrop-blur-md">
              <p className="text-sm text-slate-500">Leads captured</p>
              <p className="mt-1 text-xl font-semibold text-slate-900">{formatNumber(summary.totalLeads)}</p>
            </div>
            <div className="rounded-2xl border border-white/70 bg-white/65 p-4 backdrop-blur-md">
              <p className="text-sm text-slate-500">Conversion rate</p>
              <p className="mt-1 text-xl font-semibold text-slate-900">{summary.conversionRate.toFixed(1)}%</p>
            </div>
          </div>

          <div className="rounded-2xl border border-white/70 bg-white/55 p-4 backdrop-blur-md">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-medium text-slate-900">Lead Pipeline</span>
              <span className="text-xs text-slate-500">Real-time</span>
            </div>
            <div className="space-y-3 stagger-fade">
              {pipelineRows.map((item) => (
                <div
                  key={item.stage}
                  className="grid grid-cols-[max-content_minmax(0,1fr)_max-content] items-center gap-3"
                >
                  <span className="text-xs text-slate-500">{item.stage}</span>
                  <div className="h-2 overflow-hidden rounded-full bg-white/70">
                    <div className={`h-full rounded-full ${item.color}`} style={{ width: item.width }} />
                  </div>
                  <span className="text-right text-xs font-semibold tabular-nums text-slate-900">{item.count}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-white/70 bg-white/55 p-4 backdrop-blur-md">
            <span className="mb-3 block text-sm font-medium text-slate-900">Recent Activity</span>
            <div className="space-y-2 stagger-fade">
              {activityRows.map((activity) => (
                <div key={`${activity.action}-${activity.time}`} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-blue-400" />
                    <span className="text-slate-900">{activity.action}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-500">{activity.source}</span>
                    <span className="text-xs text-slate-500">{activity.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/70 bg-white/55 p-4 backdrop-blur-md">
            <div className="space-y-1">
              <span className="block text-sm font-medium text-slate-900">Workspace access</span>
              <p className="text-xs text-slate-500">
                {billing.plan} plan · {billing.status} · lead limit {formatNumber(billing.leadLimit)}
              </p>
              <p className="text-xs text-slate-500">
                {billing.captureKeyConfigured && billing.captureKeyLast4 ? `Capture key configured ••••${billing.captureKeyLast4}` : 'Capture key not configured yet'}
              </p>
              {trialMode && (
                <p className="text-xs font-medium text-amber-700">
                  Free-trial launch mode is active. Paid billing will be enabled after launch.
                </p>
              )}
            </div>
            <ActionButton variant="secondary" size="sm" onClick={() => window.location.assign('/billing')}>
              Manage billing
            </ActionButton>
          </div>
        </Card>
      </section>

      <Card className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between stagger-fade">
        <div className="space-y-2">
          <Badge tone="info">Connection guide</Badge>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900">Connect your platform and start feeding leads.</h2>
          <p className="max-w-3xl text-sm leading-6 text-slate-600">
            Website forms, REST APIs, and webhook receivers all map into the same lead pipeline. Open the integrations page to
            copy the payloads, test a lead, and finish production setup.
          </p>
        </div>

        <div className="flex flex-wrap gap-3 stagger-fade">
          <ActionButton variant="primary" onClick={() => window.location.assign('/integrations')}>
            Open integrations
          </ActionButton>
          <ActionButton variant="ghost" onClick={() => window.location.assign('/workflow')}>
            Open workflow
          </ActionButton>
          <ActionButton variant="ghost" onClick={() => window.location.assign('/leads')}>
            View leads
          </ActionButton>
        </div>
      </Card>

      <div className="metrics-grid stagger-fade">
        <MetricCard
          label="Total leads"
          value={formatNumber(summary.totalLeads)}
          hint="Captured across API, web, and webhook"
        />
        <MetricCard
          label="Qualified"
          value={formatNumber(summary.qualifiedLeads)}
          hint="Hot + warm opportunities"
        />
        <MetricCard
          label="Booked"
          value={formatNumber(summary.bookedLeads)}
          hint="Meetings scheduled or confirmed"
        />
        <MetricCard
          label="Open follow-ups"
          value={formatNumber(summary.openFollowUps)}
          hint="Queued for autonomous outreach"
        />
      </div>

      <div className="content-grid stagger-fade">
        <Card>
          <div className="mb-6">
            <h2 className="page-title">Capture a lead</h2>
            <p className="page-subtitle">
              Submit via web form, REST API, or webhook. The agent will qualify and follow up automatically.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 stagger-fade">
            <div className="grid grid-cols-2 gap-3 stagger-fade">
              {(['firstName', 'lastName'] as const).map((field) => (
                <div key={field} className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-500 capitalize">
                    {field === 'firstName' ? 'First name' : 'Last name'}
                  </label>
                  <input
                    required={field === 'firstName'}
                    placeholder={field === 'firstName' ? 'First name *' : 'Last name'}
                    value={form[field] ?? ''}
                    onChange={(event) => setForm((current) => ({ ...current, [field]: event.target.value }))}
                    className="w-full rounded-2xl border border-white/70 bg-white/75 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] outline-none transition-all duration-300 focus:border-sky-200 focus:bg-white"
                  />
                </div>
              ))}
            </div>

            {(['email', 'phone', 'company', 'jobTitle'] as const).map((field) => (
              <div key={field} className="space-y-1.5">
                <label className="text-xs font-medium text-slate-500 capitalize">
                  {field === 'email' ? 'Email' : field === 'phone' ? 'Phone' : field === 'company' ? 'Company' : 'Job title'}
                </label>
                <input
                  required={field === 'email'}
                  type={field === 'email' ? 'email' : 'text'}
                  placeholder={field === 'email' ? 'Email *' : field === 'phone' ? 'Phone' : field === 'company' ? 'Company' : 'Job title'}
                  value={form[field] ?? ''}
                  onChange={(event) => setForm((current) => ({ ...current, [field]: event.target.value }))}
                  className="w-full rounded-2xl border border-white/70 bg-white/75 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] outline-none transition-all duration-300 focus:border-sky-200 focus:bg-white"
                />
              </div>
            ))}

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-500">Intent hint</label>
              <input
                placeholder="Need pricing for a 20-person team"
                value={form.intentHint ?? ''}
                onChange={(event) => setForm((current) => ({ ...current, intentHint: event.target.value }))}
                className="w-full rounded-2xl border border-white/70 bg-white/75 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] outline-none transition-all duration-300 focus:border-sky-200 focus:bg-white"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-500">Message</label>
              <textarea
                rows={4}
                placeholder="Tell us what the lead said and what outcome they want."
                value={form.message ?? ''}
                onChange={(event) => setForm((current) => ({ ...current, message: event.target.value }))}
                className="w-full resize-none rounded-2xl border border-white/70 bg-white/75 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] outline-none transition-all duration-300 focus:border-sky-200 focus:bg-white"
              />
            </div>

            <ActionButton type="submit" variant="primary" loading={submitting} className="w-full justify-center">
              Capture lead
            </ActionButton>
          </form>
        </Card>

        <Card>
          <div className="mb-6">
            <h2 className="page-title">Pipeline health</h2>
            <p className="page-subtitle">
              How the current lead pool is distributed by status and segment.
            </p>
          </div>

          <div className="grid gap-5">
            <div>
              <h3 className="mb-3 text-sm font-semibold text-slate-900">Status</h3>
              <div className="space-y-3 stagger-fade">
                {Object.entries(dashboard.byStatus).map(([status, count]) => {
                  const total = summary.totalLeads || 1;
                  const pct = Math.round((count / total) * 100);

                  return (
                    <div key={status} className="grid grid-cols-[7rem_minmax(0,1fr)_max-content] items-center gap-3">
                      <span className="min-w-0 truncate text-xs font-medium capitalize text-slate-500">{status}</span>
                      <div className="h-2 overflow-hidden rounded-full bg-white/70">
                        <div className="h-full rounded-full bg-gradient-to-r from-[#4f627e] via-[#7f92af] to-[#ea6f4a]" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-right text-xs font-semibold tabular-nums text-slate-900">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <h3 className="mb-3 text-sm font-semibold text-slate-900">Segment</h3>
              <div className="space-y-3 stagger-fade">
                {Object.entries(dashboard.bySegment).map(([segment, count]) => {
                  const total = summary.totalLeads || 1;
                  const pct = Math.round((count / total) * 100);

                  return (
                    <div key={segment} className="grid grid-cols-[7rem_minmax(0,1fr)_max-content] items-center gap-3">
                      <span className="min-w-0 truncate text-xs font-medium capitalize text-slate-500">{segment}</span>
                      <div className="h-2 overflow-hidden rounded-full bg-white/70">
                        <div className="h-full rounded-full bg-gradient-to-r from-[#ea6f4a] via-[#d8e0ea] to-[#7f92af]" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-right text-xs font-semibold tabular-nums text-slate-900">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </Card>
      </div>

      <div className="content-grid single stagger-fade">
        <Card>
          <div className="mb-6 flex items-center justify-between gap-4">
            <div>
              <h2 className="page-title">Recent leads</h2>
              <p className="page-subtitle">
                Sorted by capture time. Click into a lead to view the activity timeline.
              </p>
            </div>
            <Badge tone={health.status === 'preview' ? 'accent' : 'success'}>{health.status}</Badge>
          </div>

          <div className="space-y-2 stagger-fade">
            {dashboard.recentLeads.map((lead) => (
              <Link
                key={lead.id}
                href={`/leads/${lead.id}`}
                className="flex items-center justify-between rounded-2xl border border-white/65 bg-white/65 px-4 py-3 transition-all duration-300 hover:-translate-y-0.5 hover:border-white/80 hover:bg-white/80"
              >
                <div className="min-w-0">
                  <p className="font-semibold text-slate-900">
                    {[lead.firstName, lead.lastName].filter(Boolean).join(' ')}
                  </p>
                  <p className="truncate text-xs text-slate-500">{lead.company}</p>
                </div>
                <div className="flex items-center gap-2 pl-4">
                  <Badge tone={lead.segment === 'hot' ? 'danger' : lead.segment === 'warm' ? 'warning' : 'info'}>
                    {lead.segment}
                  </Badge>
                  <span className="text-sm font-semibold tabular-nums text-slate-900">{lead.score}</span>
                </div>
              </Link>
            ))}
          </div>
        </Card>
      </div>
    </main>
  );
}
