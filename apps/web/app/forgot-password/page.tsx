import type { Metadata } from 'next';

import { AuthScreen } from '../../components/auth/auth-screen';
import { redirectIfAuthenticated } from '../../lib/auth';

export const metadata: Metadata = {
  title: 'Forgot Password | Autonomous Lead-to-Revenue Agent',
  description: 'Request a password reset link for your account.'
};

interface ForgotPasswordPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function ForgotPasswordPage({ searchParams }: ForgotPasswordPageProps) {
  const params = await searchParams;
  await redirectIfAuthenticated('/dashboard');

  const error = typeof params.error === 'string' ? params.error : null;
  return <AuthScreen mode="forgot" nextPath="/dashboard" initialError={error} />;
}
