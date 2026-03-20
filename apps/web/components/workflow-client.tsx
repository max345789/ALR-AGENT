'use client';

import { useRouter } from 'next/navigation';
import { ArrowRight, CalendarDays, CheckCircle2, Mail, PlugZap, ShieldCheck, Users } from 'lucide-react';

import { ActionButton, Badge, Card, MetricCard } from './ui';

const workflowSteps = [
  {
    step: '01',
    icon: Users,
    title: 'Sign in',
    body: 'A customer creates an account with email or Google and lands on the dashboard.'
  },
  {
    step: '02',
    icon: PlugZap,
    title: 'Connect one source',
    body: 'They choose one intake path first: website form, REST API, or webhook receiver.'
  },
  {
    step: '03',
    icon: Mail,
    title: 'Send one test lead',
    body: 'A single payload confirms capture, validation, and CRM storage are all working.'
  },
  {
    step: '04',
    icon: ShieldCheck,
    title: 'Let the agent qualify',
    body: 'The lead is scored, tagged, and queued for follow-up without manual handoffs.'
  },
  {
    step: '05',
    icon: CalendarDays,
    title: 'Book and review',
    body: 'If the lead is hot, the booking flow opens and the timeline keeps the record visible.'
  }
];

const externalTasks = [
  'Create Google OAuth credentials if you want Google sign-in.',
  'Set a production email provider and verified sender for real inbox delivery.',
  'Connect a live calendar provider if you want booking sync outside local mode.',
  'Point your website, CRM, or automation tool at the capture endpoint.',
  'Set production domain and runtime env vars when you leave localhost.'
];

const hiddenFeatures = ['Analytics page', 'Daily report button', 'Optimization loop', 'WhatsApp channel'];

export function WorkflowClient() {
  const router = useRouter();

  return (
    <main className="app-shell dashboard-shell">
      <section className="hero dashboard-hero stagger-fade">
        <div className="hero-copy stagger-fade">
          <Badge tone="accent">Strict V1 workflow</Badge>
          <h1>How a customer works with the agent.</h1>
          <p>
            This release keeps one calm revenue loop visible: sign in, connect one source, send a test lead, and let the
            agent qualify, follow up, and book. Advanced surfaces stay hidden for V1.
          </p>

          <div className="hero-actions">
            <ActionButton variant="primary" onClick={() => router.push('/integrations')}>
              Open integrations
            </ActionButton>
            <ActionButton variant="secondary" onClick={() => router.push('/dashboard')}>
              Open dashboard
            </ActionButton>
            <ActionButton variant="ghost" onClick={() => router.push('/leads')}>
              View leads
            </ActionButton>
          </div>
        </div>

        <Card className="space-y-4 stagger-fade">
          <div className="grid gap-3 sm:grid-cols-2 stagger-fade">
            <MetricCard label="Included steps" value={workflowSteps.length} hint="Core user journey" />
            <MetricCard label="External tasks" value={externalTasks.length} hint="Setup work that cannot be automated locally" />
            <MetricCard label="Hidden features" value={hiddenFeatures.length} hint="Advanced screens kept out of V1" />
            <MetricCard label="Core channels" value="3" hint="Web, API, and webhook" />
          </div>

          <div className="rounded-2xl border border-white/70 bg-white/65 p-4 backdrop-blur-md">
            <div className="mb-3 flex items-center justify-between gap-3">
              <span className="text-sm font-medium text-slate-900">Visible in V1</span>
              <Badge tone="success">Live</Badge>
            </div>
            <div className="space-y-2 text-sm leading-6 text-slate-600">
              <p>Capture, qualification, follow-up, booking, and CRM visibility.</p>
              <p>Login, signup, forgot password, and Google sign-in.</p>
              <p>Integrations, dashboard, leads, and booking handoff.</p>
            </div>
          </div>
        </Card>
      </section>

      <div className="content-grid lg:grid-cols-[1.1fr_0.9fr] stagger-fade">
        <Card>
          <div className="mb-6">
            <Badge tone="info">Customer flow</Badge>
            <h2 className="page-title mt-3">What happens after signup.</h2>
            <p className="page-subtitle">
              The customer path is intentionally short. Every step is either automated or a single external setup item.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 stagger-fade">
            {workflowSteps.map((step) => {
              const Icon = step.icon;

              return (
                <div key={step.step} className="rounded-[24px] border border-slate-200/80 bg-white/80 p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,rgba(234,111,74,0.14),rgba(122,160,212,0.14),rgba(255,255,255,0.2))]">
                        <Icon className="size-5 text-slate-700" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">{step.step}</p>
                        <h3 className="text-lg font-semibold tracking-tight text-slate-900">{step.title}</h3>
                      </div>
                    </div>
                    <ArrowRight className="size-4 shrink-0 text-slate-400" />
                  </div>
                  <p className="mt-4 text-sm leading-6 text-slate-600">{step.body}</p>
                </div>
              );
            })}
          </div>
        </Card>

        <Card>
          <div className="mb-6">
            <Badge tone="success">External setup</Badge>
            <h2 className="page-title mt-3">What still needs a real account or deployment target.</h2>
            <p className="page-subtitle">
              These are the only non-automatic steps left in V1. Everything else is handled by the agent or by the backend.
            </p>
          </div>

          <div className="space-y-3 stagger-fade">
            {externalTasks.map((task) => (
              <div key={task} className="flex items-start gap-3 rounded-[20px] border border-slate-200/80 bg-white/80 px-4 py-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
                <p className="text-sm leading-6 text-slate-700">{task}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 rounded-[24px] border border-slate-200/80 bg-white/80 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Hidden in V1</p>
            <div className="mt-3 flex flex-wrap gap-2 stagger-fade">
              {hiddenFeatures.map((feature) => (
                <Badge key={feature} tone="neutral">
                  {feature}
                </Badge>
              ))}
            </div>
            <p className="mt-4 text-sm leading-6 text-slate-600">
              These are intentionally unavailable in the strict V1 surface so the customer only sees the core revenue loop.
            </p>
          </div>
        </Card>
      </div>
    </main>
  );
}
