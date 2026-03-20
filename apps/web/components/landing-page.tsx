'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent, type ReactNode } from 'react';
import {
  ArrowRight,
  CalendarDays,
  Check,
  Clock3,
  ExternalLink,
  Mail,
  Play,
  Sparkles,
  Star,
  Target,
  TrendingUp,
  Users,
  Workflow,
} from 'lucide-react';

import { captureLead } from '../lib/api';
import { ActionButton, Badge, Card } from './ui';

type SubmitState = 'idle' | 'loading' | 'success';

const TRUST_NAMES = ['Acme', 'Northstar', 'Brightloop', 'Scalehouse', 'Moonbase', 'VentureLab'];

const NAV_ITEMS = [
  ['Features', 'features'],
  ['How it works', 'how-it-works'],
  ['Workflow', 'workflow'],
  ['Pricing', 'pricing'],
  ['Testimonials', 'testimonials']
] as const;

const FEATURES = [
  {
    icon: Target,
    title: 'Capture from every source',
    description: 'REST, webhook, and web form entry points all flow into the same lead pipeline with no manual handoff.',
    action: 'Open leads',
    href: '/leads'
  },
  {
    icon: Sparkles,
    title: 'LLM qualification',
    description: 'Score intent, extract structured fields, and tag hot, warm, and cold leads in one autonomous pass.',
    action: 'Review scoring',
    href: '/dashboard'
  },
  {
    icon: Mail,
    title: 'Autonomous follow-up',
    description: 'Multi-step messaging sequences retry gracefully and preserve history, so the conversation stays alive.',
    action: 'See timeline',
    href: '/dashboard'
  },
  {
    icon: CalendarDays,
    title: 'Meeting booking',
    description: 'Use calendar abstractions to generate booking links, confirm slots, and keep scheduling friction low.',
    action: 'Open bookings',
    href: '/dashboard'
  },
  {
    icon: Users,
    title: 'CRM timeline',
    description: 'Every lead, note, and booking stays visible in one calm timeline so the team can review it quickly.',
    action: 'Open leads',
    href: '/leads'
  },
  {
    icon: Workflow,
    title: 'Workflow guide',
    description: 'A clear setup path shows the exact steps the customer still needs to complete before production.',
    action: 'Open workflow',
    href: '/workflow'
  }
];

const STEPS = [
  {
    number: '01',
    title: 'Capture',
    body: 'Lead data arrives from the web, API, or webhook and is stored with metadata immediately.'
  },
  {
    number: '02',
    title: 'Qualify',
    body: 'The LLM adapter scores the lead, extracts intent, and writes the structured result back to CRM.'
  },
  {
    number: '03',
    title: 'Follow up',
    body: 'Sequences send email follow-ups with retry logic and full message history tracking.'
  },
  {
    number: '04',
    title: 'Book',
    body: 'Qualified leads receive booking links and a clear handoff into the CRM.'
  }
];

const TESTIMONIALS = [
  {
    quote:
      'The calm UI and automated qualification made the entire pipeline feel manageable. We now see the right next action immediately.',
    name: 'Sarah Chen',
    role: 'VP of Sales',
    metric: '340% revenue lift'
  },
  {
    quote:
      'Every capture, follow-up, and booking is logged. It finally feels like one system instead of five disconnected tools.',
    name: 'Miguel Rivera',
    role: 'Revenue Operations',
    metric: '25 hours saved weekly'
  },
  {
    quote:
      'The workflow guide made setup straightforward. We knew exactly what to connect before going live.',
    name: 'Anika Patel',
    role: 'Head of Growth',
    metric: 'Setup in a day'
  }
];

