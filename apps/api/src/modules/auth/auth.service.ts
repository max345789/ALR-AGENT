import { PrismaClient, type User } from '@prisma/client';
import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

import type {
  AuthCurrentUser,
  AuthForgotPasswordInput,
  AuthLoginInput,
  AuthResetPasswordInput,
  AuthSignupInput,
  WorkspaceBillingSummary
} from '@alr/shared';

import { env } from '../../config/env.js';
import { sendEmail } from '../messaging/email.adapter.js';
import { logger } from '../../utils/logger.js';
import type { BillingService } from '../billing/billing.service.js';

const scrypt = promisify(scryptCallback);
const SESSION_TOKEN_BYTES = 32;
const OAUTH_STATE_TOKEN_BYTES = 24;
const RESET_TOKEN_BYTES = 32;

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_USERINFO_URL = 'https://openidconnect.googleapis.com/v1/userinfo';

export const GOOGLE_AUTH_STATE_COOKIE = 'alr_google_auth_state';

export interface RequestMeta {
  ip?: string;
  userAgent?: string;
}

export interface AuthSessionResult {
  user: AuthCurrentUser;
  sessionToken: string;
  sessionExpiresAt: string;
  setup?: {
    captureKey?: string;
    billing: WorkspaceBillingSummary;
  };
}

export interface GoogleOAuthState {
  state: string;
  redirectTo: string;
  expiresAt: string;
}

export class AuthUnavailableError extends Error {
  statusCode = 503;

  constructor(message = 'Authentication is not configured') {
    super(message);
    this.name = 'AuthUnavailableError';
  }
}

function normalizeBaseUrl(value: string): string {
  const trimmed = value.trim().replace(/\/$/, '');
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  return `https://${trimmed}`;
}

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

function hashToken(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

function createRandomToken(byteLength: number): string {
  return randomBytes(byteLength).toString('base64url');
}

function encodeStateCookie(state: GoogleOAuthState): string {
  return Buffer.from(JSON.stringify(state), 'utf8').toString('base64url');
}

export function decodeStateCookie(value: string | undefined): GoogleOAuthState | null {
  if (!value) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(value, 'base64url').toString('utf8')) as GoogleOAuthState;
    if (!payload || typeof payload.state !== 'string' || typeof payload.redirectTo !== 'string' || typeof payload.expiresAt !== 'string') {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

function sanitizeRedirectPath(value: string | undefined, fallback = '/dashboard'): string {
  const candidate = value ?? fallback;
  if (!candidate.startsWith('/') || candidate.startsWith('//')) {
    return fallback;
  }

  return candidate;
}

function serializeCookie(
  name: string,
  value: string,
  options: {
    maxAgeSeconds?: number;
    path?: string;
    secure?: boolean;
    httpOnly?: boolean;
    sameSite?: 'lax' | 'strict' | 'none';
  } = {}
): string {
  const segments = [`${name}=${encodeURIComponent(value)}`];
  segments.push(`Path=${options.path ?? '/'}`);
  segments.push(`SameSite=${options.sameSite ?? 'lax'}`);
  if (options.maxAgeSeconds !== undefined) {
    segments.push(`Max-Age=${Math.max(0, Math.floor(options.maxAgeSeconds))}`);
    segments.push(`Expires=${new Date(Date.now() + Math.max(0, Math.floor(options.maxAgeSeconds)) * 1000).toUTCString()}`);
  }
  if (options.httpOnly ?? true) {
    segments.push('HttpOnly');
  }
  if (options.secure) {
    segments.push('Secure');
  }
  return segments.join('; ');
}

function toIso(value: Date | null | undefined): string | null {
  return value ? value.toISOString() : null;
}

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('base64url');
  const derived = (await scrypt(password, salt, 64)) as Buffer;
  return `scrypt$${salt}$${derived.toString('base64url')}`;
}

async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [algorithm, salt, encodedHash] = stored.split('$');
  if (algorithm !== 'scrypt' || !salt || !encodedHash) {
    return false;
  }

  const derived = (await scrypt(password, salt, 64)) as Buffer;
  const actual = Buffer.from(encodedHash, 'base64url');
  return actual.length === derived.length && timingSafeEqual(actual, derived);
}

function workspaceName(user: User): string {
  return user.name?.trim() || user.email.split('@')[0] || 'Workspace';
}

function workspaceSlug(user: User): string {
  return workspaceName(user)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48) || 'workspace';
}

function workspaceBilling(user: User): WorkspaceBillingSummary {
  return {
    plan: user.plan as WorkspaceBillingSummary['plan'],
    status: user.billingStatus as WorkspaceBillingSummary['status'],
    trialEndsAt: user.trialEndsAt ? user.trialEndsAt.toISOString() : null,
    leadLimit: user.leadLimit,
    captureKeyConfigured: Boolean(user.captureKeyHash),
    captureKeyLast4: user.captureKeyLast4 ?? null
  };
}

