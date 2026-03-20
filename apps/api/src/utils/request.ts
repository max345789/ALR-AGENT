import type { FastifyRequest } from 'fastify';

export function parseCookieHeader(cookieHeader?: string): Record<string, string> {
  if (!cookieHeader) {
    return {};
  }

  return cookieHeader.split(';').reduce<Record<string, string>>((accumulator, part) => {
    const [rawName, ...rawValue] = part.split('=');
    if (!rawName || rawValue.length === 0) {
      return accumulator;
    }

    const name = rawName.trim();
    const value = rawValue.join('=').trim();
    if (name.length > 0) {
      accumulator[name] = decodeURIComponent(value);
    }
    return accumulator;
  }, {});
}

export function readHeader(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
}

export function extractHeaderValue(request: FastifyRequest, name: string): string | undefined {
  const raw = request.headers[name.toLowerCase() as keyof FastifyRequest['headers']];
  return readHeader(raw as string | string[] | undefined)?.trim() || undefined;
}