const PRICING = [
  {
    name: 'Starter',
    price: '$49',
    subtitle: 'For simple lead capture and light automation.',
    features: ['1,000 leads / month', 'Web + API capture', 'Basic qualification', 'Email follow-up', 'CRM timeline'],
    action: 'Start trial',
    featured: false
  },
  {
    name: 'Growth',
    price: '$149',
    subtitle: 'For teams that want the full autonomous pipeline.',
    features: ['10,000 leads / month', 'LLM qualification', 'Booking automation', 'CRM timeline', 'Workflow guide'],
    action: 'Choose Growth',
    featured: true
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    subtitle: 'For larger deployments and custom integrations.',
    features: ['Unlimited leads', 'Custom adapters', 'Dedicated support', 'SLA + governance'],
    action: 'Contact sales',
    featured: false
  }
];

function SectionHeading({
  eyebrow,
  title,
  copy,
  align = 'left'
}: {
  eyebrow: string;
  title: string;
  copy: string;
  align?: 'left' | 'center';
}) {
  return (
    <div className={align === 'center' ? 'mx-auto max-w-3xl text-center' : 'max-w-3xl'}>
      <Badge tone="accent" className="mb-5">
        {eyebrow}
      </Badge>
      <h2 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl lg:text-5xl">
        {title}
      </h2>
      <p className="mt-4 text-base leading-7 text-slate-600 sm:text-lg">{copy}</p>
    </div>
  );
}

function SectionShell({
  id,
  children,
  tone = 'white'
}: {
  id?: string;
  children: ReactNode;
  tone?: 'white' | 'tinted';
}) {
  return (
    <section id={id} className={tone === 'tinted' ? 'bg-white/35' : ''}>
      <div className="mx-auto max-w-7xl px-6 py-20 lg:px-8 lg:py-24">{children}</div>
    </section>
  );
}