function mapUser(user: User): AuthCurrentUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name ?? null,
    avatarUrl: user.avatarUrl ?? null,
    providers: {
      email: Boolean(user.passwordHash),
      google: Boolean(user.googleSub)
    },
    workspace: {
      id: user.id,
      slug: workspaceSlug(user),
      name: workspaceName(user),
      billing: workspaceBilling(user)
    },
    createdAt: user.createdAt.toISOString(),
    lastLoginAt: toIso(user.lastLoginAt)
  };
}

function authCookieOptions() {
  return {
    path: '/',
    secure: env.AUTH_COOKIE_SECURE,
    httpOnly: true,
    sameSite: 'lax' as const
  };
}

function authStateCookieOptions() {
  return {
    ...authCookieOptions(),
    maxAgeSeconds: env.AUTH_OAUTH_STATE_TTL_MINUTES * 60
  };
}

function sessionCookieOptions() {
  return {
    ...authCookieOptions(),
    maxAgeSeconds: env.AUTH_SESSION_TTL_DAYS * 24 * 60 * 60
  };
}

function resetTokenExpiresAt(): Date {
  return new Date(Date.now() + env.AUTH_PASSWORD_RESET_TTL_MINUTES * 60 * 1000);
}

function sessionExpiresAt(): Date {
  return new Date(Date.now() + env.AUTH_SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);
}

async function sendPasswordResetEmail(email: string, resetPath: string) {
  const resetUrl = new URL(resetPath, normalizeBaseUrl(env.PUBLIC_APP_URL)).toString();

  try {
    await sendEmail({
      to: email,
      subject: 'Reset your LeadFlow AI password',
      body: [
        'We received a request to reset your password.',
        '',
        `Use this link to continue: ${resetUrl}`,
        '',
        'If you did not request this, you can safely ignore this email.'
      ].join('\n')
    });
  } catch (error) {
    // Avoid account enumeration by keeping the response generic even if the mail
    // provider is temporarily unavailable. The incident is still logged server-side.
    logger.error({ err: error, email }, 'Failed to send password reset email');
  }
}

export class AuthService {
  constructor(
    private readonly prisma?: PrismaClient,
    private readonly billingService?: BillingService
  ) {}

  isAvailable(): boolean {
    return Boolean(this.prisma);
  }

  buildSessionCookie(token: string): string {
    return serializeCookie(env.AUTH_COOKIE_NAME, token, sessionCookieOptions());
  }

  buildClearedSessionCookie(): string {
    return serializeCookie(env.AUTH_COOKIE_NAME, '', {
      ...authCookieOptions(),
      maxAgeSeconds: 0
    });
  }

  buildStateCookie(state: GoogleOAuthState): string {
    return serializeCookie(GOOGLE_AUTH_STATE_COOKIE, encodeStateCookie(state), authStateCookieOptions());
  }

  buildClearedStateCookie(): string {
    return serializeCookie(GOOGLE_AUTH_STATE_COOKIE, '', {
      ...authCookieOptions(),
      maxAgeSeconds: 0
    });
  }

  buildGoogleAuthorizationUrl(redirectTo: string): { authorizationUrl: string; state: GoogleOAuthState } {
    if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
      throw new AuthUnavailableError('Google login is not configured');
    }

    const callback = env.GOOGLE_REDIRECT_URI ?? new URL('/api/v1/auth/google/callback', normalizeBaseUrl(env.PUBLIC_APP_URL)).toString();
    const state: GoogleOAuthState = {
      state: createRandomToken(OAUTH_STATE_TOKEN_BYTES),
      redirectTo: sanitizeRedirectPath(redirectTo, '/dashboard'),
      expiresAt: new Date(Date.now() + env.AUTH_OAUTH_STATE_TTL_MINUTES * 60 * 1000).toISOString()
    };

