import { createHash, timingSafeEqual } from 'node:crypto';
import type { FastifyReply, FastifyRequest } from 'fastify';

import { env } from '../config/env.js';

function splitKeys(value?: string): string[] {
  if (!value) {
    return [];
  }

  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

function hashSecret(value: string): Buffer {
  return createHash('sha256').update(value, 'utf8').digest();
}

function timingSafeEquals(expected: string, supplied: string): boolean {
  const expectedHash = hashSecret(expected);
  const suppliedHash = hashSecret(supplied);
  return expectedHash.length === suppliedHash.length && timingSafeEqual(expectedHash, suppliedHash);
}

export function getAdminApiKeys(): string[] {
  return [...new Set([...splitKeys(env.ADMIN_API_KEYS), ...splitKeys(env.ADMIN_API_KEY)])];
}

export function extractProvidedApiKey(request: FastifyRequest): string | undefined {
  const headerKey = request.headers['x-api-key'];
  const bearer = request.headers.authorization?.startsWith('Bearer ')
    ? request.headers.authorization.slice('Bearer '.length)
    : undefined;
  const provided = Array.isArray(headerKey) ? headerKey[0] : headerKey;
  return (provided ?? bearer)?.trim() || undefined;
}

export function createAdminGuard(expectedKeys: string[] = getAdminApiKeys()) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    if (expectedKeys.length === 0) {
      // In non-production, keep the developer ergonomics that the app already relied on.
      // Production deployments must explicitly configure at least one admin API key.
      if (env.NODE_ENV !== 'production') {
        return;
      }

      return reply.code(503).send({ error: 'Admin authentication is not configured' });
    }

    const supplied = extractProvidedApiKey(request);
    if (!supplied) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }

    const authorized = expectedKeys.some((expected) => timingSafeEquals(expected, supplied));
    if (!authorized) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }
  };
}
