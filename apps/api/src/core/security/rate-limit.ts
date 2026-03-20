import IORedis from 'ioredis';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { createHash } from 'node:crypto';

import { env, runtimeMode } from '../../config/env.js';

export interface RateLimitWindow {
  limit: number;
  windowMs: number;
}

export interface RateLimitUserWindow extends RateLimitWindow {
  extract: (request: FastifyRequest) => string | undefined;
}

export interface RateLimitPolicy {
  scope: string;
  ip: RateLimitWindow;
  user?: RateLimitUserWindow;
}

interface RateLimitDecision {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
  retryAfterMs: number;
  dimension: 'ip' | 'user';
}

interface RateLimitStore {
  consume(key: string, limit: number, windowMs: number): Promise<RateLimitDecision>;
  close(): Promise<void>;
}

interface RedisLikeClient {
  status: string;
  connect(): Promise<unknown>;
  incr(key: string): Promise<number>;
  pexpire(key: string, ttl: number): Promise<unknown>;
  pttl(key: string): Promise<number>;
  quit(): Promise<unknown>;
}

function hash(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

function normalizeIdentity(value: string): string {
  return value.trim().toLowerCase();
}

function readString(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function extractFieldIdentity(sources: Array<unknown>, fields: string[]): string | undefined {
  for (const source of sources) {
    if (!source || typeof source !== 'object') {
      continue;
    }

    const record = source as Record<string, unknown>;
    for (const field of fields) {
      const candidate = readString(record[field]);
      if (candidate) {
        return normalizeIdentity(candidate);
      }
    }
  }

  return undefined;
}

class MemoryRateLimitStore implements RateLimitStore {
  private readonly counters = new Map<string, { count: number; resetAt: number }>();

  async consume(key: string, limit: number, windowMs: number): Promise<RateLimitDecision> {
    const now = Date.now();
    const current = this.counters.get(key);

    if (!current || current.resetAt <= now) {
      const resetAt = now + windowMs;
      this.counters.set(key, { count: 1, resetAt });
      return {
        allowed: true,
        limit,
        remaining: Math.max(limit - 1, 0),
        resetAt,
        retryAfterMs: 0,
        dimension: key.includes(':user:') ? 'user' : 'ip'
      };
    }

    current.count += 1;
    const allowed = current.count <= limit;
    const remaining = allowed ? limit - current.count : 0;

    if (!allowed) {
      return {
        allowed: false,
        limit,
        remaining,
        resetAt: current.resetAt,
        retryAfterMs: Math.max(current.resetAt - now, 1),
        dimension: key.includes(':user:') ? 'user' : 'ip'
      };
    }

    return {
      allowed: true,
      limit,
      remaining,
      resetAt: current.resetAt,
      retryAfterMs: 0,
      dimension: key.includes(':user:') ? 'user' : 'ip'
    };
  }

  async close(): Promise<void> {
    this.counters.clear();
  }
}

class RedisRateLimitStore implements RateLimitStore {
  private readonly client: RedisLikeClient;
  private connection: Promise<void> | null = null;

  constructor(url: string) {
    const RedisCtor = IORedis as unknown as new (url: string, options: Record<string, unknown>) => RedisLikeClient;
    this.client = new RedisCtor(url, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      enableReadyCheck: true
    });
  }

  private async ensureConnected(): Promise<void> {
    if (this.client.status === 'ready') {
      return;
    }

    if (!this.connection) {
      this.connection = this.client.connect().then(() => undefined).catch((error: unknown) => {
        this.connection = null;
        throw error;
      });
    }

    await this.connection;
  }

  async consume(key: string, limit: number, windowMs: number): Promise<RateLimitDecision> {
    await this.ensureConnected();

    const count = await this.client.incr(key);
    if (count === 1) {
      await this.client.pexpire(key, windowMs);
    }

    const ttl = await this.client.pttl(key);
    const safeTtl = ttl > 0 ? ttl : windowMs;
    const allowed = count <= limit;
    const remaining = allowed ? Math.max(limit - count, 0) : 0;

    return {
      allowed,
      limit,
      remaining,
      resetAt: Date.now() + safeTtl,
      retryAfterMs: allowed ? 0 : Math.max(safeTtl, 1),
      dimension: key.includes(':user:') ? 'user' : 'ip'
    };
  }

  async close(): Promise<void> {
    if (this.client.status !== 'end') {
      await this.client.quit();
    }
  }
}

let rateLimitStorePromise: Promise<RateLimitStore> | null = null;
let rateLimitStore: RateLimitStore | null = null;

async function getRateLimitStore(): Promise<RateLimitStore> {
  if (rateLimitStore) {
    return rateLimitStore;
  }

  if (!rateLimitStorePromise) {
    rateLimitStorePromise = (async () => {
      if (runtimeMode.usesRedis && env.REDIS_URL) {
        return new RedisRateLimitStore(env.REDIS_URL);
      }

      return new MemoryRateLimitStore();
    })();
  }

  rateLimitStore = await rateLimitStorePromise;
  return rateLimitStore;
}

export async function closeRateLimitStore(): Promise<void> {
  if (rateLimitStore) {
    await rateLimitStore.close();
  }

  rateLimitStore = null;
  rateLimitStorePromise = null;
}

function buildKey(scope: string, dimension: 'ip' | 'user', value: string): string {
  return `alr:rate:${scope}:${dimension}:${hash(value)}`;
}

function replyWith429(reply: FastifyReply, decision: RateLimitDecision, scope: string) {
  const retryAfterSeconds = Math.max(1, Math.ceil(decision.retryAfterMs / 1000));
  reply
    .header('Retry-After', String(retryAfterSeconds))
    .header('X-RateLimit-Limit', String(decision.limit))
    .header('X-RateLimit-Remaining', String(decision.remaining))
    .header('X-RateLimit-Reset', new Date(decision.resetAt).toISOString());

  return reply.code(429).send({
    error: 'Too Many Requests',
    message: `Rate limit exceeded for ${scope}. Try again in ${retryAfterSeconds} seconds.`,
    retryAfterSeconds
  });
}

export function createRateLimitGuard(policy: RateLimitPolicy) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    if (request.method === 'OPTIONS') {
      return;
    }

    const store = await getRateLimitStore();
    const ipIdentity = request.ip || 'unknown-ip';
    const ipDecision = await store.consume(buildKey(policy.scope, 'ip', ipIdentity), policy.ip.limit, policy.ip.windowMs);

    if (!ipDecision.allowed) {
      return replyWith429(reply, ipDecision, policy.scope);
    }

    if (!policy.user) {
      return;
    }

    const userIdentity = policy.user.extract(request);
    if (!userIdentity) {
      return;
    }

    const userDecision = await store.consume(buildKey(policy.scope, 'user', userIdentity), policy.user.limit, policy.user.windowMs);
    if (!userDecision.allowed) {
      return replyWith429(reply, userDecision, policy.scope);
    }
  };
}