    const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    url.searchParams.set('client_id', env.GOOGLE_CLIENT_ID);
    url.searchParams.set('redirect_uri', callback);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('scope', 'openid email profile');
    url.searchParams.set('access_type', 'offline');
    url.searchParams.set('prompt', 'select_account');
    url.searchParams.set('state', state.state);
    return { authorizationUrl: url.toString(), state };
  }

  async getCurrentUserFromSessionToken(sessionToken?: string): Promise<AuthCurrentUser | null> {
    const prisma = this.prisma;
    if (!prisma || !sessionToken) {
      return null;
    }

    const tokenHash = hashToken(sessionToken);
    const row = await prisma.userSession.findUnique({
      where: { tokenHash },
      include: { user: true }
    });

    if (!row || row.revokedAt || row.expiresAt <= new Date()) {
      if (row && !row.revokedAt && row.expiresAt <= new Date()) {
        await prisma.userSession.update({
          where: { id: row.id },
          data: { revokedAt: new Date() }
        });
      }
      return null;
    }

    return mapUser(row.user);
  }

  async signUp(input: AuthSignupInput, meta: RequestMeta): Promise<AuthSessionResult> {
    const prisma = this.prismaClient;
    const email = normalizeEmail(input.email);
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw this.conflictError('An account already exists for this email address.');
    }

    const passwordHash = await hashPassword(input.password);
    const user = await prisma.user.create({
      data: {
        email,
        name: input.name?.trim() ?? null,
        passwordHash,
        emailVerifiedAt: new Date(),
        lastLoginAt: new Date()
      }
    });

    const setup = await this.billingService?.ensureProvisioned(user.id, true);
    const sessionUser = await prisma.user.findUnique({ where: { id: user.id } });
    const session = {
      ...(await this.issueSession(sessionUser ?? user, 'email', meta)),
    };
    if (setup) {
      return {
        ...session,
        setup: { captureKey: setup.captureKey, billing: setup.overview }
      };
    }

    return session;
  }

  async login(input: AuthLoginInput, meta: RequestMeta): Promise<AuthSessionResult> {
    const prisma = this.prismaClient;
    const email = normalizeEmail(input.email);
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user?.passwordHash) {
      throw this.unauthorizedError('Invalid email or password.');
    }

    const matches = await verifyPassword(input.password, user.passwordHash);
    if (!matches) {
      throw this.unauthorizedError('Invalid email or password.');
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() }
    });

    await this.billingService?.ensureProvisioned(user.id, false);
    const freshUser = await prisma.user.findUnique({ where: { id: user.id } });
    return this.issueSession(freshUser ?? { ...user, lastLoginAt: new Date() }, 'email', meta);
  }

  async requestPasswordReset(input: AuthForgotPasswordInput, meta: RequestMeta): Promise<void> {
    const prisma = this.prismaClient;
    const email = normalizeEmail(input.email);
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      return;
    }

    const token = createRandomToken(RESET_TOKEN_BYTES);
    const tokenHash = hashToken(token);
    const expiresAt = resetTokenExpiresAt();

    await prisma.passwordResetToken.deleteMany({
      where: {
        userId: user.id,
        usedAt: null
      }
    });

    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
        requestIp: meta.ip ?? null,
        userAgent: meta.userAgent ?? null
      }
    });

    const resetPath = `/reset-password/${token}`;
    await sendPasswordResetEmail(user.email, resetPath);
  }

  async resetPassword(input: AuthResetPasswordInput, meta: RequestMeta): Promise<AuthSessionResult> {
    const prisma = this.prismaClient;
    const tokenHash = hashToken(input.token.trim());
    const tokenRow = await prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      include: { user: true }
    });

    if (!tokenRow || tokenRow.usedAt || tokenRow.expiresAt <= new Date()) {
      throw this.unauthorizedError('Reset link is invalid or expired.');
    }

    const passwordHash = await hashPassword(input.password);
    const updatedUser = await prisma.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: { id: tokenRow.userId },
        data: {
          passwordHash,
          emailVerifiedAt: tokenRow.user.emailVerifiedAt ?? new Date(),
          lastLoginAt: new Date()
        }
      });

      await tx.passwordResetToken.update({
        where: { id: tokenRow.id },
        data: { usedAt: new Date() }
      });

      await tx.userSession.updateMany({
        where: {
          userId: tokenRow.userId,
          revokedAt: null
        },
        data: { revokedAt: new Date() }
      });

      return user;
    });

    await this.billingService?.ensureProvisioned(updatedUser.id, false);
    const freshUser = await prisma.user.findUnique({ where: { id: updatedUser.id } });
    return this.issueSession(freshUser ?? updatedUser, 'email', meta);
  }

  async startGoogleLogin(redirectTo: string): Promise<{ authorizationUrl: string; stateCookie: string }> {
    const { authorizationUrl, state } = this.buildGoogleAuthorizationUrl(redirectTo);
    return {
      authorizationUrl,
      stateCookie: this.buildStateCookie(state)
    };
  }

  async completeGoogleLogin(input: {
    code: string;
    state: GoogleOAuthState;
    ip?: string;
    userAgent?: string;
  }): Promise<AuthSessionResult> {
    const prisma = this.prismaClient;

    if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
      throw new AuthUnavailableError('Google login is not configured');
    }

    if (new Date(input.state.expiresAt) < new Date()) {
      throw this.unauthorizedError('Google login expired. Please try again.');
    }

    const callback = env.GOOGLE_REDIRECT_URI ?? new URL('/api/v1/auth/google/callback', normalizeBaseUrl(env.PUBLIC_APP_URL)).toString();
    const tokenResponse = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        code: input.code,
        client_id: env.GOOGLE_CLIENT_ID,
        client_secret: env.GOOGLE_CLIENT_SECRET,
        redirect_uri: callback,
        grant_type: 'authorization_code'
      })
    });

    if (!tokenResponse.ok) {
      throw this.unauthorizedError('Google login failed.');
    }

    const tokenPayload = (await tokenResponse.json()) as { access_token?: string };
    if (!tokenPayload.access_token) {
      throw this.unauthorizedError('Google login failed.');
    }

    const profileResponse = await fetch(GOOGLE_USERINFO_URL, {
      headers: {
        authorization: `Bearer ${tokenPayload.access_token}`
      }
    });

    if (!profileResponse.ok) {
      throw this.unauthorizedError('Google login failed.');
    }

    const profile = (await profileResponse.json()) as {
      sub?: string;
      email?: string;
      email_verified?: boolean;
      name?: string;
      picture?: string;
    };

    if (!profile.sub || !profile.email || profile.email_verified === false) {
      throw this.unauthorizedError('Google account email could not be verified.');
    }

    const email = normalizeEmail(profile.email);
    const existingByGoogle = await prisma.user.findUnique({
      where: { googleSub: profile.sub }
    });
    const existingByEmail = existingByGoogle
      ? null
      : await prisma.user.findUnique({
          where: { email }
        });

    const now = new Date();
    let user: User;

    if (existingByGoogle) {
      user = await prisma.user.update({
        where: { id: existingByGoogle.id },
        data: {
          name: existingByGoogle.name ?? profile.name ?? null,
          avatarUrl: existingByGoogle.avatarUrl ?? profile.picture ?? null,
          emailVerifiedAt: existingByGoogle.emailVerifiedAt ?? now,
          lastLoginAt: now
        }
      });
    } else if (existingByEmail) {
      user = await prisma.user.update({
        where: { id: existingByEmail.id },
        data: {
          googleSub: profile.sub,
          name: existingByEmail.name ?? profile.name ?? null,
          avatarUrl: existingByEmail.avatarUrl ?? profile.picture ?? null,
          emailVerifiedAt: existingByEmail.emailVerifiedAt ?? now,
          lastLoginAt: now
        }
      });
    } else {
      user = await prisma.user.create({
        data: {
          email,
          googleSub: profile.sub,
          name: profile.name ?? null,
          avatarUrl: profile.picture ?? null,
          emailVerifiedAt: now,
          lastLoginAt: now
        }
      });
    }

    const requestMeta: RequestMeta = {};
    if (input.ip) {
      requestMeta.ip = input.ip;
    }
    if (input.userAgent) {
      requestMeta.userAgent = input.userAgent;
    }

    await this.billingService?.ensureProvisioned(user.id, false);
    const freshUser = await prisma.user.findUnique({ where: { id: user.id } });
    return this.issueSession(freshUser ?? user, 'google', requestMeta);
  }

  async logout(sessionToken?: string): Promise<void> {
    const prisma = this.prisma;
    if (!prisma || !sessionToken) {
      return;
    }

    await prisma.userSession.updateMany({
      where: {
        tokenHash: hashToken(sessionToken),
        revokedAt: null
      },
      data: { revokedAt: new Date() }
    });
  }

  private get prismaClient(): PrismaClient {
    if (!this.prisma) {
      throw new AuthUnavailableError('Authentication is not configured');
    }
    return this.prisma;
  }

  private conflictError(message: string): Error & { statusCode: number } {
    const error = new Error(message) as Error & { statusCode: number };
    error.statusCode = 409;
    return error;
  }

  private unauthorizedError(message: string): Error & { statusCode: number } {
    const error = new Error(message) as Error & { statusCode: number };
    error.statusCode = 401;
    return error;
  }

  private async issueSession(user: User, authProvider: 'email' | 'google', meta: RequestMeta): Promise<AuthSessionResult> {
    const prisma = this.prismaClient;

    const sessionToken = createRandomToken(SESSION_TOKEN_BYTES);
    const expiresAt = sessionExpiresAt();
    await prisma.userSession.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(sessionToken),
        expiresAt,
        ipAddress: meta.ip ?? null,
        userAgent: meta.userAgent ?? null,
        authProvider
      }
    });

    return {
      user: mapUser(user),
      sessionToken,
      sessionExpiresAt: expiresAt.toISOString()
    };
  }
}

export function buildAuthCookieHeader(name: string, value: string, maxAgeSeconds: number): string {
  return serializeCookie(name, value, {
    path: '/',
    secure: env.AUTH_COOKIE_SECURE,
    httpOnly: true,
    sameSite: 'lax',
    maxAgeSeconds
  });
}
