import { createHash, randomBytes } from 'node:crypto';

import { Prisma, PrismaClient, type User } from '@prisma/client';
import Stripe from 'stripe';
import type { BillingPlan, BillingStatus, WorkspaceBillingSummary } from '@alr/shared';

import { env } from '../../config/env.js';

const PLAN_LIMITS: Record<BillingPlan, number> = {
  trial: 250,
  starter: 2500,
  pro: 15000,
  enterprise: 100000
};

const PLAN_PRICE_IDS: Record<Exclude<BillingPlan, 'trial'>, string | undefined> = {
  starter: env.STRIPE_PRICE_STARTER,
  pro: env.STRIPE_PRICE_PRO,
  enterprise: env.STRIPE_PRICE_ENTERPRISE
};

const PRICE_TO_PLAN = new Map<string, Exclude<BillingPlan, 'trial'>>(
  (Object.entries(PLAN_PRICE_IDS) as Array<[Exclude<BillingPlan, 'trial'>, string | undefined]>).flatMap(
    ([plan, priceId]) => (priceId ? ([[priceId, plan]] as Array<[string, Exclude<BillingPlan, 'trial'>]>) : [])
  )
);

function normalizeBaseUrl(value: string): string {
  const trimmed = value.trim().replace(/\/$/, '');
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  return `https://${trimmed}`;
}

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48) || 'workspace';
}

