'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, ClipboardCopy, ExternalLink, PlugZap } from 'lucide-react';

import { captureLead, getIntegrations } from '../lib/api';
import type { IntegrationOverviewResponse, IntegrationSnippet } from '../lib/types';
import { ActionButton, Badge, Card, MetricCard } from './ui';

const statusTone: Record<IntegrationOverviewResponse['connectors'][number]['status'], 'success' | 'warning' | 'info'> = {
  ready: 'success',
  recommended: 'warning',
  available: 'info'
};

const previewOverview: IntegrationOverviewResponse = {
  appUrl: 'http://localhost:3000',
  captureEndpoint: 'http://localhost:3000/api/v1/leads',
  webhookEndpoint: 'http://localhost:3000/api/v1/webhooks/leads',
  runtime: {
    database: 'loading',
    redis: 'loading',
    llmProvider: 'loading',
    emailProvider: 'loading',
    whatsappProvider: 'loading',
    calendarProvider: 'loading'
  },
  captureKeyHeader: 'x-alr-capture-key',
  connectors: [
    {
      name: 'Website form',
      description: 'Send submissions from your site directly into the lead pipeline.',
      endpoint: 'http://localhost:3000/api/v1/leads',
      method: 'POST',
      status: 'ready',
      handoff: 'Use the capture endpoint in your form action or frontend fetch call.'
    },
    {
      name: 'REST API',
      description: 'Push normalized lead data from a backend or middleware job.',
      endpoint: 'http://localhost:3000/api/v1/leads',
      method: 'POST',
      status: 'ready',
      handoff: 'Forward JSON payloads with your own source and campaign metadata.'
    },
    {
      name: 'Webhook receiver',
      description: 'Receive lead events from CRM, ads, and automation tools.',
      endpoint: 'http://localhost:3000/api/v1/webhooks/leads',
      method: 'WEBHOOK',
      status: 'ready',
      handoff: 'Relay third-party events without rewriting the rest of your stack.'
    },
    {
      name: 'Zapier / Make',
      description: 'No-code automations can relay leads from one app into this agent.',
      endpoint: 'http://localhost:3000/api/v1/leads',
      method: 'WORKFLOW',
      status: 'recommended',
      handoff: 'Trigger on a new lead and POST the mapped payload to the agent.'
    }
  ],
  snippets: [
    {
      title: 'cURL example',
      language: 'bash',
      code: `curl -X POST "http://localhost:3000/api/v1/leads" \\
  -H "Content-Type: application/json" \\
  -d '{\n  "source": "integration",\n  "firstName": "Ava",\n  "lastName": "Patel",\n  "email": "ava@example.com",\n  "company": "Northwind",\n  "jobTitle": "VP of Growth",\n  "message": "Requesting a demo and pricing.",\n  "intentHint": "Pricing request from connected platform",\n  "metadata": {\n    "sourceSystem": "hubspot",\n    "campaign": "spring-launch",\n    "entryPoint": "integrations-page"\n  }\n}'`
    },
    {
      title: 'Fetch example',
      language: 'typescript',
      code: `await fetch("http://localhost:3000/api/v1/leads", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    source: "integration",
    firstName: "Ava",
    lastName: "Patel",
    email: "ava@example.com",
    company: "Northwind",
    jobTitle: "VP of Growth",
    message: "Requesting a demo and pricing.",
    intentHint: "Pricing request from connected platform",
    metadata: {
      sourceSystem: "hubspot",
      campaign: "spring-launch",
      entryPoint: "integrations-page"
    }
  })
});`
    },
    {
      title: 'Webhook payload',
      language: 'json',
      code: `{
  "source": "webhook",
  "externalId": "crm-contact-123",
  "firstName": "Ava",
  "lastName": "Patel",
  "email": "ava@example.com",
  "company": "Northwind",
  "jobTitle": "VP of Growth",
  "message": "Requesting a demo and pricing.",
  "intentHint": "Pricing request from connected platform",
  "metadata": {
    "sourceSystem": "salesforce",
    "campaign": "spring-launch",
    "entryPoint": "integrations-page"
  }
}`
    }
  ],
  checklist: [
    'Create Google OAuth credentials if you want Google sign-in.',
    'Set a production email provider and verified sender for real inbox delivery.',
    'Connect a live calendar provider if you want booking sync outside local mode.',
    'Point your website, CRM, or automation tool at the capture endpoint.',
    'Set production domain and runtime env vars when you leave localhost.'
  ],
  payloadExample: {
    source: 'integration',
    firstName: 'Ava',
    lastName: 'Patel',
    email: 'ava@example.com',
    company: 'Northwind',
    jobTitle: 'VP of Growth',
    message: 'Requesting a demo and pricing.',
    intentHint: 'Pricing request from connected platform',
    metadata: {
      sourceSystem: 'hubspot',
      campaign: 'spring-launch',
      entryPoint: 'integrations-page'
    }
  }
};

