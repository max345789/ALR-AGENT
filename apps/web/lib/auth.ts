import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import type { AuthStateResponse, CurrentUser } from './types';
import { sanitizeNextPath } from './paths';

function normalizeTarget(value: string): string {
  const trimmed = value.trim().replace(/\/$/, '');
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  return `https://${trimmed}`;
}

function apiTarget(): string {
  return normalizeTarget(process.env.API_PROXY_TARGET ?? 'http://localhost:4000');
}

async function readCookieHeader() {
  const cookieStore = await cookies();
  return cookieStore
    .getAll()
    .map(({ name, value }) => `${name}=${value}`)
    .join('; ');
}

export async function getServerCurrentUser(): Promise<CurrentUser | null> {
  try {
    const cookieHeader = await readCookieHeader();
    const init: RequestInit = {
      cache: 'no-store'
    };
    if (cookieHeader) {
      init.headers = { cookie: cookieHeader };
    }

    const response = await fetch(`${apiTarget()}/api/v1/auth/me`, init);

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as AuthStateResponse;
    return payload.user ?? null;
  } catch {
    return null;
  }
}

export async function requireServerCurrentUser(nextPath: string): Promise<CurrentUser> {
  const user = await getServerCurrentUser();
  if (!user) {
    redirect(`/login?next=${encodeURIComponent(sanitizeNextPath(nextPath))}`);
  }
  return user;
}

export async function redirectIfAuthenticated(nextPath: string): Promise<void> {
  const user = await getServerCurrentUser();
  if (user) {
    redirect(sanitizeNextPath(nextPath));
  }
}
