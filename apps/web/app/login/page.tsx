import type { Metadata } from 'next';

import { AuthScreen } from '../../components/auth/auth-screen';
import { redirectIfAuthenticated } from '../../lib/auth';
import { sanitizeNextPath } from '../../lib/paths';

export const metadata: Metadata = {
  title: 'Login | Autonomous Lead-to-Revenue Agent',
  description: 'Sign in with email or Google to access your autonomous lead-to-revenue workspace.'
};

interface LoginPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const next = sanitizeNextPath(typeof params.next === 'string' ? params.next : undefined);
  await redirectIfAuthenticated(next);

  const error = typeof params.error === 'string' ? params.error : null;
  return <AuthScreen mode="login" nextPath={next} initialError={error} />;
}
