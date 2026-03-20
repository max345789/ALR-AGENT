'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { ArrowRight, CheckCircle2, ChevronLeft, ClipboardCopy, Lock, Mail, Sparkles, ShieldCheck } from 'lucide-react';

import { forgotPassword, login, resetPassword, signup } from '../../lib/api';
import { sanitizeNextPath } from '../../lib/paths';
import type { AuthSessionResponse } from '../../lib/types';
import { ActionButton, Badge, Card } from '../ui';

type AuthMode = 'login' | 'signup' | 'forgot' | 'reset';
type SubmitState = 'idle' | 'loading' | 'success' | 'error';

interface AuthScreenProps {
  mode: AuthMode;
  nextPath: string;
  token?: string;
  initialError?: string | null;
}

const COMMON_BENEFITS = [
  'Lead capture, qualification, and follow-up in one place',
  'Google login for quick workspace access',
  'Password reset links with single-use tokens',
  'Secure httpOnly sessions with server-side validation'
];

function Field({
  label,
  type,
  name,
  value,
  onChange,
  placeholder,
  autoComplete,
  required = true
}: {
  label: string;
  type: string;
  name: string;
  value: string;
  onChange: (name: string, value: string) => void;
  placeholder: string;
  autoComplete?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-slate-700">{label}</span>
      <input
        type={type}
        name={name}
        value={value}
        required={required}
        onChange={(event) => onChange(name, event.target.value)}
        autoComplete={autoComplete}
        placeholder={placeholder}
        className="w-full rounded-full border border-white/75 bg-white/80 px-4 py-3 text-sm text-slate-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] outline-none transition-all duration-300 placeholder:text-slate-400 focus:border-slate-300 focus:bg-white"
      />
    </label>
  );
}

