import type { Metadata } from 'next';

import { WorkflowClient } from '../../components/workflow-client';
import { requireServerCurrentUser } from '../../lib/auth';

export const metadata: Metadata = {
  title: 'Workflow | Autonomous Lead-to-Revenue Agent',
  description: 'Strict V1 customer workflow and remaining external setup checklist.'
};

export default async function WorkflowPage() {
  await requireServerCurrentUser('/workflow');
  return <WorkflowClient />;
}
