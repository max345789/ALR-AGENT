import { z } from 'zod';
import {
  billingPlanEnum,
  billingStatusEnum,
  bookingStatusEnum,
  channelEnum,
  leadSegmentEnum,
  leadSourceEnum,
  leadStatusEnum,
  messageDirectionEnum,
  messageStatusEnum,
  promptSlugEnum
} from './domain.js';

const emailSchema = z.string().trim().email().max(254).transform((value) => value.toLowerCase());
const passwordSchema = z.string().trim().min(12).max(128);
const authNameSchema = z.string().trim().min(1).max(120);
const redirectPathSchema = z.string().trim().min(1).max(200);

export const leadCaptureSchema = z.object({
  source: leadSourceEnum.default('web'),
  firstName: z.string().trim().min(1).max(120).nullable().optional(),
  lastName: z.string().trim().min(1).max(120).nullable().optional(),
  email: z.string().email().nullable().optional(),
  phone: z.string().trim().min(5).max(40).nullable().optional(),
  company: z.string().trim().min(1).max(200).nullable().optional(),
  jobTitle: z.string().trim().min(1).max(200).nullable().optional(),
  message: z.string().trim().min(1).max(5000).nullable().optional(),
  intentHint: z.string().trim().min(1).max(500).nullable().optional(),
  metadata: z.record(z.unknown()).default({})
}).strict();

export type LeadCaptureInput = z.infer<typeof leadCaptureSchema>;

export const leadUpdateSchema = z.object({
  status: leadStatusEnum.optional(),
  segment: leadSegmentEnum.optional(),
  ownerName: z.string().trim().min(1).max(120).nullable().optional(),
  notes: z.string().trim().min(1).max(5000).nullable().optional(),
  score: z.number().int().min(0).max(100).nullable().optional(),
  tags: z.array(z.string().trim().min(1).max(80)).optional(),
  metadata: z.record(z.unknown()).optional()
}).strict();

export type LeadUpdateInput = z.infer<typeof leadUpdateSchema>;

export const qualificationResultSchema = z.object({
  score: z.number().int().min(0).max(100),
  segment: leadSegmentEnum,
  intent: z.string().trim().min(1).max(300),
  confidence: z.number().min(0).max(1),
  summary: z.string().trim().min(1).max(5000),
  painPoints: z.array(z.string().trim().min(1).max(200)).default([]),
  objections: z.array(z.string().trim().min(1).max(200)).default([]),
  tags: z.array(z.string().trim().min(1).max(80)).default([]),
  recommendedNextStep: z.string().trim().min(1).max(500),
  bookingRecommended: z.boolean(),
  followUpDelayHours: z.number().int().min(0).max(720)
});

export type QualificationResultInput = z.infer<typeof qualificationResultSchema>;

export const bookingRequestSchema = z.object({
  leadId: z.string().uuid(),
  requestedDate: z.string().datetime().optional(),
  timezone: z.string().trim().min(2).max(64).default('Asia/Kolkata'),
  durationMinutes: z.number().int().min(15).max(180).default(30),
  notes: z.string().trim().max(2000).optional()
}).strict();

export type BookingRequestInput = z.infer<typeof bookingRequestSchema>;

export const bookingSlotSchema = z.object({
  start: z.string().datetime(),
  end: z.string().datetime(),
  timezone: z.string().min(2)
});

export const analyticsSummarySchema = z.object({
  totalLeads: z.number().int().nonnegative(),
  qualifiedLeads: z.number().int().nonnegative(),
  hotLeads: z.number().int().nonnegative(),
  warmLeads: z.number().int().nonnegative(),
  coldLeads: z.number().int().nonnegative(),
  bookedLeads: z.number().int().nonnegative(),
  wonLeads: z.number().int().nonnegative(),
  lostLeads: z.number().int().nonnegative(),
  conversionRate: z.number().min(0).max(100),
  averageScore: z.number().min(0).max(100),
  openFollowUps: z.number().int().nonnegative()
});

