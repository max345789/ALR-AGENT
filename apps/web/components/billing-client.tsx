'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, Copy, ExternalLink, RotateCcw, ShieldCheck, Sparkles } from 'lucide-react';

import { createBillingCheckout, createBillingPortal, getBilling, rotateCaptureKey } from '../lib/api';
import type { BillingOverviewResponse } from '../lib/types';
import { ActionButton, Badge, Card, MetricCard } from './ui';

type BillingPlanId = 'starter' | 'pro' | 'enterprise';

const PLAN_COPY: Record<BillingPlanId, { name: string; price: string; description: string; features: string[] }> = {
  starter: {
    name: 'Starter',
    price: '$49/mo',
    description: 'For a single workspace that wants automated lead capture and qualification.',
    features: ['1 workspace', 'Lead capture + qualification', 'Email follow-up', 'Basic booking handoff']
  },
  pro: {
    name: 'Pro',
    price: '$149/mo',
    description: 'For growing teams that need the full revenue loop with stronger limits.',
    features: ['Higher lead limits', 'Google login', 'Billing portal access', 'Priority support']
  },
  enterprise: {
    name: 'Enterprise',
    price: 'Custom',
    description: 'For high-volume teams that want custom limits, governance, and support.',
    features: ['Custom limits', 'Dedicated onboarding', 'SLA + support', 'Custom integrations']
  }
};

function planRank(plan: string): number {
  if (plan === 'enterprise') return 3;
  if (plan === 'pro') return 2;
  if (plan === 'starter') return 1;
  return 0;
}

