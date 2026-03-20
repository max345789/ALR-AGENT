import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import {
  authForgotPasswordSchema,
  authLoginSchema,
  authResetPasswordSchema,
  authSignupSchema
} from '@alr/shared';

import { env } from '../config/env.js';
import type { AgentServices } from '../bootstrap/container.js';
import { createRateLimitGuard, extractFieldIdentity } from '../core/security/rate-limit.js';
import { validate } from '../utils/validation.js';
import { decodeStateCookie, GOOGLE_AUTH_STATE_COOKIE, type RequestMeta } from '../modules/auth/auth.service.js';

const authQuerySchema = z.object({
  redirectTo: z.string().trim().min(1).max(200).optional(),
  next: z.string().trim().min(1).max(200).optional(),
  error: z.string().trim().min(1).max(120).optional(),
  error_description: z.string().trim().min(1).max(500).optional(),
  error_uri: z.string().url().optional(),
  code: z.string().trim().min(1).max(2048).optional(),
  state: z.string().trim().min(1).max(200).optional(),
  scope: z.string().trim().min(1).max(500).optional(),
  authuser: z.string().trim().min(1).max(120).optional(),
  prompt: z.string().trim().min(1).max(120).optional(),
  hd: z.string().trim().min(1).max(255).optional()
}).strict();

const authMeRateLimit = createRateLimitGuard({
  scope: 'public.auth.me',
  ip: { limit: 120, windowMs: 60_000 },
  user: {
    limit: 180,
    windowMs: 60_000,
    extract: (request) => extractSessionToken(request)
  }
});

const authLoginRateLimit = createRateLimitGuard({
  scope: 'public.auth.login',
  ip: { limit: 12, windowMs: 60_000 },
  user: {
    limit: 6,
    windowMs: 60_000,
    extract: (request) => extractFieldIdentity([request.body], ['email'])
  }
});

const authSignupRateLimit = createRateLimitGuard({
  scope: 'public.auth.signup',
  ip: { limit: 6, windowMs: 15 * 60_000 },
  user: {
    limit: 3,
    windowMs: 15 * 60_000,
    extract: (request) => extractFieldIdentity([request.body], ['email'])
  }
});

const authForgotRateLimit = createRateLimitGuard({
  scope: 'public.auth.forgot',
  ip: { limit: 6, windowMs: 15 * 60_000 },
  user: {
    limit: 3,
    windowMs: 15 * 60_000,
    extract: (request) => extractFieldIdentity([request.body], ['email'])
  }
});

const authResetRateLimit = createRateLimitGuard({
  scope: 'public.auth.reset',
  ip: { limit: 10, windowMs: 15 * 60_000 }
});

const authGoogleRateLimit = createRateLimitGuard({
  scope: 'public.auth.google',
  ip: { limit: 20, windowMs: 60_000 },
  user: {
    limit: 10,
    windowMs: 60_000,
    extract: (request) => extractSessionToken(request)
  }
});