export const promptVersionSchema = z.object({
  slug: promptSlugEnum,
  version: z.number().int().positive(),
  title: z.string().trim().min(1).max(200),
  content: z.string().trim().min(1),
  active: z.boolean(),
  metadata: z.record(z.unknown()).default({})
});

export const workspaceBillingSchema = z.object({
  plan: billingPlanEnum,
  status: billingStatusEnum,
  trialEndsAt: z.string().datetime().nullable(),
  leadLimit: z.number().int().nonnegative(),
  captureKeyConfigured: z.boolean(),
  captureKeyLast4: z.string().trim().min(4).max(4).nullable()
});

export const workspaceSetupSchema = workspaceBillingSchema.extend({
  captureKey: z.string().trim().min(16).max(128)
});

export const messageRecordSchema = z.object({
  leadId: z.string().uuid(),
  channel: channelEnum,
  direction: messageDirectionEnum,
  status: messageStatusEnum,
  subject: z.string().trim().max(500).nullable().optional(),
  body: z.string().trim().min(1),
  provider: z.string().trim().min(1).max(120),
  metadata: z.record(z.unknown()).default({})
});

export const bookingRecordSchema = z.object({
  leadId: z.string().uuid(),
  slotStart: z.string().datetime(),
  slotEnd: z.string().datetime(),
  timezone: z.string().min(2),
  meetingLink: z.string().url(),
  provider: z.string().trim().min(1).max(120),
  status: bookingStatusEnum,
  notes: z.string().trim().max(2000).nullable().optional(),
  metadata: z.record(z.unknown()).default({})
});

export const timelineEventSchema = z.object({
  leadId: z.string().uuid(),
  type: z.string().trim().min(1).max(120),
  title: z.string().trim().min(1).max(200),
  body: z.string().trim().min(1),
  metadata: z.record(z.unknown()).default({})
});

export const webhookPayloadSchema = leadCaptureSchema.extend({
  externalId: z.string().trim().min(1).max(200).optional(),
  source: leadSourceEnum.default('webhook')
}).strict();

export type WebhookPayloadInput = z.infer<typeof webhookPayloadSchema>;

export interface PromptExecutionRequest {
  slug: 'qualification' | 'followup' | 'optimization';
  input: Record<string, unknown>;
  modelHint?: string | null;
}

export const authSignupSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  name: authNameSchema.optional().nullable(),
  redirectTo: redirectPathSchema.optional()
}).strict();

export type AuthSignupInput = z.infer<typeof authSignupSchema>;

export const authLoginSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  redirectTo: redirectPathSchema.optional()
}).strict();

export type AuthLoginInput = z.infer<typeof authLoginSchema>;

export const authForgotPasswordSchema = z.object({
  email: emailSchema
}).strict();

export type AuthForgotPasswordInput = z.infer<typeof authForgotPasswordSchema>;

export const authResetPasswordSchema = z.object({
  token: z.string().trim().min(16).max(200),
  password: passwordSchema
}).strict();

export type AuthResetPasswordInput = z.infer<typeof authResetPasswordSchema>;

export const authGoogleStartSchema = z.object({
  redirectTo: redirectPathSchema.optional()
}).strict();

export type AuthGoogleStartInput = z.infer<typeof authGoogleStartSchema>;

export const authCurrentUserSchema = z.object({
  id: z.string().uuid(),
  email: emailSchema,
  name: authNameSchema.nullable(),
  avatarUrl: z.string().url().nullable(),
  providers: z.object({
    email: z.boolean(),
    google: z.boolean()
  }).strict(),
  workspace: z.object({
    id: z.string().uuid(),
    slug: z.string().trim().min(1).max(120),
    name: z.string().trim().min(1).max(120),
    billing: workspaceBillingSchema
  }).strict(),
  createdAt: z.string().datetime(),
  lastLoginAt: z.string().datetime().nullable()
}).strict();

export type AuthCurrentUser = z.infer<typeof authCurrentUserSchema>;