export function LandingPage() {
  const router = useRouter();
  const [heroEmail, setHeroEmail] = useState('');
  const [heroCompany, setHeroCompany] = useState('');
  const [heroState, setHeroState] = useState<SubmitState>('idle');
  const [heroMessage, setHeroMessage] = useState<string | null>(null);
  const [ctaName, setCtaName] = useState('');
  const [ctaEmail, setCtaEmail] = useState('');
  const [ctaCompany, setCtaCompany] = useState('');
  const [ctaState, setCtaState] = useState<SubmitState>('idle');
  const [ctaMessage, setCtaMessage] = useState<string | null>(null);
  const [demoOpen, setDemoOpen] = useState(false);

  function scrollToSection(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  async function handleHeroSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const email = heroEmail.trim();
    if (!email || !email.includes('@')) {
      setHeroMessage('Please enter a valid work email.');
      return;
    }

    setHeroState('loading');
    setHeroMessage(null);

    try {
      const response = await captureLead({
        source: 'web',
        email,
        company: heroCompany.trim() || undefined,
        intentHint: 'Landing hero signup',
        metadata: {
          entryPoint: 'hero-form',
          landingPage: 'autonomous-lead-to-revenue'
        }
      });

      setHeroState('success');
      setHeroMessage('Thanks. We have your lead and will follow up shortly.');
      setHeroEmail('');
      setHeroCompany('');
    } catch (error) {
      setHeroState('idle');
      setHeroMessage(error instanceof Error ? error.message : 'Unable to capture the lead.');
    }
  }

  async function handleCtaSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const email = ctaEmail.trim();
    const name = ctaName.trim();
    if (!name) {
      setCtaMessage('Please enter your name.');
      return;
    }

    if (!email || !email.includes('@')) {
      setCtaMessage('Please enter a valid work email.');
      return;
    }

    setCtaState('loading');
    setCtaMessage(null);

    try {
      const response = await captureLead({
        source: 'web',
        firstName: name,
        company: ctaCompany.trim() || undefined,
        email,
        intentHint: 'Landing CTA signup',
        metadata: {
          entryPoint: 'final-cta',
          landingPage: 'autonomous-lead-to-revenue'
        }
      });

      setCtaState('success');
      setCtaMessage('Thanks. Your lead is captured and queued for follow-up.');
      setCtaName('');
      setCtaEmail('');
      setCtaCompany('');
    } catch (error) {
      setCtaState('idle');
      setCtaMessage(error instanceof Error ? error.message : 'Unable to capture the lead.');
    }
  }

  return (
    <div className="min-h-screen overflow-x-hidden text-slate-900">
      <header className="sticky top-0 z-40 border-b border-white/55 bg-white/65 backdrop-blur-2xl animate-rise-in">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[linear-gradient(135deg,rgba(234,111,74,0.96),rgba(122,160,212,0.96))] text-xs font-black text-white shadow-[0_10px_24px_rgba(47,58,72,0.16)]">
              L
            </span>
            <span className="text-lg font-semibold tracking-tight text-slate-900">LeadFlow AI</span>
          </Link>

          <nav className="hidden items-center gap-1 md:flex stagger-fade">
            {NAV_ITEMS.map(([label, id]) => (
              <button
                key={id}
                type="button"
                onClick={() => scrollToSection(id)}
                className="rounded-full px-4 py-2 text-sm font-medium text-slate-500 transition-colors hover:bg-white/70 hover:text-slate-900"
              >
                {label}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-2 stagger-fade">
            <ActionButton variant="ghost" size="sm" onClick={() => router.push('/login')}>
              Sign in
            </ActionButton>
            <ActionButton variant="secondary" size="sm" onClick={() => router.push('/signup')}>
              Create account
            </ActionButton>
            <ActionButton variant="ghost" size="sm" onClick={() => router.push('/dashboard')}>
              Dashboard
            </ActionButton>
            <ActionButton variant="secondary" size="sm" onClick={() => setDemoOpen(true)}>
              Demo
            </ActionButton>
          </div>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute -top-36 left-[-8%] h-[30rem] w-[30rem] rounded-full bg-[radial-gradient(circle,rgba(122,160,212,0.34),rgba(122,160,212,0))] blur-[120px] animate-aurora-drift" />
            <div className="absolute right-[-10%] top-[-14rem] h-[34rem] w-[34rem] rounded-full bg-[radial-gradient(circle,rgba(234,111,74,0.24),rgba(234,111,74,0))] blur-[140px] animate-aurora-drift" />
            <div className="absolute bottom-[-12rem] left-[18%] h-[28rem] w-[28rem] rounded-full bg-[radial-gradient(circle,rgba(180,190,204,0.36),rgba(180,190,204,0))] blur-[120px] animate-aurora-drift" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_42%,rgba(255,255,255,0.44),rgba(255,255,255,0)_58%)]" />
            <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(247,249,252,0.76)_0%,rgba(237,241,246,0.58)_24%,rgba(233,238,244,0.42)_58%,rgba(245,247,250,0.5)_100%)] mix-blend-soft-light" />
          </div>

          <div className="mx-auto grid max-w-7xl gap-10 px-6 py-16 lg:grid-cols-[1.08fr_0.92fr] lg:items-center lg:px-8 lg:py-24 stagger-fade">
            <div className="relative stagger-fade">
              <Badge tone="accent" className="mb-5">
                Autonomous lead-to-revenue
              </Badge>
              <h1 className="max-w-4xl text-5xl font-semibold tracking-tight text-slate-900 sm:text-6xl lg:text-7xl">
                Turn leads into revenue on autopilot.
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
                Capture every lead, qualify with LLM-backed scoring, run autonomous follow-up, and book meetings without the usual noise.
              </p>

              <form onSubmit={handleHeroSubmit} className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-[1.15fr_0.95fr_auto] stagger-fade">
                <input
                  type="email"
                  value={heroEmail}
                  onChange={(event) => setHeroEmail(event.target.value)}
                  placeholder="Work email"
                  className="w-full rounded-full border border-white/70 bg-white/75 px-4 py-3 text-sm text-slate-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)] outline-none transition-all duration-300 placeholder:text-slate-400 focus:border-slate-300 focus:bg-white"
                />
                <input
                  type="text"
                  value={heroCompany}
                  onChange={(event) => setHeroCompany(event.target.value)}
                  placeholder="Company"
                  className="w-full rounded-full border border-white/70 bg-white/75 px-4 py-3 text-sm text-slate-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)] outline-none transition-all duration-300 placeholder:text-slate-400 focus:border-slate-300 focus:bg-white"
                />
                <ActionButton type="submit" loading={heroState === 'loading'} success={heroState === 'success'} className="w-full justify-center">
                  Capture lead
                </ActionButton>
              </form>

              <div className="mt-4 flex flex-wrap gap-3 stagger-fade">
                <ActionButton variant="secondary" size="sm" onClick={() => setDemoOpen(true)}>
                  <Play className="size-4" />
                  Watch demo
                </ActionButton>
                <ActionButton variant="ghost" size="sm" onClick={() => scrollToSection('features')}>
                  Explore features
                  <ArrowRight className="size-4" />
                </ActionButton>
              </div>

              {heroMessage && (
                <div className="mt-4 rounded-2xl border border-white/70 bg-white/70 px-4 py-3 text-sm text-slate-700 backdrop-blur-xl">
                  {heroMessage}
                </div>
              )}

              <div className="mt-8 flex flex-wrap items-center gap-4 text-sm text-slate-500 stagger-fade">
                <span className="inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/70 px-3 py-1.5">
                  <Users className="size-4 text-slate-700" />
                  2,500+ companies
                </span>
                <span className="inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/70 px-3 py-1.5">
                  <TrendingUp className="size-4 text-slate-700" />
                  340% ROI average
                </span>
                <span className="inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/70 px-3 py-1.5">
                  <Clock3 className="size-4 text-slate-700" />
                  24/7 automation
                </span>
              </div>
            </div>

            <Card className="relative overflow-hidden stagger-fade">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-slate-500">Live pipeline snapshot</p>
                  <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">Autonomous dashboard</h2>
                </div>
                <Badge tone="success">Live</Badge>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-2 stagger-fade">
                {[
                  { label: 'Captured', value: '12,847' },
                  { label: 'Qualified', value: '6,420' },
                  { label: 'Booked', value: '2,340' },
                  { label: 'Conversion', value: '34.2%' }
                ].map((stat) => (
                  <div key={stat.label} className="rounded-[20px] border border-white/70 bg-white/70 p-4 backdrop-blur-xl">
                    <p className="text-sm text-slate-500">{stat.label}</p>
                    <p className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">{stat.value}</p>
                  </div>
                ))}
              </div>

              <div className="mt-6 rounded-[24px] border border-white/70 bg-white/70 p-4 backdrop-blur-xl">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-900">Lead pipeline</span>
                  <span className="text-xs text-slate-500">Auto-updating</span>
                </div>
            <div className="space-y-3 stagger-fade">
                  {[
                    { label: 'Hot', value: 2890, width: '100%', color: 'bg-rose-300' },
                    { label: 'Warm', value: 4280, width: '78%', color: 'bg-amber-300' },
                    { label: 'Cold', value: 5677, width: '54%', color: 'bg-sky-300' },
                    { label: 'Won', value: 890, width: '28%', color: 'bg-emerald-300' }
                  ].map((row) => (
                    <div key={row.label} className="flex items-center gap-3">
                      <span className="w-14 text-xs font-medium text-slate-500">{row.label}</span>
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                        <div className={`h-full rounded-full ${row.color}`} style={{ width: row.width }} />
                      </div>
                      <span className="w-12 text-right text-xs font-semibold text-slate-900">{row.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-6 rounded-[24px] border border-white/70 bg-white/70 p-4 backdrop-blur-xl">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-900">Recent activity</span>
                  <Badge tone="neutral">Autonomous</Badge>
                </div>
            <div className="space-y-3 stagger-fade">
                  {[
                    { action: 'Sarah Chen booked a meeting', source: 'Web', time: '2m ago' },
                    { action: 'Miguel Rivera qualified', source: 'API', time: '7m ago' },
                    { action: 'Anika Patel entered nurture', source: 'Webhook', time: '12m ago' }
                  ].map((row) => (
                    <div key={row.action} className="flex items-center justify-between gap-3 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="size-2 rounded-full bg-emerald-300" />
                        <span className="text-slate-900">{row.action}</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-500">
                        <span>{row.source}</span>
                        <span>{row.time}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          </div>
        </section>

        <SectionShell tone="tinted">
          <div className="rounded-[28px] border border-white/70 bg-white/65 px-6 py-5 backdrop-blur-2xl">
            <p className="text-center text-sm font-medium tracking-wide text-slate-500">
              Trusted by teams that prefer a calm system over a noisy stack
            </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-3 stagger-fade">
              {TRUST_NAMES.map((name) => (
                <span key={name} className="rounded-full border border-white/70 bg-white/80 px-4 py-2 text-sm font-medium text-slate-600">
                  {name}
                </span>
              ))}
            </div>
          </div>
        </SectionShell>

        <SectionShell id="features">
          <SectionHeading
            eyebrow="Features"
            title="Everything the pipeline needs."
            copy="A strict V1 lead-to-revenue surface with capture, qualification, follow-up, booking, CRM visibility, and setup guidance."
          />

          <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-3 stagger-fade">
            {FEATURES.map((feature) => {
              const Icon = feature.icon;

              return (
                <Card key={feature.title} hover className="flex h-full flex-col justify-between">
                  <div>
                    <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,rgba(234,111,74,0.14),rgba(122,160,212,0.14),rgba(255,255,255,0.22))]">
                      <Icon className="size-6 text-slate-700" />
                    </div>
                    <h3 className="text-xl font-semibold tracking-tight text-slate-900">{feature.title}</h3>
                    <p className="mt-3 text-sm leading-7 text-slate-600">{feature.description}</p>
                  </div>

                  <div className="mt-6 flex items-center justify-between gap-3">
                    <Badge tone="neutral">Working</Badge>
                    <ActionButton variant="ghost" size="sm" onClick={() => router.push(feature.href)}>
                      {feature.action}
                      <ExternalLink className="size-4" />
                    </ActionButton>
                  </div>
                </Card>
              );
            })}
          </div>
        </SectionShell>

        <SectionShell id="how-it-works" tone="tinted">
          <SectionHeading
            eyebrow="Workflow"
            title="From lead to revenue in four calm steps."
            copy="Every handoff is automated and every state is visible, so the system stays predictable under load."
            align="center"
          />

          <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-4 stagger-fade">
            {STEPS.map((step) => (
              <Card key={step.number} hover className="relative overflow-hidden">
                <p className="text-5xl font-semibold tracking-tighter text-slate-200">{step.number}</p>
                <h3 className="mt-6 text-xl font-semibold tracking-tight text-slate-900">{step.title}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-600">{step.body}</p>
              </Card>
            ))}
          </div>
        </SectionShell>

        <SectionShell id="workflow">
          <SectionHeading
            eyebrow="Workflow"
            title="What the customer does in strict V1."
            copy="The workflow is short: sign in, connect one source, send a test lead, and let the agent handle follow-up and booking. Advanced analytics stay hidden."
            align="center"
          />

          <div className="mt-10 grid gap-6 lg:grid-cols-[1.15fr_0.85fr] stagger-fade">
            <Card>
              <div className="mb-5 flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-slate-500">Customer steps</p>
                  <h3 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">Four calm steps to go live</h3>
                </div>
                <Badge tone="success">V1</Badge>
              </div>

              <div className="space-y-4 stagger-fade">
                {[
                  {
                    step: '01',
                    title: 'Sign in',
                    body: 'Create an account with email or Google and land in the dashboard.'
                  },
                  {
                    step: '02',
                    title: 'Connect one source',
                    body: 'Use one intake path first: website form, REST API, or webhook receiver.'
                  },
                  {
                    step: '03',
                    title: 'Send a test lead',
                    body: 'Confirm the lead appears in the dashboard and lead timeline.'
                  },
                  {
                    step: '04',
                    title: 'Go live',
                    body: 'Set email and calendar providers, then let the agent run.'
                  }
                ].map((step) => (
                  <div key={step.step} className="rounded-[24px] border border-white/70 bg-white/70 p-4">
                    <div className="flex items-start gap-4">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,rgba(234,111,74,0.14),rgba(122,160,212,0.14),rgba(255,255,255,0.22))] text-sm font-semibold text-slate-700">
                        {step.step}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-base font-semibold tracking-tight text-slate-900">{step.title}</h4>
                        <p className="mt-1 text-sm leading-6 text-slate-600">{step.body}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card>
              <div className="mb-5">
                <p className="text-sm font-medium text-slate-500">External setup</p>
                <h3 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">What still needs a real account.</h3>
              </div>

              <div className="space-y-3 stagger-fade">
                {[
                  'Create Google OAuth credentials if you want Google sign-in.',
                  'Set a production email provider and verified sender for real inbox delivery.',
                  'Connect a live calendar provider if you want booking sync outside local mode.',
                  'Point your website, CRM, or automation tool at the capture endpoint.',
                  'Set production domain and runtime env vars when you leave localhost.'
                ].map((item) => (
                  <div key={item} className="flex items-start gap-3 rounded-[20px] border border-white/70 bg-white/70 px-4 py-3">
                    <Check className="mt-0.5 size-4 shrink-0 text-emerald-500" />
                    <p className="text-sm leading-6 text-slate-700">{item}</p>
                  </div>
                ))}
              </div>

              <div className="mt-6 rounded-[24px] border border-white/70 bg-white/70 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Hidden in V1</p>
              <div className="mt-3 flex flex-wrap gap-2 stagger-fade">
                  {['Analytics', 'Optimization loop', 'WhatsApp'].map((item) => (
                    <Badge key={item} tone="neutral">
                      {item}
                    </Badge>
                  ))}
                </div>
                <p className="mt-4 text-sm leading-6 text-slate-600">
                  These screens are intentionally hidden until a later release so the V1 surface stays focused.
                </p>
              </div>
            </Card>
          </div>
        </SectionShell>

        <SectionShell id="testimonials" tone="tinted">
          <SectionHeading
            eyebrow="Testimonials"
            title="Loved by teams that value consistency."
            copy="The system works quietly in the background, which is exactly what a lead engine should do."
            align="center"
          />

          <div className="mt-10 grid gap-4 lg:grid-cols-3 stagger-fade">
            {TESTIMONIALS.map((testimonial) => (
              <Card key={testimonial.name} className="flex h-full flex-col justify-between">
                <div className="flex gap-1 text-amber-400">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <Star key={index} className="size-4 fill-current" />
                  ))}
                </div>
                <p className="mt-5 text-sm leading-7 text-slate-700">"{testimonial.quote}"</p>
                <div className="mt-6 flex items-end justify-between gap-4">
                  <div>
                    <p className="font-semibold text-slate-900">{testimonial.name}</p>
                    <p className="text-xs text-slate-500">{testimonial.role}</p>
                  </div>
                  <Badge tone="accent">{testimonial.metric}</Badge>
                </div>
              </Card>
            ))}
          </div>
        </SectionShell>

        <SectionShell id="pricing">
          <SectionHeading
            eyebrow="Pricing"
            title="Straightforward plans with a calm upgrade path."
            copy="Start small, validate the flow, then scale the automation when the team is ready."
            align="center"
          />

          <div className="mt-10 grid gap-4 lg:grid-cols-3 stagger-fade">
            {PRICING.map((plan) => (
              <Card
                key={plan.name}
                className={
                  plan.featured
                    ? 'relative border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.9),rgba(247,244,239,0.76))]'
                    : ''
                }
              >
                {plan.featured && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="rounded-full bg-[linear-gradient(135deg,rgba(54,66,84,0.98),rgba(122,160,212,0.92),rgba(234,111,74,0.78))] px-4 py-1 text-xs font-semibold text-white shadow-[0_10px_24px_rgba(47,58,72,0.16)]">
                      Most popular
                    </span>
                  </div>
                )}

                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-semibold tracking-tight text-slate-900">{plan.name}</h3>
                    <p className="mt-2 text-sm leading-7 text-slate-600">{plan.subtitle}</p>
                  </div>
                  <div className="rounded-2xl bg-white/70 px-3 py-2 text-right">
                    <p className="text-3xl font-semibold tracking-tight text-slate-900">{plan.price}</p>
                  </div>
                </div>

                <ul className="mt-6 space-y-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3 text-sm text-slate-700">
                      <Check className="mt-0.5 size-4 shrink-0 text-emerald-500" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <ActionButton
                  variant={plan.featured ? 'primary' : 'secondary'}
                  className="mt-8 w-full justify-center"
                  onClick={() => {
                    if (plan.name === 'Enterprise') {
                      window.location.href = 'mailto:sales@leadflow.ai?subject=LeadFlow%20AI%20Enterprise%20Inquiry';
                      return;
                    }
                    scrollToSection('cta');
                  }}
                >
                  {plan.action}
                </ActionButton>
              </Card>
            ))}
          </div>
        </SectionShell>

        <SectionShell id="cta" tone="tinted">
          <Card className="overflow-hidden">
            <div className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-center stagger-fade">
              <div>
                <Badge tone="accent">Ready to deploy</Badge>
                <h2 className="mt-5 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl lg:text-5xl">
                  Start capturing and qualifying leads without the busywork.
                </h2>
                <p className="mt-4 max-w-xl text-base leading-7 text-slate-600">
                  The agent keeps running 24/7, and the UI stays clear enough that your team can trust it at a glance.
                </p>

                <div className="mt-6 grid gap-3 text-sm text-slate-600 stagger-fade">
                  {[
                    'Capture web, API, and webhook leads',
                    'Autonomous follow-up and booking',
                    'CRM notes, timeline, and workflow guide'
                  ].map((item) => (
                    <div key={item} className="flex items-center gap-3">
                      <span className="size-2 rounded-full bg-emerald-300" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-[28px] border border-white/70 bg-white/72 p-6 shadow-[0_24px_80px_rgba(95,111,133,0.12)] backdrop-blur-2xl">
                <h3 className="text-xl font-semibold tracking-tight text-slate-900">Create a lead</h3>
                <p className="mt-2 text-sm leading-6 text-slate-500">This form is wired to the real capture endpoint.</p>

                <form className="mt-5 space-y-4 stagger-fade" onSubmit={(event) => void handleCtaSubmit(event)}>
                  <div className="grid gap-4 sm:grid-cols-2 stagger-fade">
                    <input
                      type="text"
                      value={ctaName}
                      onChange={(event) => setCtaName(event.target.value)}
                      placeholder="Full name"
                      className="w-full rounded-full border border-white/70 bg-white/80 px-4 py-3 text-sm text-slate-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)] outline-none transition-all duration-300 placeholder:text-slate-400 focus:border-slate-300 focus:bg-white"
                    />
                    <input
                      type="text"
                      value={ctaCompany}
                      onChange={(event) => setCtaCompany(event.target.value)}
                      placeholder="Company"
                      className="w-full rounded-full border border-white/70 bg-white/80 px-4 py-3 text-sm text-slate-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)] outline-none transition-all duration-300 placeholder:text-slate-400 focus:border-slate-300 focus:bg-white"
                    />
                  </div>
                  <input
                    type="email"
                    value={ctaEmail}
                    onChange={(event) => setCtaEmail(event.target.value)}
                    placeholder="Work email"
                    className="w-full rounded-full border border-white/70 bg-white/80 px-4 py-3 text-sm text-slate-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)] outline-none transition-all duration-300 placeholder:text-slate-400 focus:border-slate-300 focus:bg-white"
                  />

                  <ActionButton
                    type="submit"
                    loading={ctaState === 'loading'}
                    success={ctaState === 'success'}
                    className="w-full justify-center"
                  >
                    Create lead
                  </ActionButton>
                </form>

                {ctaMessage && (
                  <div className="mt-4 rounded-2xl border border-white/70 bg-white/70 px-4 py-3 text-sm text-slate-700">
                    {ctaMessage}
                  </div>
                )}
              </div>
            </div>
          </Card>
        </SectionShell>
      </main>

      {demoOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 px-4 backdrop-blur-sm">
          <Card className="w-full max-w-3xl overflow-hidden p-0">
            <div className="flex items-center justify-between border-b border-white/70 px-6 py-4">
              <div>
                <p className="text-sm font-medium text-slate-500">Demo preview</p>
                <h3 className="text-xl font-semibold tracking-tight text-slate-900">Autonomous lead-to-revenue flow</h3>
              </div>
              <button
                type="button"
                onClick={() => setDemoOpen(false)}
                className="rounded-full border border-white/70 bg-white/80 px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:text-slate-900"
              >
                Close
              </button>
            </div>

            <div className="grid gap-6 p-6 lg:grid-cols-[1fr_0.9fr] stagger-fade">
              <div className="space-y-4">
                <div className="rounded-[24px] border border-white/70 bg-white/70 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-400">Preview</p>
                  <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">Lead captured from the landing page</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    The system qualifies the lead, logs the activity, and prepares the next step automatically.
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 stagger-fade">
                  {[
                    { label: 'Status', value: 'Qualified' },
                    { label: 'Next step', value: 'Booking offer' },
                    { label: 'Score', value: '94 / 100' },
                    { label: 'Owner', value: 'Autonomous' }
                  ].map((item) => (
                    <div key={item.label} className="rounded-[20px] border border-white/70 bg-white/70 p-4">
                      <p className="text-xs text-slate-500">{item.label}</p>
                      <p className="mt-1 text-sm font-semibold text-slate-900">{item.value}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-[24px] border border-white/70 bg-white/75 p-5">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-slate-500">Actions</p>
                  <Badge tone="success">Ready</Badge>
                </div>
                <div className="mt-5 space-y-3 stagger-fade">
                  <ActionButton className="w-full justify-center" onClick={() => router.push('/dashboard')}>
                    Open dashboard
                  </ActionButton>
                  <ActionButton variant="secondary" className="w-full justify-center" onClick={() => scrollToSection('pricing')}>
                    View plans
                  </ActionButton>
                  <ActionButton variant="ghost" className="w-full justify-center" onClick={() => setDemoOpen(false)}>
                    Return to page
                  </ActionButton>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      <footer className="border-t border-white/55 bg-white/35">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-6 py-8 text-sm text-slate-500 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div className="flex items-center gap-2 font-medium text-slate-700">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[linear-gradient(135deg,rgba(234,111,74,0.96),rgba(122,160,212,0.96))] text-xs font-black text-white">
              L
            </span>
            LeadFlow AI
          </div>
          <div className="flex flex-wrap gap-4 stagger-fade">
            {['Privacy', 'Terms', 'Docs', 'Status'].map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => router.push('/dashboard')}
                className="transition-colors hover:text-slate-900"
              >
                {item}
              </button>
            ))}
          </div>
          <p>© 2026 LeadFlow AI. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
