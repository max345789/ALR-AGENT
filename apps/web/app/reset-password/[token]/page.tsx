import type { Metadata } from 'next';

import { AuthScreen } from '../../../components/auth/auth-screen';
import { sanitizeNextPath } from '../../../lib/paths';

export const metadata: Metadata = {
  title: 'Reset Password | Autonomous Lead-to-Revenue Agent',
  description: 'Create a new password using your secure reset link.'
};

interface ResetPasswordPageProps {
  params: Promise<{ token: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function ResetPasswordPage({ params, searchParams }: ResetPasswordPageProps) {
  const { token } = await params;
  const query = await searchParams;
  const next = sanitizeNextPath(typeof query.next === 'string' ? query.next : undefined);
  const error = typeof query.error === 'string' ? query.error : null;

  return <AuthScreen mode="reset" token={token} nextPath={next} initialError={error} />;
}
