import type { Metadata } from 'next';
import Link from 'next/link';

import { Badge, Card } from '../../components/ui';
import { requireServerCurrentUser } from '../../lib/auth';

export const metadata: Metadata = {
  title: 'Analytics | Autonomous Lead-to-Revenue Agent',
  description: 'Analytics is hidden in strict V1 and will return in a later release.'
};

export default async function AnalyticsPage() {
  await requireServerCurrentUser('/analytics');

  return (
    <main className="app-shell dashboard-shell">
      <section className="hero dashboard-hero">
        <div className="hero-copy">
          <Badge tone="warning">Hidden in V1</Badge>
          <h1>Analytics is not exposed in strict V1.</h1>
          <p>
            The V1 release keeps the core revenue loop visible and intentionally hides the advanced analytics surface.
            Use the workflow page to see what is included and what still needs external setup.
          </p>

          <div className="hero-actions">
            <Link
              href="/workflow"
              className="inline-flex items-center justify-center rounded-full border border-white/70 bg-white/80 px-5 py-2.5 text-sm font-semibold text-slate-900 shadow-[0_12px_30px_rgba(92,107,128,0.1)] transition-all duration-300 hover:bg-white hover:shadow-[0_16px_36px_rgba(92,107,128,0.14)]"
            >
              Open workflow
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center rounded-full border border-white/65 bg-white/60 px-5 py-2.5 text-sm font-medium text-slate-600 transition-all duration-300 hover:bg-white hover:text-slate-900"
            >
              Back to dashboard
            </Link>
          </div>
        </div>

        <Card className="space-y-4">
          <div className="rounded-[24px] border border-white/70 bg-white/70 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Visible in V1</p>
            <p className="mt-2 text-sm leading-6 text-slate-700">
              Lead capture, qualification, follow-up, booking, CRM timeline, auth, and integrations.
            </p>
          </div>

          <div className="rounded-[24px] border border-white/70 bg-white/70 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Hidden for now</p>
            <p className="mt-2 text-sm leading-6 text-slate-700">
              Analytics dashboards, daily reports, optimization loops, and channel expansion controls.
            </p>
          </div>

          <div className="rounded-[24px] border border-white/70 bg-white/70 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Next action</p>
            <p className="mt-2 text-sm leading-6 text-slate-700">
              Open the workflow page to see the exact customer setup steps and the remaining external tasks.
            </p>
          </div>
        </Card>
      </section>
    </main>
  );
}
