import type { Metadata } from 'next';

import { DashboardClient } from '../../components/dashboard-client';
import { requireServerCurrentUser } from '../../lib/auth';

export const metadata: Metadata = {
  title: 'Dashboard | Autonomous Lead-to-Revenue Agent',
  description: 'Operational dashboard for the autonomous lead-to-revenue agent.'
};

export default async function DashboardPage() {
  await requireServerCurrentUser('/dashboard');
  return <DashboardClient />;
}
