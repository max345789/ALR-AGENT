import { LeadsClient } from '../../components/leads-client';
import { requireServerCurrentUser } from '../../lib/auth';

export default async function LeadsPage() {
  await requireServerCurrentUser('/leads');
  return <LeadsClient />;
}
