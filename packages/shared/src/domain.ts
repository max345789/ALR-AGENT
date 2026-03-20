import { z } from 'zod';

export const leadSourceEnum = z.enum(['web', 'api', 'webhook', 'import', 'manual', 'integration']);
export type LeadSource = z.infer<typeof leadSourceEnum>;

export const leadStatusEnum = z.enum([
  'new',
  'qualifying',
  'qualified',
  'nurturing',
  'booked',
  'won',
  'lost',
  'disqualified'
]);
export type LeadStatus = z.infer<typeof leadStatusEnum>;

export const leadSegmentEnum = z.enum(['hot', 'warm', 'cold']);
export type LeadSegment = z.infer<typeof leadSegmentEnum>;

export const channelEnum = z.enum(['email', 'whatsapp', 'sms', 'note']);
export type Channel = z.infer<typeof channelEnum>;

export const messageDirectionEnum = z.enum(['inbound', 'outbound']);
export type MessageDirection = z.infer<typeof messageDirectionEnum>;

export const messageStatusEnum = z.enum(['queued', 'scheduled', 'sent', 'failed', 'skipped']);
export type MessageStatus = z.infer<typeof messageStatusEnum>;

export const bookingStatusEnum = z.enum(['pending', 'confirmed', 'cancelled', 'rescheduled']);
export type BookingStatus = z.infer<typeof bookingStatusEnum>;

export const promptSlugEnum = z.enum(['qualification', 'followup', 'optimization']);
export type PromptSlug = z.infer<typeof promptSlugEnum>;

export const billingPlanEnum = z.enum(['trial', 'starter', 'pro', 'enterprise']);
export type BillingPlan = z.infer<typeof billingPlanEnum>;

export const billingStatusEnum = z.enum(['trialing', 'active', 'past_due', 'paused', 'canceled']);
export type BillingStatus = z.infer<typeof billingStatusEnum>;

export interface QualificationResult {
  score: number;
  segment: LeadSegment;
  intent: string;
  confidence: number;
  summary: string;
  painPoints: string[];
  objections: string[];
  tags: string[];
  recommendedNextStep: string;
  bookingRecommended: boolean;
  followUpDelayHours: number;
}

export interface LeadFilter {
  status?: LeadStatus | 'any';
  segment?: LeadSegment | 'any';
  source?: LeadSource | 'any';
  search?: string;
  limit?: number;
}

export interface BookingSlot {
  start: string;
  end: string;
  timezone: string;
}

export interface AnalyticsSummary {
  totalLeads: number;
  qualifiedLeads: number;
  hotLeads: number;
  warmLeads: number;
  coldLeads: number;
  bookedLeads: number;
  wonLeads: number;
  lostLeads: number;
  conversionRate: number;
  averageScore: number;
  openFollowUps: number;
}

export interface FollowUpStepDefinition {
  id: string;
  delayHours: number;
  channel: Channel;
  subject: string;
  body: string;
  retryAttempts: number;
  fallbackChannel?: Channel;
}

export interface FollowUpSequenceDefinition {
  slug: string;
  name: string;
  description: string;
  active: boolean;
  steps: FollowUpStepDefinition[];
}

export interface PromptSeed {
  slug: PromptSlug;
  version: number;
  title: string;
  active: boolean;
  content: string;
  metadata?: Record<string, unknown>;
}

export interface WorkspaceBillingSummary {
  plan: BillingPlan;
  status: BillingStatus;
  trialEndsAt: string | null;
  leadLimit: number;
  captureKeyConfigured: boolean;
  captureKeyLast4: string | null;
}
