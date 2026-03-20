import type { AnalyticsSummary, LeadCaptureInput, LeadUpdateInput, WorkspaceBillingSummary } from '@alr/shared';

export interface CurrentUser {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  providers: {
    email: boolean;
    google: boolean;
  };
  workspace: {
    id: string;
    slug: string;
    name: string;
    billing: WorkspaceBillingSummary;
  };
  createdAt: string;
  lastLoginAt: string | null;
}

export interface LeadCard {
  id: string;
  source: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  company: string | null;
  status: string;
  segment: string;
  score: number;
  createdAt: string;
}

export interface DashboardResponse {
  summary: AnalyticsSummary;
  byStatus: Record<string, number>;
  bySource: Record<string, number>;
  bySegment: Record<string, number>;
  recentLeads: LeadCard[];
}

export interface LeadTimelineResponse {
  lead: LeadCard & {
    phone: string | null;
    jobTitle: string | null;
    message: string | null;
    intent: string | null;
    intentHint: string | null;
    summary: string | null;
    tags: string[];
    metadata: Record<string, unknown>;
    ownerName: string | null;
    notes: string | null;
    qualifiedAt: string | null;
    bookedAt: string | null;
    convertedAt: string | null;
    nextFollowUpAt: string | null;
    updatedAt: string;
  };
  activities: Array<{
    id: string;
    type: string;
    channel: string | null;
    title: string;
    body: string;
    createdAt: string;
    metadata: Record<string, unknown>;
  }>;
  messages: Array<{
    id: string;
    channel: string;
    direction: string;
    status: string;
    subject: string | null;
    body: string;
    provider: string;
    sentAt: string | null;
    createdAt: string;
    error: string | null;
  }>;
  bookings: Array<{
    id: string;
    bookingToken: string;
    slotStart: string;
    slotEnd: string;
    timezone: string;
    meetingLink: string;
    provider: string;
    status: string;
    notes: string | null;
    createdAt: string;
  }>;
  followUpRuns: Array<{
    id: string;
    sequenceSlug: string;
    status: string;
    currentStep: number;
    attemptCount: number;
    nextRunAt: string | null;
    lastRunAt: string | null;
  }>;
}

export interface BookingResponse {
  booking: {
    id: string;
    bookingToken: string;
    slotStart: string;
    slotEnd: string;
    timezone: string;
    meetingLink: string;
    provider: string;
    status: string;
    notes: string | null;
    metadata: Record<string, unknown>;
    createdAt: string;
    updatedAt: string;
  };
}

export interface BookingOfferResponse {
  booking: BookingResponse['booking'];
  slots: Array<{ start: string; end: string; timezone: string }>;
}

export interface IntegrationConnector {
  name: string;
  description: string;
  endpoint: string;
  method: 'POST' | 'WEBHOOK' | 'WORKFLOW';
  status: 'ready' | 'recommended' | 'available';
  handoff: string;
}

export interface IntegrationSnippet {
  title: string;
  language: string;
  code: string;
}

export interface IntegrationOverviewResponse {
  appUrl: string;
  captureEndpoint: string;
  webhookEndpoint: string;
  captureKeyHeader: string;
  runtime: {
    database: string;
    redis: string;
    llmProvider: string;
    emailProvider: string;
    whatsappProvider: string;
    calendarProvider: string;
  };
  connectors: IntegrationConnector[];
  snippets: IntegrationSnippet[];
  checklist: string[];
  payloadExample: Record<string, unknown>;
}

export interface ApiLeadCreateResponse {
  lead: LeadCard & {
    source: string;
    phone: string | null;
    jobTitle: string | null;
    message: string | null;
    intentHint: string | null;
    summary: string | null;
    tags: string[];
    metadata: Record<string, unknown>;
    updatedAt: string;
  };
}

export interface LeadFormValues extends LeadCaptureInput {
  metadata: Record<string, unknown>;
}

export interface LeadPatchValues extends LeadUpdateInput {
  metadata?: Record<string, unknown>;
}

export interface AuthSessionResponse {
  user: CurrentUser;
  session: {
    expiresAt: string;
  };
  setup?: {
    captureKey?: string;
    billing: WorkspaceBillingSummary;
  };
}

export interface AuthStateResponse {
  user: CurrentUser | null;
}

export interface BillingOverviewResponse {
  billing: WorkspaceBillingSummary & {
    workspaceId: string;
    workspaceSlug: string;
    workspaceName: string;
    isBillingConfigured: boolean;
  };
}

export interface BillingCheckoutResponse {
  checkoutUrl: string;
  sessionId: string;
}

export interface BillingPortalResponse {
  portalUrl: string;
}

export interface BillingCaptureKeyResponse {
  captureKey: string;
  overview: BillingOverviewResponse['billing'];
}
