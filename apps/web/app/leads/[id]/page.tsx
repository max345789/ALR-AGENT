import { LeadDetailClient } from '../../../components/lead-detail-client';
import { requireServerCurrentUser } from '../../../lib/auth';

interface LeadPageProps {
  params: Promise<{ id: string }>;
}

export default async function LeadPage({ params }: LeadPageProps) {
  const { id } = await params;
  await requireServerCurrentUser(`/leads/${id}`);
  return <LeadDetailClient leadId={id} />;
}
