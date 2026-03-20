import type { Metadata } from 'next';

import { AuthScreen } from '../../components/auth/auth-screen';
import { redirectIfAuthenticated } from '../../lib/auth';
import { sanitizeNextPath } from '../../lib/paths';

export const metadata: Metadata = {
  title: 'Sign Up | Autonomous Lead-to-Revenue Agent',
  description: 'Create an account to use the autonomous lead-to-revenue workspace.'
};

interface SignupPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function SignupPage({ searchParams }: SignupPageProps) {
  const params = await searchParams;
  const next = sanitizeNextPath(typeof params.next === 'string' ? params.next : undefined);
  await redirectIfAuthenticated(next);

  const error = typeof params.error === 'string' ? params.error : null;
  return <AuthScreen mode="signup" nextPath={next} initialError={error} />;
}