function parseCookieHeader(cookieHeader?: string): Record<string, string> {
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

function extractSessionToken(request: FastifyRequest): string | undefined {
  return parseCookieHeader(request.headers.cookie)[env.AUTH_COOKIE_NAME];
}

function extractGoogleStateCookie(request: FastifyRequest): string | undefined {
  return parseCookieHeader(request.headers.cookie)[GOOGLE_AUTH_STATE_COOKIE];
}

function readHeader(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
}

function buildRequestMeta(request: FastifyRequest): RequestMeta {
  const userAgent = readHeader(request.headers['user-agent']);
  const meta: RequestMeta = { ip: request.ip };
  if (userAgent) {
    meta.userAgent = userAgent;
  }
  return meta;
}

function setCookies(reply: FastifyReply, cookies: string[]) {
  reply.header('Set-Cookie', cookies);
}

function safeRedirect(value: string | undefined, fallback = '/dashboard'): string {
  const candidate = value ?? fallback;
  if (!candidate.startsWith('/') || candidate.startsWith('//')) {
    return fallback;
  }

  return candidate;
}

export async function registerAuthRoutes(app: FastifyInstance, services: AgentServices) {
  app.get('/auth/me', { preHandler: authMeRateLimit }, async (request) => {
    const sessionToken = extractSessionToken(request);
    const user = await services.authService.getCurrentUserFromSessionToken(sessionToken);
    return { user };
  });

  app.post('/auth/signup', { preHandler: authSignupRateLimit }, async (request, reply) => {
    const parsed = validate(authSignupSchema, request.body, reply);
    if (!parsed.ok) {
      return;
    }

    const result = await services.authService.signUp(parsed.data, buildRequestMeta(request));

    setCookies(reply, [services.authService.buildSessionCookie(result.sessionToken)]);
    reply.code(201);
    return {
      user: result.user,
      session: {
        expiresAt: result.sessionExpiresAt
      }
    };
  });

  app.post('/auth/login', { preHandler: authLoginRateLimit }, async (request, reply) => {
    const parsed = validate(authLoginSchema, request.body, reply);
    if (!parsed.ok) {
      return;
    }

    const result = await services.authService.login(parsed.data, buildRequestMeta(request));

    setCookies(reply, [services.authService.buildSessionCookie(result.sessionToken)]);
    return {
      user: result.user,
      session: {
        expiresAt: result.sessionExpiresAt
      }
    };
  });

  app.post('/auth/forgot-password', { preHandler: authForgotRateLimit }, async (request, reply) => {
    const parsed = validate(authForgotPasswordSchema, request.body, reply);
    if (!parsed.ok) {
      return;
    }

    await services.authService.requestPasswordReset(parsed.data, buildRequestMeta(request));

    return {
      ok: true,
      message: 'If the account exists, a reset link has been sent.'
    };
  });

  app.post('/auth/reset-password', { preHandler: authResetRateLimit }, async (request, reply) => {
    const parsed = validate(authResetPasswordSchema, request.body, reply);
    if (!parsed.ok) {
      return;
    }

    const result = await services.authService.resetPassword(parsed.data, buildRequestMeta(request));

    setCookies(reply, [services.authService.buildSessionCookie(result.sessionToken)]);
    return {
      user: result.user,
      session: {
        expiresAt: result.sessionExpiresAt
      }
    };
  });

  app.post('/auth/logout', { preHandler: authMeRateLimit }, async (request, reply) => {
    const sessionToken = extractSessionToken(request);
    await services.authService.logout(sessionToken);
    setCookies(reply, [services.authService.buildClearedSessionCookie()]);
    return { ok: true };
  });

  app.get('/auth/google/start', { preHandler: authGoogleRateLimit }, async (request, reply) => {
    const parsed = authQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      reply.code(400).send({ error: 'Validation failed', issues: parsed.error.flatten() });
      return;
    }

    const redirectTo = safeRedirect(parsed.data.redirectTo ?? parsed.data.next, '/dashboard');
    try {
      const { authorizationUrl, stateCookie } = await services.authService.startGoogleLogin(redirectTo);
      setCookies(reply, [stateCookie]);
      return reply.redirect(authorizationUrl);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Google login is unavailable';
      return reply.redirect(`/login?error=${encodeURIComponent(message)}`);
    }
  });

  app.get('/auth/google/callback', { preHandler: authGoogleRateLimit }, async (request, reply) => {
    const parsed = authQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      reply.code(400).send({ error: 'Validation failed', issues: parsed.error.flatten() });
      return;
    }

    if (parsed.data.error) {
      return reply.redirect(`/login?error=${encodeURIComponent('Google sign-in was cancelled or failed.')}`);
    }

    const state = decodeStateCookie(extractGoogleStateCookie(request));
    if (!state || !parsed.data.state || state.state !== parsed.data.state || new Date(state.expiresAt) < new Date()) {
      return reply.redirect(`/login?error=${encodeURIComponent('Google sign-in could not be verified. Please try again.')}`);
    }

    if (!parsed.data.code) {
      return reply.redirect(`/login?error=${encodeURIComponent('Google sign-in did not return an authorization code.')}`);
    }

    try {
      const result = await services.authService.completeGoogleLogin({
        code: parsed.data.code,
        state,
        ...buildRequestMeta(request)
      });

      setCookies(reply, [
        services.authService.buildSessionCookie(result.sessionToken),
        services.authService.buildClearedStateCookie()
      ]);

      return reply.redirect(safeRedirect(state.redirectTo, '/dashboard'));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Google sign-in failed';
      return reply.redirect(`/login?error=${encodeURIComponent(message)}`);
    }
  });
}
