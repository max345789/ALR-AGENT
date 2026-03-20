import { NextResponse } from 'next/server';

function splitKeys(value?: string): string[] {
  if (!value) {
    return [];
  }

  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

function resolveAdminKey(): string | undefined {
  return [...new Set([...splitKeys(process.env.ADMIN_API_KEYS), ...splitKeys(process.env.ADMIN_API_KEY)])][0];
}

function resolveApiTarget(): string {
  const trimmed = (process.env.API_PROXY_TARGET ?? 'http://localhost:4000').trim().replace(/\/$/, '');
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  return `https://${trimmed}`;
}

function normalizePath(path: string): string {
  return path.startsWith('/') ? path : `/${path}`;
}

/**
 * Keep admin credentials and upstream API details out of the browser bundle.
 * This helper is only used by Next route handlers.
 */
export async function proxyAdminJson(path: string, method: 'POST' | 'PATCH' | 'PUT' | 'DELETE', body: unknown) {
  const adminKey = resolveAdminKey();
  if (!adminKey && process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Admin authentication is not configured' }, { status: 503 });
  }

  try {
    const response = await fetch(`${resolveApiTarget()}${normalizePath(path)}`, {
      method,
      headers: {
        'content-type': 'application/json',
        ...(adminKey ? { 'x-api-key': adminKey } : {})
      },
      body: JSON.stringify(body),
      cache: 'no-store'
    });

    const text = await response.text();
    const headers = new Headers();
    const contentType = response.headers.get('content-type');
    if (contentType) {
      headers.set('content-type', contentType);
    }
    headers.set('cache-control', 'no-store');

    return new NextResponse(text || null, {
      status: response.status,
      headers
    });
  } catch (error) {
    console.error('Failed to proxy admin request', error);
    return NextResponse.json({ error: 'Upstream API unavailable' }, { status: 502 });
  }
}
