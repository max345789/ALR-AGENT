import type { Metadata } from 'next';

import { IntegrationsClient } from '../../components/integrations-client';
import { requireServerCurrentUser } from '../../lib/auth';

export const metadata: Metadata = {
  title: 'Integrations | Autonomous Lead-to-Revenue Agent',
  description: 'Connect website forms, APIs, webhooks, and automation tools to the lead-to-revenue agent.'
};

export default async function IntegrationsPage() {
  await requireServerCurrentUser('/integrations');
  return <IntegrationsClient />;
}
