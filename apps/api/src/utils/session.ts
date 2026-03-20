import type { FastifyRequest } from 'fastify';

import { env } from '../config/env.js';
import { parseCookieHeader, readHeader } from './request.js';

export function extractSessionToken(request: FastifyRequest): string | undefined {
  return parseCookieHeader(readHeader(request.headers.cookie))[env.AUTH_COOKIE_NAME];
}