export function AuthScreen({ mode, nextPath, token, initialError }: AuthScreenProps) {
  const router = useRouter();
  const redirectRef = useRef<number | null>(null);
  const [status, setStatus] = useState<SubmitState>('idle');
  const [message, setMessage] = useState<string | null>(initialError ?? null);
  const [signupSetup, setSignupSetup] = useState<AuthSessionResponse['setup'] | null>(null);
  const [values, setValues] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  const sanitizedNextPath = sanitizeNextPath(nextPath);
  const isLogin = mode === 'login';
  const isSignup = mode === 'signup';
  const isForgot = mode === 'forgot';
  const isReset = mode === 'reset';
  const isLoading = status === 'loading';
  const isSuccess = status === 'success';
  const captureKey = signupSetup?.captureKey ?? null;

  useEffect(() => {
    return () => {
      if (redirectRef.current) {
        window.clearTimeout(redirectRef.current);
      }
    };
  }, []);

  function setField(name: string, value: string) {
    setValues((current) => ({ ...current, [name]: value }));
  }

  function startGoogleLogin() {
    window.location.assign(`/api/v1/auth/google/start?redirectTo=${encodeURIComponent(sanitizedNextPath)}`);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setSignupSetup(null);

    const email = values.email.trim().toLowerCase();
    const password = values.password;
    const confirmPassword = values.confirmPassword;
    const name = values.name.trim();

    if (isLogin) {
      if (!email || !password) {
        setMessage('Enter your email and password to continue.');
        return;
      }
      if (password.length < 12) {
        setMessage('Password must be at least 12 characters.');
        return;
      }
    }

    if (isSignup) {
      if (!name) {
        setMessage('Add your name so the workspace can greet you correctly.');
        return;
      }
      if (!email || !password) {
        setMessage('Enter your name, email, and password to continue.');
        return;
      }
      if (password.length < 12) {
        setMessage('Password must be at least 12 characters.');
        return;
      }
      if (password !== confirmPassword) {
        setMessage('Passwords do not match.');
        return;
      }
    }

    if (isForgot) {
      if (!email) {
        setMessage('Enter the email address for your account.');
        return;
      }
    }

    if (isReset) {
      if (!token) {
        setMessage('Reset link is missing or invalid.');
        return;
      }
      if (!password) {
        setMessage('Create a new password and confirm it.');
        return;
      }
      if (password.length < 12) {
        setMessage('Password must be at least 12 characters.');
        return;
      }
      if (password !== confirmPassword) {
        setMessage('Create a new password and confirm it.');
        return;
      }
    }

    let signupSetupResult: AuthSessionResponse['setup'] | null = null;
    setStatus('loading');

    try {
      if (isLogin) {
        await login({ email, password, redirectTo: sanitizedNextPath });
      } else if (isSignup) {
        const result = await signup({
          name,
          email,
          password,
          redirectTo: sanitizedNextPath
        });
        signupSetupResult = result.setup ?? null;
        setSignupSetup(signupSetupResult);
      } else if (isForgot) {
        await forgotPassword({ email });
      } else if (isReset) {
        await resetPassword({ token: token ?? '', password });
      }

      if (isForgot) {
        setStatus('success');
        setMessage('If the account exists, a reset link has been sent to that inbox.');
        return;
      }

      setStatus('success');
      setMessage(
        mode === 'reset'
          ? 'Password updated. Redirecting to your workspace...'
          : isSignup && signupSetupResult?.captureKey
            ? 'Account created. Copy your capture key before you leave.'
            : 'Success. Redirecting...'
      );
      redirectRef.current = window.setTimeout(() => {
        router.push(sanitizedNextPath);
      }, signupSetupResult?.captureKey ? 10_000 : 850);
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'Authentication failed.');
    }
  }

  const headline =
    mode === 'login'
      ? 'Welcome back'
      : mode === 'signup'
        ? 'Create your workspace'
        : mode === 'forgot'
          ? 'Reset your password'
          : 'Choose a new password';

  const copy =
    mode === 'login'
      ? 'Sign in with email or Google to reach the dashboard, integrations, and CRM controls.'
      : mode === 'signup'
        ? 'Create an account with email or Google and start with the autonomous lead pipeline.'
        : mode === 'forgot'
          ? 'We will send a password reset link to your email inbox if an account exists.'
          : 'Set a new password and continue into the workspace without re-entering anything else.';

  return (
    <div className="min-h-screen overflow-x-hidden text-slate-900">
      <main className="mx-auto flex min-h-screen max-w-7xl items-center px-6 py-10 lg:px-8">
        <div className="grid w-full gap-6 lg:grid-cols-[0.95fr_1.05fr] lg:gap-8">
          <section className="relative overflow-hidden rounded-[32px] border border-slate-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.86),rgba(241,244,248,0.74))] p-8 shadow-[0_32px_90px_rgba(47,58,72,0.1)] backdrop-blur-[24px] lg:p-10">
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute -left-24 top-0 h-72 w-72 rounded-full bg-[radial-gradient(circle,rgba(122,160,212,0.26),rgba(122,160,212,0))] blur-[100px] animate-aurora-drift" />
              <div className="absolute right-[-5rem] top-8 h-72 w-72 rounded-full bg-[radial-gradient(circle,rgba(234,111,74,0.2),rgba(234,111,74,0))] blur-[120px] animate-aurora-drift" />
              <div className="absolute bottom-[-5rem] left-1/3 h-72 w-72 rounded-full bg-[radial-gradient(circle,rgba(180,190,204,0.24),rgba(180,190,204,0))] blur-[120px] animate-aurora-drift" />
            </div>

            <div className="relative">
              <Link href="/" className="inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/75 px-3 py-1.5 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-white">
                <ChevronLeft className="size-4" />
                Back to site
              </Link>

              <div className="mt-8 max-w-xl">
                <Badge tone="accent" className="mb-5">
                  Authentication
                </Badge>
                <h1 className="text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
                  {headline}
                </h1>
                <p className="mt-4 text-base leading-7 text-slate-600 sm:text-lg">{copy}</p>
              </div>

              <div className="mt-8 grid gap-3 sm:grid-cols-2">
                {[
                  { icon: Mail, label: 'Email login' },
                  { icon: ShieldCheck, label: 'Secure sessions' },
                  { icon: Sparkles, label: 'Google OAuth' },
                  { icon: Lock, label: 'Reset links' }
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.label} className="rounded-[20px] border border-slate-200/80 bg-white/85 px-4 py-4 backdrop-blur-xl">
                      <Icon className="size-5 text-slate-700" />
                      <p className="mt-3 text-sm font-medium text-slate-800">{item.label}</p>
                    </div>
                  );
                })}
              </div>

              <div className="mt-8 rounded-[24px] border border-slate-200/80 bg-white/85 p-5 backdrop-blur-xl">
                <p className="text-sm font-semibold text-slate-800">What this unlocks</p>
                <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
                  {COMMON_BENEFITS.map((benefit) => (
                    <li key={benefit} className="flex items-start gap-3">
                      <span className="mt-2 size-2 rounded-full bg-emerald-300" />
                      <span>{benefit}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>

          <section className="relative overflow-hidden rounded-[32px] border border-slate-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(241,244,248,0.84))] p-6 shadow-[0_32px_90px_rgba(47,58,72,0.12)] backdrop-blur-[26px] lg:p-8">
            {isSuccess ? (
              <Card className="flex min-h-[36rem] flex-col justify-center text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10">
                  <CheckCircle2 className="size-8 text-emerald-600" />
                </div>
                <h2 className="mt-6 text-3xl font-semibold tracking-tight text-slate-900">All set</h2>
                <p className="mt-3 text-base leading-7 text-slate-600">{message}</p>
                {captureKey && (
                  <div className="mt-8 rounded-[24px] border border-slate-200/80 bg-white/85 p-5 text-left shadow-[0_14px_40px_rgba(47,58,72,0.08)]">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">Your capture key</p>
                        <p className="text-xs text-slate-500">Shown once. Use it in the x-alr-capture-key header.</p>
                      </div>
                      <ActionButton
                        variant="secondary"
                        size="sm"
                        onClick={async () => {
                          await navigator.clipboard.writeText(captureKey);
                          setMessage('Capture key copied to clipboard.');
                        }}
                      >
                        <ClipboardCopy className="size-4" />
                        Copy
                      </ActionButton>
                    </div>
                    <pre className="mt-4 overflow-x-auto rounded-[18px] bg-slate-950 px-4 py-3 text-sm leading-6 text-slate-100">
                      <code>{captureKey}</code>
                    </pre>
                  </div>
                )}
                {isForgot && (
                  <div className="mt-8 flex flex-wrap justify-center gap-3">
                    <ActionButton variant="primary" onClick={() => router.push('/login')}>
                      Back to login
                    </ActionButton>
                    <ActionButton variant="secondary" onClick={startGoogleLogin}>
                      Continue with Google
                    </ActionButton>
                  </div>
                )}
              </Card>
            ) : (
              <Card className="min-h-[36rem]">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <Badge tone="neutral">Email and Google</Badge>
                    <h2 className="mt-4 text-3xl font-semibold tracking-tight text-slate-900">
                      {isLogin ? 'Sign in' : isSignup ? 'Create account' : isForgot ? 'Send reset link' : 'Reset password'}
                    </h2>
                    <p className="mt-3 text-sm leading-6 text-slate-600">
                      {isLogin
                        ? 'Use your email and password or continue with Google.'
                        : isSignup
                          ? 'Create your account with email or Google. Passwords are stored securely.'
                          : isForgot
                            ? 'We will send a one-time reset link to the address you enter.'
                            : 'Set a new password for the token in your reset link.'}
                    </p>
                  </div>
                </div>

                <form onSubmit={handleSubmit} className="mt-8 space-y-4">
                  {isSignup && (
                    <Field
                      label="Full name"
                      type="text"
                      name="name"
                      value={values.name}
                      onChange={setField}
                      placeholder="Ava Patel"
                      autoComplete="name"
                    />
                  )}

                  {(isLogin || isSignup || isForgot) && (
                    <Field
                      label="Email"
                      type="email"
                      name="email"
                      value={values.email}
                      onChange={setField}
                      placeholder="you@company.com"
                      autoComplete="email"
                    />
                  )}

                  {(isLogin || isSignup || isReset) && (
                    <Field
                      label="Password"
                      type="password"
                      name="password"
                      value={values.password}
                      onChange={setField}
                      placeholder="••••••••••••"
                      autoComplete={isLogin ? 'current-password' : 'new-password'}
                    />
                  )}

                  {(isSignup || isReset) && (
                    <Field
                      label="Confirm password"
                      type="password"
                      name="confirmPassword"
                      value={values.confirmPassword}
                      onChange={setField}
                      placeholder="Repeat password"
                      autoComplete="new-password"
                    />
                  )}

                  {message && (
                    <div className="rounded-2xl border border-white/75 bg-white/75 px-4 py-3 text-sm leading-6 text-slate-700">
                      {message}
                    </div>
                  )}

                  <ActionButton type="submit" className="w-full justify-center" loading={isLoading} success={isSuccess}>
                    {isLogin
                      ? 'Sign in'
                      : isSignup
                        ? 'Create account'
                        : isForgot
                          ? 'Send reset link'
                          : 'Update password'}
                    <ArrowRight className="size-4" />
                  </ActionButton>

                  {(isLogin || isSignup) && (
                    <>
                      <div className="flex items-center gap-3 text-xs uppercase tracking-[0.2em] text-slate-400">
                        <span className="h-px flex-1 bg-slate-200" />
                        <span>or</span>
                        <span className="h-px flex-1 bg-slate-200" />
                      </div>

                      <ActionButton
                        variant="secondary"
                        type="button"
                        className="w-full justify-center"
                        disabled={isLoading}
                        onClick={startGoogleLogin}
                      >
                        Continue with Google
                      </ActionButton>
                    </>
                  )}
                </form>

                <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-white/70 pt-5 text-sm text-slate-600">
                  {isLogin && (
                    <>
                      <Link href="/forgot-password" className="font-medium text-slate-800 hover:text-slate-900">
                        Forgot password?
                      </Link>
                      <Link href="/signup" className="font-medium text-slate-800 hover:text-slate-900">
                        Create an account
                      </Link>
                    </>
                  )}
                  {isSignup && (
                    <>
                      <Link href="/login" className="font-medium text-slate-800 hover:text-slate-900">
                        Already have an account?
                      </Link>
                      <Link href="/forgot-password" className="font-medium text-slate-800 hover:text-slate-900">
                        Trouble signing in?
                      </Link>
                    </>
                  )}
                  {isForgot && (
                    <>
                      <Link href="/login" className="font-medium text-slate-800 hover:text-slate-900">
                        Back to login
                      </Link>
                      <Link href="/signup" className="font-medium text-slate-800 hover:text-slate-900">
                        Create account
                      </Link>
                    </>
                  )}
                  {isReset && (
                    <>
                      <Link href="/forgot-password" className="font-medium text-slate-800 hover:text-slate-900">
                        Request another link
                      </Link>
                      <Link href="/login" className="font-medium text-slate-800 hover:text-slate-900">
                        Back to login
                      </Link>
                    </>
                  )}
                </div>
              </Card>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