const V1_CONNECTOR_NAMES = new Set(['Website form', 'REST API', 'Webhook receiver']);

const V1_EXTERNAL_CHECKLIST = [
  'Create Google OAuth credentials if you want Google sign-in.',
  'Set a production email provider and verified sender for real inbox delivery.',
  'Connect a live calendar provider if you want booking sync outside local mode.',
  'Point your website, CRM, or automation tool at the capture endpoint.',
  'Set production domain and runtime env vars when you leave localhost.'
];

function formatMethod(method: IntegrationOverviewResponse['connectors'][number]['method']) {
  return method === 'WEBHOOK' ? 'Webhook' : method === 'WORKFLOW' ? 'Workflow' : 'POST';
}

function snippetKey(index: number) {
  return `snippet-${index}`;
}

type SnippetCardProps = {
  snippet: IntegrationSnippet;
  index: number;
  copiedKey: string | null;
  onCopy: (key: string, value: string) => void;
};

function SnippetCard({ snippet, index, copiedKey, onCopy }: SnippetCardProps) {
  const key = snippetKey(index);

  return (
    <Card className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">{snippet.language}</p>
          <h3 className="mt-1 text-lg font-semibold text-slate-900">{snippet.title}</h3>
        </div>
        <ActionButton
          variant="ghost"
          size="sm"
          success={copiedKey === key}
          onClick={() => onCopy(key, snippet.code)}
        >
          <ClipboardCopy className="h-4 w-4" />
          Copy
        </ActionButton>
      </div>

      <pre className="overflow-x-auto rounded-[20px] bg-slate-950 px-4 py-4 text-[0.8rem] leading-6 text-slate-100">
        <code>{snippet.code}</code>
      </pre>
    </Card>
  );
}

