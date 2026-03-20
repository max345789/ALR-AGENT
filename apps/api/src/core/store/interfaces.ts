import type {
  AnalyticsEventInput,
  AnalyticsEventRecord,
  BookingInput,
  BookingRecord,
  DailyReportInput,
  DailyReportRecord,
  FollowUpRunInput,
  FollowUpRunRecord,
  LeadActivityRecord,
  LeadListOptions,
  LeadRecord,
  LearningMemoryInput,
  LearningMemoryRecord,
  MessageInput,
  MessageRecord,
  PromptExecutionInput,
  PromptExecutionRecord,
  PromptSeedState,
  PromptVersionInput,
  PromptVersionRecord,
  StoreLeadInput,
  StoreLeadUpdateInput
} from './types.js';
import type { PromptSlug, QualificationResult } from '@alr/shared';

export interface LeadStore {
  create(input: StoreLeadInput): Promise<LeadRecord>;
  findById(id: string, ownerUserId?: string | null): Promise<LeadRecord | null>;
  findByEmail(email: string, ownerUserId?: string | null): Promise<LeadRecord | null>;
  list(options?: LeadListOptions): Promise<LeadRecord[]>;
  update(id: string, input: StoreLeadUpdateInput): Promise<LeadRecord>;
  addActivity(leadId: string, activity: Omit<LeadActivityRecord, 'id' | 'leadId' | 'createdAt'>): Promise<LeadActivityRecord>;
  listActivities(leadId: string): Promise<LeadActivityRecord[]>;
}

export interface PromptStore {
  seedDefaults(prompts: PromptSeedState[]): Promise<void>;
  listVersions(slug: PromptSlug): Promise<PromptVersionRecord[]>;
  getActive(slug: PromptSlug): Promise<PromptVersionRecord | null>;
  upsertVersion(input: PromptVersionInput): Promise<PromptVersionRecord>;
  activateVersion(slug: PromptSlug, version: number): Promise<PromptVersionRecord>;
}

export interface LlmStore {
  createExecution(input: PromptExecutionInput): Promise<PromptExecutionRecord>;
  listExecutions(leadId?: string): Promise<PromptExecutionRecord[]>;
}

export interface FollowUpStore {
  createRun(input: FollowUpRunInput): Promise<FollowUpRunRecord>;
  findRun(id: string): Promise<FollowUpRunRecord | null>;
  findRunByLead(leadId: string, sequenceSlug?: string): Promise<FollowUpRunRecord | null>;
  updateRun(id: string, input: Partial<FollowUpRunInput>): Promise<FollowUpRunRecord>;
  listRuns(leadId: string): Promise<FollowUpRunRecord[]>;
}

export interface MessageStore {
  createMessage(input: MessageInput): Promise<MessageRecord>;
  updateMessage(id: string, input: Partial<MessageInput>): Promise<MessageRecord>;
  listMessages(leadId: string): Promise<MessageRecord[]>;
}

export interface BookingStore {
  createBooking(input: BookingInput): Promise<BookingRecord>;
  updateBooking(id: string, input: Partial<BookingInput>): Promise<BookingRecord>;
  listBookings(leadId: string): Promise<BookingRecord[]>;
  findByToken(token: string): Promise<BookingRecord | null>;
}

export interface AnalyticsStore {
  createEvent(input: AnalyticsEventInput): Promise<AnalyticsEventRecord>;
  listEvents(leadId?: string): Promise<AnalyticsEventRecord[]>;
  upsertDailyReport(input: DailyReportInput): Promise<DailyReportRecord>;
  listDailyReports(): Promise<DailyReportRecord[]>;
}

export interface MemoryStore {
  create(input: LearningMemoryInput): Promise<LearningMemoryRecord>;
  list(key?: string): Promise<LearningMemoryRecord[]>;
}

export interface AgentStore {
  leads: LeadStore;
  prompts: PromptStore;
  llm: LlmStore;
  followUps: FollowUpStore;
  messages: MessageStore;
  bookings: BookingStore;
  analytics: AnalyticsStore;
  memory: MemoryStore;
}

export interface StoreMigrationState {
  promptsSeeded: boolean;
  qualificationPrompt?: PromptVersionRecord | null;
}