export function BillingClient() {
  const [billing, setBilling] = useState<BillingOverviewResponse['billing'] | null>(null);
  const [loadingPlan, setLoadingPlan] = useState<BillingPlanId | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [rotatingKey, setRotatingKey] = useState(false);
  const [oneTimeKey, setOneTimeKey] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const payload = await getBilling();
        if (active) {
          setBilling(payload.billing);
        }
      } catch (loadError) {
        if (active) {
          setError(loadError instanceof Error ? loadError.message : 'Unable to load billing');
        }
      }
    }

    void load();

    return () => {
      active = false;
    };
  }, []);

  async function handleCheckout(plan: BillingPlanId) {
    setLoadingPlan(plan);
    setError(null);
    setMessage(null);
    try {
      const { checkoutUrl } = await createBillingCheckout(plan);
      window.location.assign(checkoutUrl);
    } catch (checkoutError) {
      setError(checkoutError instanceof Error ? checkoutError.message : 'Unable to start checkout');
    } finally {
      setLoadingPlan(null);
    }
  }

  async function handlePortal() {
    setPortalLoading(true);
    setError(null);
    try {
      const { portalUrl } = await createBillingPortal();
      window.location.assign(portalUrl);
    } catch (portalError) {
      setError(portalError instanceof Error ? portalError.message : 'Unable to open billing portal');
    } finally {
      setPortalLoading(false);
    }
  }

  async function handleRotateKey() {
    setRotatingKey(true);
    setError(null);
    try {
      const payload = await rotateCaptureKey();
      setBilling(payload.overview);
      setOneTimeKey(payload.captureKey);
      setMessage('A new capture key was created. Copy it now, because it is shown only once.');
    } catch (rotateError) {
      setError(rotateError instanceof Error ? rotateError.message : 'Unable to rotate capture key');
    } finally {
      setRotatingKey(false);
    }
  }

  const currentPlan = billing?.plan ?? 'trial';
  const billingActive = Boolean(
    billing &&
      (billing.status === 'active' ||
        (billing.status === 'trialing' && (!billing.trialEndsAt ? true : new Date(billing.trialEndsAt) > new Date())))
  );
  const trialMode = billing?.isBillingConfigured === false;
  const trialEndsLabel = billing?.trialEndsAt ? new Date(billing.trialEndsAt).toLocaleDateString() : '14 days';

  return (
    <main className="app-shell dashboard-shell">
      <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 pb-10 pt-6 sm:px-6 lg:px-8">
        <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
          <Card className="gap-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-2">
                <Badge tone={trialMode ? 'accent' : billingActive ? 'success' : 'warning'}>{trialMode ? 'Free trial' : billingActive ? 'Billing active' : 'Billing review'}</Badge>
                <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Billing and workspace access</h1>
                <p className="max-w-2xl text-sm leading-6 text-slate-600">
                  Launch on a 14-day free trial now. Paid billing stays disabled until you connect a provider later.
                </p>
              </div>
              <div className="flex gap-2">
                {billing?.isBillingConfigured ? (
                  <ActionButton variant="secondary" size="sm" onClick={handlePortal} loading={portalLoading}>
                    <ExternalLink className="size-4" />
                    Open billing portal
                  </ActionButton>
                ) : (
                  <ActionButton variant="secondary" size="sm" disabled>
                    <ExternalLink className="size-4" />
                    Paid billing later
                  </ActionButton>
                )}
                <ActionButton variant="ghost" size="sm" onClick={handleRotateKey} loading={rotatingKey}>
                  <RotateCcw className="size-4" />
                  Rotate key
                </ActionButton>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <MetricCard label="Plan" value={currentPlan.toUpperCase()} hint="Current workspace tier" />
              <MetricCard label="Status" value={billing?.status ?? 'loading'} hint="Subscription state" />
              <MetricCard
                label="Lead limit"
                value={billing ? new Intl.NumberFormat('en-US').format(billing.leadLimit) : '—'}
                hint="Workspace monthly allowance"
              />
              <MetricCard
                label="Capture key"
                value={billing?.captureKeyConfigured ? `••••${billing.captureKeyLast4 ?? '....'}` : 'Not set'}
                hint="Used by external forms and webhooks"
              />
            </div>

            {trialMode && (
              <div className="rounded-[24px] border border-slate-200/80 bg-slate-50 px-5 py-4 text-sm leading-6 text-slate-700">
                <strong className="font-semibold text-slate-900">Free-trial launch mode.</strong> Your workspace stays active for {trialEndsLabel}, and paid checkout will be enabled once you connect a billing provider later.
              </div>
            )}

            {message && <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{message}</div>}
            {error && <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}

            {oneTimeKey && (
              <div className="rounded-[24px] border border-slate-200/80 bg-white/90 p-5">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <ShieldCheck className="size-4 text-slate-700" />
                  New capture key
                </div>
                <p className="mt-2 text-xs leading-6 text-slate-500">
                  Copy this key into your website or CRM header as <code>x-alr-capture-key</code>. It will not be shown again.
                </p>
                <div className="mt-4 flex items-center gap-3">
                  <pre className="min-w-0 flex-1 overflow-x-auto rounded-2xl bg-slate-950 px-4 py-3 text-sm text-slate-100">
                    <code>{oneTimeKey}</code>
                  </pre>
                  <ActionButton
                    variant="secondary"
                    size="sm"
                    onClick={async () => {
                      await navigator.clipboard.writeText(oneTimeKey);
                      setMessage('Capture key copied to clipboard.');
                    }}
                  >
                    <Copy className="size-4" />
                    Copy
                  </ActionButton>
                </div>
              </div>
            )}
          </Card>

          <Card className="gap-5">
            <div className="space-y-2">
              <Badge tone="accent">Workspace</Badge>
              <h2 className="text-xl font-semibold tracking-tight text-slate-900">Account details</h2>
            </div>
            <div className="space-y-3 text-sm text-slate-600">
              <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-3">
                <span>Workspace</span>
                <span className="font-medium text-slate-900">{billing?.workspaceName ?? 'Loading...'}</span>
              </div>
              <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-3">
                <span>Workspace slug</span>
                <span className="font-medium text-slate-900">{billing?.workspaceSlug ?? '—'}</span>
              </div>
              <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-3">
                <span>Trial ends</span>
                <span className="font-medium text-slate-900">{trialEndsLabel}</span>
              </div>
              <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-3">
                <span>Billing provider</span>
                <span className="font-medium text-slate-900">{billing?.isBillingConfigured ? 'Stripe' : 'Trial only'}</span>
              </div>
            </div>
          </Card>
        </section>

        <section className="grid gap-4 xl:grid-cols-3">
          {(Object.entries(PLAN_COPY) as Array<[BillingPlanId, (typeof PLAN_COPY)[BillingPlanId]]>).map(([plan, copy]) => {
            const active = planRank(currentPlan) >= planRank(plan) && billing?.status === 'active';
            const loading = loadingPlan === plan;

            return (
              <Card key={plan} hover className="gap-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <Badge tone={plan === 'pro' ? 'accent' : plan === 'enterprise' ? 'info' : 'neutral'}>{copy.price}</Badge>
                    <h3 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900">{copy.name}</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{copy.description}</p>
                  </div>
                  {active && <Badge tone="success">Current</Badge>}
                </div>

                <ul className="space-y-3 text-sm text-slate-600">
                  {copy.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3">
                      <CheckCircle2 className="mt-0.5 size-4 text-emerald-500" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <ActionButton
                  variant={plan === 'enterprise' ? 'secondary' : 'primary'}
                  className="w-full justify-center"
                  loading={loading}
                  disabled={trialMode || !billing?.isBillingConfigured || active}
                  onClick={() => handleCheckout(plan)}
                >
                  {active
                    ? 'Already active'
                    : trialMode
                      ? 'Available after launch'
                      : plan === 'enterprise'
                        ? 'Contact sales'
                        : `Upgrade to ${copy.name}`}
                  <Sparkles className="size-4" />
                </ActionButton>
              </Card>
            );
          })}
        </section>
      </div>
    </main>
  );
}
