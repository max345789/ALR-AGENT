import type { Metadata } from 'next';

import { BillingClient } from '../../components/billing-client';
import { requireServerCurrentUser } from '../../lib/auth';

export const metadata: Metadata = {
  title: 'Billing | Autonomous Lead-to-Revenue Agent',
  description: 'Manage workspace billing, capture keys, and plan upgrades.'
};

export default async function BillingPage() {
  await requireServerCurrentUser('/billing');
  return <BillingClient />;
}