function hashValue(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

function last4(value: string): string {
  return value.slice(-4);
}

function generateCaptureKey(prefix = env.CAPTURE_KEY_PREFIX): string {
  return `${prefix}_${randomBytes(24).toString('base64url')}`;
}

function isPaidPlan(plan: BillingPlan): plan is Exclude<BillingPlan, 'trial'> {
  return plan !== 'trial';
}

function planFromPriceId(priceId?: string | null): BillingPlan {
  if (!priceId) {
    return 'trial';
  }

  return PRICE_TO_PLAN.get(priceId) ?? 'trial';
}

function billingStatusForStripe(status?: string | null): BillingStatus {
  switch (status) {
    case 'active':
      return 'active';
    case 'trialing':
      return 'trialing';
    case 'past_due':
    case 'unpaid':
    case 'incomplete':
    case 'incomplete_expired':
      return 'past_due';
    case 'paused':
      return 'paused';
    case 'canceled':
    case 'cancelled':
      return 'canceled';
    default:
      return 'trialing';
  }
}

function defaultTrialEndsAt(): Date {
  return new Date(Date.now() + env.WORKSPACE_TRIAL_DAYS * 24 * 60 * 60 * 1000);
}

export interface BillingOverview extends WorkspaceBillingSummary {
  workspaceId: string;
  workspaceSlug: string;
  workspaceName: string;
  isBillingConfigured: boolean;
}

export interface BillingCheckoutResult {
  checkoutUrl: string;
  sessionId: string;
}

export interface BillingPortalResult {
  portalUrl: string;
}

export interface CaptureKeyResult {
  captureKey: string;
  overview: BillingOverview;
}

export class BillingUnavailableError extends Error {
  statusCode = 503;

  constructor(message = 'Billing is not configured') {
    super(message);
    this.name = 'BillingUnavailableError';
  }
}

export class BillingService {
  private readonly stripe: Stripe | null;

  constructor(private readonly prisma?: PrismaClient) {
    this.stripe = env.STRIPE_SECRET_KEY ? new Stripe(env.STRIPE_SECRET_KEY) : null;
  }

  private requireStripe(): Stripe {
    if (!this.stripe) {
      throw new BillingUnavailableError('Stripe is not configured');
    }
    return this.stripe;
  }

  private requirePrisma(): PrismaClient {
    if (!this.prisma) {
      throw new BillingUnavailableError('Database is not configured');
    }
    return this.prisma;
  }

  private workspaceSlugFor(user: User): string {
    return slugify(user.name ?? user.email.split('@')[0] ?? user.id);
  }

  private workspaceNameFor(user: User): string {
    return user.name?.trim() || user.email.split('@')[0] || 'Workspace';
  }

  private workspaceBillingFor(user: User): WorkspaceBillingSummary {
    return {
      plan: user.plan as BillingPlan,
      status: user.billingStatus as BillingStatus,
      trialEndsAt: user.trialEndsAt ? user.trialEndsAt.toISOString() : null,
      leadLimit: user.leadLimit,
      captureKeyConfigured: Boolean(user.captureKeyHash),
      captureKeyLast4: user.captureKeyLast4 ?? null
    };
  }

  async ensureProvisioned(userId: string, withCaptureKey = false): Promise<CaptureKeyResult | null> {
    const prisma = this.requirePrisma();
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new Error(`User ${userId} not found`);
    }

    const updates: Partial<User> = {};
    let captureKey: string | null = null;

    if (!user.trialEndsAt) {
      updates.trialEndsAt = defaultTrialEndsAt();
    }
    if (!user.plan) {
      updates.plan = 'trial';
    }
    if (!user.billingStatus) {
      updates.billingStatus = 'trialing';
    }
    if (!user.leadLimit) {
      updates.leadLimit = PLAN_LIMITS.trial;
    }
    if (withCaptureKey || !user.captureKeyHash) {
      captureKey = generateCaptureKey();
      updates.captureKeyHash = hashValue(captureKey);
      updates.captureKeyLast4 = last4(captureKey);
      updates.captureKeyIssuedAt = new Date();
    }

    if (Object.keys(updates).length > 0) {
      await prisma.user.update({
        where: { id: userId },
        data: updates as Prisma.UserUpdateInput
      });
    }

    if (!captureKey) {
      return null;
    }

    return {
      captureKey,
      overview: await this.getOverview(userId)
    };
  }

  async getOverview(userId: string): Promise<BillingOverview> {
    const prisma = this.requirePrisma();
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new Error(`User ${userId} not found`);
    }

    return {
      workspaceId: user.id,
      workspaceSlug: this.workspaceSlugFor(user),
      workspaceName: this.workspaceNameFor(user),
      ...this.workspaceBillingFor(user),
      isBillingConfigured: Boolean(this.stripe)
    };
  }

  async resolveUserByCaptureKey(captureKey: string): Promise<User | null> {
    const prisma = this.requirePrisma();
    const hash = hashValue(captureKey.trim());
    return prisma.user.findUnique({
      where: { captureKeyHash: hash }
    });
  }

  async isWorkspaceActive(userId: string): Promise<boolean> {
    const prisma = this.requirePrisma();
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return false;
    }

    if (user.billingStatus === 'active') {
      return true;
    }

    if (user.billingStatus === 'trialing') {
      return !user.trialEndsAt || user.trialEndsAt > new Date();
    }

    return false;
  }

  async assertWorkspaceAccess(userId: string): Promise<void> {
    const allowed = await this.isWorkspaceActive(userId);
    if (!allowed) {
      throw new BillingUnavailableError('Workspace access is paused until billing is active');
    }
  }

  async rotateCaptureKey(userId: string): Promise<CaptureKeyResult> {
    const prisma = this.requirePrisma();
    const captureKey = generateCaptureKey();
    await prisma.user.update({
      where: { id: userId },
      data: {
        captureKeyHash: hashValue(captureKey),
        captureKeyLast4: last4(captureKey),
        captureKeyIssuedAt: new Date()
      }
    });

    return {
      captureKey,
      overview: await this.getOverview(userId)
    };
  }

  async createCheckoutSession(userId: string, plan: Exclude<BillingPlan, 'trial'>): Promise<BillingCheckoutResult> {
    if (!isPaidPlan(plan)) {
      throw new BillingUnavailableError('Select a paid plan');
    }

    const prisma = this.requirePrisma();
    const priceId = PLAN_PRICE_IDS[plan];
    if (!priceId) {
      throw new BillingUnavailableError(`STRIPE_PRICE_${plan.toUpperCase()} is not configured`);
    }

    const stripe = this.requireStripe();
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new Error(`User ${userId} not found`);
    }

    let customerId = user.billingCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { userId },
        ...(user.name ? { name: user.name } : {})
      });
      customerId = customer.id;
      await prisma.user.update({
        where: { id: userId },
        data: { billingCustomerId: customerId }
      });
    }

    const checkout = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      client_reference_id: userId,
      line_items: [{ price: priceId, quantity: 1 }],
      allow_promotion_codes: true,
      success_url: `${normalizeBaseUrl(env.PUBLIC_APP_URL)}/billing?checkout=success`,
      cancel_url: `${normalizeBaseUrl(env.PUBLIC_APP_URL)}/billing?checkout=cancelled`,
      subscription_data: {
        metadata: {
          userId,
          plan
        }
      },
      metadata: {
        userId,
        plan
      }
    });

    if (!checkout.url) {
      throw new BillingUnavailableError('Stripe did not return a checkout URL');
    }

    return {
      checkoutUrl: checkout.url,
      sessionId: checkout.id
    };
  }

  async createPortalSession(userId: string): Promise<BillingPortalResult> {
    const stripe = this.requireStripe();
    const prisma = this.requirePrisma();
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new Error(`User ${userId} not found`);
    }

    if (!user.billingCustomerId) {
      throw new BillingUnavailableError('No billing customer is attached to this account yet');
    }

    const portal = await stripe.billingPortal.sessions.create({
      customer: user.billingCustomerId,
      return_url: env.STRIPE_PORTAL_RETURN_URL ?? `${normalizeBaseUrl(env.PUBLIC_APP_URL)}/billing`
    });

    return {
      portalUrl: portal.url
    };
  }

  async syncFromStripeEvent(event: Stripe.Event): Promise<void> {
    if (!this.stripe) {
      throw new BillingUnavailableError('Stripe is not configured');
    }
    const prisma = this.requirePrisma();

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = (session.client_reference_id ?? session.metadata?.userId) as string | undefined;
      if (!userId) {
        return;
      }

      const subscriptionId = typeof session.subscription === 'string' ? session.subscription : null;
      const customerId = typeof session.customer === 'string' ? session.customer : null;
      const subscription = subscriptionId ? await this.stripe.subscriptions.retrieve(subscriptionId) : null;
      await this.applySubscriptionState(prisma, userId, {
        customerId,
        subscriptionId,
        subscription,
        plan: subscription ? planFromPriceId(subscription.items.data[0]?.price?.id) : 'trial'
      });
      return;
    }

    if (event.type === 'customer.subscription.updated' || event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object as Stripe.Subscription;
      const userId = subscription.metadata.userId;
      if (!userId) {
        return;
      }

      await this.applySubscriptionState(prisma, userId, {
        customerId: typeof subscription.customer === 'string' ? subscription.customer : null,
        subscriptionId: subscription.id,
        subscription,
        plan: planFromPriceId(subscription.items.data[0]?.price?.id)
      });
    }
  }

  verifyStripeWebhookEvent(rawBody: string | Buffer, signature: string): Stripe.Event {
    const stripe = this.requireStripe();
    if (!env.STRIPE_WEBHOOK_SECRET) {
      throw new BillingUnavailableError('Stripe webhook secret is not configured');
    }

    return stripe.webhooks.constructEvent(rawBody, signature, env.STRIPE_WEBHOOK_SECRET);
  }

  private async applySubscriptionState(
    prisma: PrismaClient,
    userId: string,
    input: {
      customerId: string | null;
      subscriptionId: string | null;
      subscription: Stripe.Subscription | null;
      plan: BillingPlan;
    }
  ): Promise<void> {
    const subscriptionStatus = billingStatusForStripe(input.subscription?.status ?? null);
    const plan = input.plan;
    const leadLimit = PLAN_LIMITS[plan];
    const trialEndsAt = input.subscription?.trial_end ? new Date(input.subscription.trial_end * 1000) : null;

    const data: Prisma.UserUpdateInput = {
      plan,
      billingStatus: subscriptionStatus,
      leadLimit,
      billingCustomerId: input.customerId,
      billingSubscriptionId: input.subscriptionId,
      billingPriceId: input.subscription?.items.data[0]?.price?.id ?? null,
      trialEndsAt
    };

    await prisma.user.update({
      where: { id: userId },
      data
    });
  }

  async planForPriceId(priceId: string): Promise<Exclude<BillingPlan, 'trial'> | null> {
    return PRICE_TO_PLAN.get(priceId) ?? null;
  }
}