export function IntegrationsClient() {
  const router = useRouter();
  const [overview, setOverview] = useState(previewOverview);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [testState, setTestState] = useState<'idle' | 'loading' | 'success'>('idle');
  const copyTimer = useRef<number | null>(null);
  const redirectTimer = useRef<number | null>(null);
  const copyTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const visibleConnectors = overview.connectors.filter((connector) => V1_CONNECTOR_NAMES.has(connector.name));
  const readyCount = visibleConnectors.filter((connector) => connector.status === 'ready').length;
  const externalStepCount = V1_EXTERNAL_CHECKLIST.length;

  useEffect(() => {
    let active = true;

    async function loadOverview() {
      try {
        const data = await getIntegrations();
        if (active) {
          setOverview(data);
        }
      } catch (loadError) {
        if (active) {
          setError(loadError instanceof Error ? loadError.message : 'Unable to load integrations overview');
        }
      }
    }

    void loadOverview();

    return () => {
      active = false;
      if (copyTimer.current) {
        window.clearTimeout(copyTimer.current);
      }
      if (redirectTimer.current) {
        window.clearTimeout(redirectTimer.current);
      }
    };
  }, []);

  function copyWithFallback(value: string) {
    if (navigator.clipboard?.writeText) {
      return navigator.clipboard.writeText(value);
    }

    if (copyTextareaRef.current) {
      copyTextareaRef.current.value = value;
      copyTextareaRef.current.focus();
      copyTextareaRef.current.select();
      document.execCommand('copy');
    }

    return Promise.resolve();
  }

  function flashCopy(key: string) {
    if (copyTimer.current) {
      window.clearTimeout(copyTimer.current);
    }

    setCopiedKey(key);
    copyTimer.current = window.setTimeout(() => {
      setCopiedKey(null);
      copyTimer.current = null;
    }, 1300);
  }

  async function handleCopy(key: string, value: string) {
    try {
      await copyWithFallback(value);
      flashCopy(key);
      setMessage('Snippet copied to clipboard.');
      setError(null);
    } catch (copyError) {
      setError(copyError instanceof Error ? copyError.message : 'Unable to copy snippet');
    }
  }

  async function sendTestLead() {
    setTestState('loading');
    setMessage(null);
    setError(null);

    try {
      const response = await captureLead({
        source: 'integration',
        firstName: 'Ava',
        lastName: 'Patel',
        email: `integration-${Date.now()}@example.com`,
        company: 'Northwind',
        jobTitle: 'VP of Growth',
        message: 'This lead proves the connection is working.',
        intentHint: 'Test lead from integrations page',
        metadata: {
          entryPoint: 'integrations-page',
          sourceSystem: 'onboarding-demo'
        }
      });

      setTestState('success');
      setMessage('Test lead captured. Opening the lead timeline.');
      if (redirectTimer.current) {
        window.clearTimeout(redirectTimer.current);
      }
      redirectTimer.current = window.setTimeout(() => {
        router.push(`/leads/${response.lead.id}`);
      }, 900);
    } catch (testError) {
      setTestState('idle');
      setError(testError instanceof Error ? testError.message : 'Unable to send test lead');
    }
  }

  return (
    <main className="app-shell dashboard-shell">
      <section className="hero dashboard-hero">
        <div className="hero-copy">
          <Badge tone="accent">Strict V1 onboarding</Badge>
          <h1>Connect your platform to the agent.</h1>
          <p>
            Keep V1 focused on the core intake paths: website form, REST API, and webhook receiver.
            Once one source is connected, the same pipeline qualifies, follows up, and books meetings automatically.
          </p>

          <div className="hero-actions">
          <ActionButton variant="primary" loading={testState === 'loading'} success={testState === 'success'} onClick={() => void sendTestLead()}>
            Send test lead
          </ActionButton>
            <ActionButton
              variant="secondary"
              success={copiedKey === 'capture-endpoint'}
              onClick={() => void handleCopy('capture-endpoint', overview.captureEndpoint)}
            >
              <ClipboardCopy className="h-4 w-4" />
              Copy capture endpoint
            </ActionButton>
            <ActionButton variant="ghost" onClick={() => window.location.assign('/dashboard')}>
              Open dashboard
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
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/70 bg-white/65 p-4 backdrop-blur-md">
              <p className="text-sm text-slate-500">Capture endpoint</p>
              <p className="mt-1 break-all text-sm font-semibold text-slate-900">{overview.captureEndpoint}</p>
            </div>
            <div className="rounded-2xl border border-white/70 bg-white/65 p-4 backdrop-blur-md">
              <p className="text-sm text-slate-500">Webhook endpoint</p>
              <p className="mt-1 break-all text-sm font-semibold text-slate-900">{overview.webhookEndpoint}</p>
            </div>
            <div className="rounded-2xl border border-white/70 bg-white/65 p-4 backdrop-blur-md">
              <p className="text-sm text-slate-500">Ready connectors</p>
              <p className="mt-1 text-xl font-semibold text-slate-900">{readyCount}</p>
            </div>
            <div className="rounded-2xl border border-white/70 bg-white/65 p-4 backdrop-blur-md">
              <p className="text-sm text-slate-500">External steps</p>
              <p className="mt-1 text-xl font-semibold text-slate-900">{externalStepCount}</p>
            </div>
          </div>

          <div className="rounded-2xl border border-white/70 bg-white/55 p-4 backdrop-blur-md">
            <div className="mb-3 flex items-center justify-between gap-3">
              <span className="text-sm font-medium text-slate-900">Runtime</span>
              <Badge tone="info">Public capture</Badge>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
                {[
                  ['Database', overview.runtime.database],
                  ['Redis', overview.runtime.redis],
                  ['LLM', overview.runtime.llmProvider],
                  ['Email', overview.runtime.emailProvider],
                  ['Calendar', overview.runtime.calendarProvider]
                ].map(([label, value]) => (
                  <div key={label} className="rounded-2xl border border-white/70 bg-white/70 px-3 py-2">
                  <p className="text-[0.7rem] uppercase tracking-[0.2em] text-slate-400">{label}</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">{value}</p>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </section>

      <div className="metrics-grid">
        <MetricCard label="Capture" value="POST /leads" hint="Website form and API intake" />
        <MetricCard label="Webhook" value="POST /webhooks/leads" hint="CRM and automation tools" />
        <MetricCard label="Ready flows" value={readyCount} hint="Immediate connection paths" />
        <MetricCard label="External steps" value={externalStepCount} hint="What still needs a real account or deployment target" />
      </div>

      <div className="content-grid">
        <Card>
          <div className="mb-6">
            <Badge tone="info">Connection paths</Badge>
            <h2 className="page-title mt-3">Where leads come from in V1.</h2>
            <p className="page-subtitle">
              Pick one source that matches your stack, then send the same normalized payload into the agent.
            </p>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            {visibleConnectors.map((connector) => (
              <div key={connector.name} className="rounded-[24px] border border-white/70 bg-white/70 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-semibold text-slate-900">{connector.name}</h3>
                      <Badge tone={statusTone[connector.status]}>{connector.status}</Badge>
                    </div>
                    <p className="text-sm leading-6 text-slate-600">{connector.description}</p>
                  </div>
                  <Badge tone="accent">{formatMethod(connector.method)}</Badge>
                </div>

                <div className="mt-4 rounded-2xl border border-white/70 bg-white/70 px-4 py-3">
                  <p className="text-[0.7rem] uppercase tracking-[0.2em] text-slate-400">Endpoint</p>
                  <p className="mt-1 break-all text-sm font-semibold text-slate-900">{connector.endpoint}</p>
                </div>

                <p className="mt-4 text-sm leading-6 text-slate-500">{connector.handoff}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <div className="mb-6">
            <Badge tone="accent">Copyable snippets</Badge>
            <h2 className="page-title mt-3">Use the same payload everywhere.</h2>
            <p className="page-subtitle">
              Copy the example that matches your platform and wire it into your form, webhook, or integration job.
            </p>
          </div>

          <div className="space-y-4">
            {overview.snippets.map((snippet, index) => (
              <SnippetCard key={snippet.title} snippet={snippet} index={index} copiedKey={copiedKey} onCopy={handleCopy} />
            ))}
          </div>
        </Card>
      </div>

      <div className="content-grid single">
        <Card>
          <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
            <div>
              <Badge tone="success">External setup</Badge>
              <h2 className="page-title mt-3">What still needs a real account or deployment target.</h2>
              <p className="page-subtitle">
                The dashboard already tracks leads, qualification, follow-up, and booking. Complete the steps below and the
                V1 agent is ready to run in production mode.
              </p>
            </div>
            <ActionButton variant="ghost" onClick={() => window.location.assign('/leads')}>
              <ExternalLink className="h-4 w-4" />
              View leads
            </ActionButton>
          </div>

          <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="space-y-3">
              {V1_EXTERNAL_CHECKLIST.map((item) => (
                <div key={item} className="flex items-start gap-3 rounded-[20px] border border-white/70 bg-white/70 px-4 py-3">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
                  <p className="text-sm leading-6 text-slate-700">{item}</p>
                </div>
              ))}
            </div>

            <div className="space-y-4">
              <div className="rounded-[24px] border border-white/70 bg-white/70 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Canonical payload</p>
                <pre className="mt-3 overflow-x-auto rounded-[20px] bg-slate-950 px-4 py-4 text-[0.78rem] leading-6 text-slate-100">
                  <code>{JSON.stringify(overview.payloadExample, null, 2)}</code>
                </pre>
                <div className="mt-4 flex flex-wrap gap-3">
                  <ActionButton variant="ghost" size="sm" success={copiedKey === 'payload'} onClick={() => void handleCopy('payload', JSON.stringify(overview.payloadExample, null, 2))}>
                    <ClipboardCopy className="h-4 w-4" />
                    Copy payload
                  </ActionButton>
                  <ActionButton variant="primary" size="sm" loading={testState === 'loading'} success={testState === 'success'} onClick={() => void sendTestLead()}>
                    <PlugZap className="h-4 w-4" />
                    Send test lead
                  </ActionButton>
                </div>
              </div>

              <div className="rounded-[24px] border border-white/70 bg-white/70 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">What the user does</p>
                <div className="mt-3 space-y-2 text-sm leading-6 text-slate-600">
                  <p>1. A customer signs in and opens the workflow page.</p>
                  <p>2. They connect one source and send a test lead.</p>
                  <p>3. The lead shows up in the dashboard and lead timeline.</p>
                  <p>4. Qualification, follow-up, and booking automation run automatically.</p>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>

      <textarea ref={copyTextareaRef} aria-hidden className="absolute left-[-9999px] h-0 w-0 opacity-0" readOnly />
    </main>
  );
}
