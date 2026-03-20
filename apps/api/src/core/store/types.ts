import type {
  BookingStatus,
  Channel,
  LeadSegment,
  LeadSource,
  LeadStatus,
  MessageDirection,
  MessageStatus,
  PromptSlug
} from '@alr/shared';
import type { QualificationResult } from '@alr/shared';

export type JsonObject = Record<string, unknown>;
export type JsonLike = unknown;

export interface LeadRecord {
  id: string;
  ownerUserId: string | null;
  externalId: string | null;
  source: LeadSource;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  company: string | null;
  jobTitle: string | null;
  message: string | null;
  intentHint: string | null;
  status: LeadStatus;
  segment: LeadSegment;
  score: number;
  intent: string | null;
  summary: string | null;
  tags: string[];
  metadata: JsonObject;
  ownerName: string | null;
  notes: string | null;
  qualifiedAt: Date | null;
  bookedAt: Date | null;
  convertedAt: Date | null;
  nextFollowUpAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface LeadActivityRecord {
  id: string;
  leadId: string;
  type: string;
  channel: Channel | null;
  title: string;
  body: string;
  metadata: JsonObject;
  createdAt: Date;
}

export interface PromptVersionRecord {
  id: string;
  slug: PromptSlug;
  version: number;
  title: string;
  content: string;
  active: boolean;
  metadata: JsonObject;
  checksum: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PromptExecutionRecord {
  id: string;
  leadId: string | null;
  promptVersionId: string | null;
  slug: PromptSlug;
  provider: string;
  model: string | null;
  input: JsonLike;
  output: JsonLike | null;
  tokensIn: number | null;
  tokensOut: number | null;
  success: boolean;
  error: string | null;
  createdAt: Date;
}

export interface MessageRecord {
  id: string;
  leadId: string;
  followUpRunId: string | null;
  channel: Channel;
  direction: MessageDirection;
  status: MessageStatus;
  subject: string | null;
  body: string;
  provider: string;
  externalId: string | null;
  attempt: number;
  scheduledFor: Date | null;
  sentAt: Date | null;
  error: string | null;
  metadata: JsonObject;
  createdAt: Date;
  updatedAt: Date;
}

export interface FollowUpRunRecord {
  id: string;
  leadId: string;
  sequenceSlug: string;
  sequenceVersion: number | null;
  status: string;
  currentStep: number;
  attemptCount: number;
  context: JsonObject;
  nextRunAt: Date | null;
  lastRunAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface BookingRecord {
  id: string;
  leadId: string;
  bookingToken: string;
  slotStart: Date;
  slotEnd: Date;
  timezone: string;
  meetingLink: string;
  provider: string;
  status: BookingStatus;
  notes: string | null;
  metadata: JsonObject;
  externalId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AnalyticsEventRecord {
  id: string;
  leadId: string | null;
  type: string;
  value: number;
  metadata: JsonObject;
  createdAt: Date;
}

export interface LearningMemoryRecord {
  id: string;
  key: string;
  value: JsonLike;
  score: number;
  source: string;
  createdAt: Date;
}

export interface DailyReportRecord {
  id: string;
  reportDate: Date;
  payload: JsonLike;
  createdAt: Date;
  updatedAt: Date;
}

export interface StoreLeadInput {
  ownerUserId?: string | null | undefined;
  externalId?: string | null | undefined;
  source: LeadSource;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
  company?: string | null;
  jobTitle?: string | null;
  message?: string | null;
  intentHint?: string | null;
  metadata?: JsonObject;
  tags?: string[];
}

export interface StoreLeadUpdateInput {
  ownerUserId?: string | null | undefined;
  externalId?: string | null | undefined;
  source?: LeadSource | undefined;
  firstName?: string | null | undefined;
  lastName?: string | null | undefined;
  email?: string | null | undefined;
  phone?: string | null | undefined;
  company?: string | null | undefined;
  jobTitle?: string | null | undefined;
  message?: string | null | undefined;
  intentHint?: string | null | undefined;
  status?: LeadStatus | undefined;
  segment?: LeadSegment | undefined;
  score?: number | undefined;
  intent?: string | null | undefined;
  summary?: string | null | undefined;
  tags?: string[] | undefined;
  metadata?: JsonObject | undefined;
  ownerName?: string | null | undefined;
  notes?: string | null | undefined;
  qualifiedAt?: Date | null | undefined;
  bookedAt?: Date | null | undefined;
  convertedAt?: Date | null | undefined;
  nextFollowUpAt?: Date | null | undefined;
}

export interface FollowUpRunInput {
  leadId: string;
  sequenceSlug: string;
  sequenceVersion?: number | null;
  status?: string;
  currentStep?: number;
  attemptCount?: number;
  context?: JsonObject;
  nextRunAt?: Date | null;
  lastRunAt?: Date | null;
}

export interface BookingInput {
  leadId: string;
  bookingToken: string;
  slotStart: Date;
  slotEnd: Date;
  timezone: string;
  meetingLink: string;
  provider: string;
  status: BookingStatus;
  notes?: string | null;
  metadata?: JsonObject;
  externalId?: string | null;
}

export interface PromptVersionInput {
  slug: PromptSlug;
  version: number;
  title: string;
  content: string;
  active: boolean;
  metadata?: JsonObject;
  checksum: string;
}

export interface PromptExecutionInput {
  leadId?: string | null;
  promptVersionId?: string | null;
  slug: PromptSlug;
  provider: string;
  model?: string | null;
  input: JsonLike;
  output?: JsonLike | null;
  tokensIn?: number | null;
  tokensOut?: number | null;
  success?: boolean;
  error?: string | null;
}

export interface MessageInput {
  leadId: string;
  followUpRunId?: string | null;
  channel: Channel;
  direction: MessageDirection;
  status: MessageStatus;
  subject?: string | null;
  body: string;
  provider: string;
  externalId?: string | null;
  attempt?: number;
  scheduledFor?: Date | null;
  sentAt?: Date | null;
  error?: string | null;
  metadata?: JsonObject;
}

export interface AnalyticsEventInput {
  leadId?: string | null;
  type: string;
  value?: number;
  metadata?: JsonObject;
}

export interface LearningMemoryInput {
  key: string;
  value: JsonLike;
  score?: number;
  source: string;
}

export interface DailyReportInput {
  reportDate: Date;
  payload: JsonLike;
}

export interface LeadListOptions {
  ownerUserId?: string | null | undefined;
  status?: LeadStatus | 'any' | undefined;
  segment?: LeadSegment | 'any' | undefined;
  source?: LeadSource | 'any' | undefined;
  search?: string | undefined;
  limit?: number | undefined;
}

export interface StoreQuery {
  leadId?: string;
}

export interface PromptSeedState {
  slug: PromptSlug;
  version: number;
  title: string;
  content: string;
  active: boolean;
  metadata: JsonObject;
  checksum: string;
}

export interface QualificationContext {
  lead: LeadRecord;
  prompt: PromptVersionRecord;
  result: QualificationResult;
}
