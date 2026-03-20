'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';

import { logout } from '../lib/api';
import { ActionButton } from './ui';

const links = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/billing', label: 'Billing' },
  { href: '/workflow', label: 'Workflow' },
  { href: '/leads', label: 'Leads' },
  { href: '/integrations', label: 'Integrations' }
];

export function Nav() {
  const pathname = usePathname();
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  if (pathname === '/' || pathname.startsWith('/login') || pathname.startsWith('/signup') || pathname.startsWith('/forgot-password') || pathname.startsWith('/reset-password')) return null;

  async function handleLogout() {
    setIsLoggingOut(true);
    try {
      await logout();
    } finally {
      router.push('/login');
      router.refresh();
      setIsLoggingOut(false);
    }
  }

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-[linear-gradient(180deg,rgba(248,250,252,0.9),rgba(238,242,247,0.8))] backdrop-blur-2xl shadow-[0_10px_30px_rgba(47,58,72,0.06)] animate-rise-in">
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-6">
        <Link href="/" className="flex items-center gap-2 whitespace-nowrap text-base font-bold tracking-tight text-slate-900">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[linear-gradient(135deg,rgba(234,111,74,0.96),rgba(122,160,212,0.96))] text-xs font-black text-white shadow-[0_10px_24px_rgba(47,58,72,0.16)]">
            L
          </span>
          ALR Agent
        </Link>

        <div className="flex items-center gap-1 rounded-full border border-white/65 bg-white/60 p-1 backdrop-blur-xl stagger-fade">
          {links.map(({ href, label }) => {
            const active = pathname.startsWith(href);

            return (
              <Link
                key={href}
                href={href}
                className={
                  active
                    ? 'rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-900 shadow-[0_8px_20px_rgba(47,58,72,0.08)] ring-1 ring-slate-200/80'
                    : 'rounded-full px-4 py-2 text-sm font-medium text-slate-500 transition-colors hover:bg-white/85 hover:text-slate-900'
                }
              >
                {label}
              </Link>
            );
          })}
        </div>

        <div className="flex items-center gap-2 stagger-fade">
          <span className="h-2 w-2 rounded-full bg-[#ea6f4a] shadow-[0_0_0_6px_rgba(234,111,74,0.14)]" />
          <span className="text-xs font-medium text-slate-500">Live</span>
          <ActionButton variant="ghost" size="sm" loading={isLoggingOut} onClick={handleLogout} className="ml-2">
            Sign out
          </ActionButton>
        </div>
      </nav>
    </header>
  );
}
