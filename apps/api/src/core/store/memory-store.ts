import { randomUUID } from 'node:crypto';

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
import type { AgentStore, AnalyticsStore, BookingStore, FollowUpStore, LeadStore, LlmStore, MemoryStore, MessageStore, PromptStore } from './interfaces.js';
import type { PromptSlug } from '@alr/shared';

function clone<T>(value: T): T {
  return structuredClone(value);
}

function now(): Date {
  return new Date();
}

function matchesLead(record: LeadRecord, options?: LeadListOptions): boolean {
  if (!options) {
    return true;
  }

  if (options.ownerUserId !== undefined) {
    if (options.ownerUserId === null) {
      if (record.ownerUserId !== null) {
        return false;
      }
    } else if (record.ownerUserId !== options.ownerUserId) {
      return false;
    }
  }

  if (options.status && options.status !== 'any' && record.status !== options.status) {
    return false;
  }

  if (options.segment && options.segment !== 'any' && record.segment !== options.segment) {
    return false;
  }

  if (options.source && options.source !== 'any' && record.source !== options.source) {
    return false;
  }

  if (options.search) {
    const query = options.search.toLowerCase();
    const haystack = [
      record.firstName,
      record.lastName,
      record.email,
      record.phone,
      record.company,
      record.jobTitle,
      record.message,
      record.intent,
      record.summary,
      ...record.tags
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    if (!haystack.includes(query)) {
      return false;
    }
  }

  return true;
}

function isDueFollowUp(record: LeadRecord, before: Date, ownerUserId?: string | null): boolean {
  if (!record.nextFollowUpAt) {
    return false;
  }
  if (record.nextFollowUpAt > before) {
    return false;
  }
  if (['booked', 'won', 'lost', 'disqualified'].includes(record.status)) {
    return false;
  }
  if (ownerUserId !== undefined) {
    return ownerUserId === null ? record.ownerUserId === null : record.ownerUserId === ownerUserId;
  }
  return true;
}

class InMemoryLeadStore implements LeadStore {
  constructor(private readonly state: MemoryState) {}

  async create(input: StoreLeadInput): Promise<LeadRecord> {
    const record: LeadRecord = {
      id: randomUUID(),
      ownerUserId: input.ownerUserId ?? null,
      externalId: input.externalId ?? null,
      source: input.source,
      firstName: input.firstName ?? null,
      lastName: input.lastName ?? null,
      email: input.email ?? null,
      phone: input.phone ?? null,
      company: input.company ?? null,
      jobTitle: input.jobTitle ?? null,
      message: input.message ?? null,
      intentHint: input.intentHint ?? null,
      status: 'new',
      segment: 'cold',
      score: 0,
      intent: null,
      summary: null,
      tags: [...(input.tags ?? [])],
      metadata: clone(input.metadata ?? {}),
      ownerName: null,
      notes: null,
      qualifiedAt: null,
      bookedAt: null,
      convertedAt: null,
      nextFollowUpAt: null,
      createdAt: now(),
      updatedAt: now()
    };

    this.state.leads.push(record);
    return clone(record);
  }

  async findById(id: string, ownerUserId?: string | null): Promise<LeadRecord | null> {
    return clone(
      this.state.leads.find((lead) => {
        if (lead.id !== id) {
          return false;
        }
        if (ownerUserId === undefined) {
          return true;
        }
        return ownerUserId === null ? lead.ownerUserId === null : lead.ownerUserId === ownerUserId;
      }) ?? null
    );
  }

  async findByEmail(email: string, ownerUserId?: string | null): Promise<LeadRecord | null> {
    const normalized = email.trim().toLowerCase();
    return clone(
      this.state.leads.find((lead) => {
        if ((lead.email ?? '').trim().toLowerCase() !== normalized) {
          return false;
        }
        if (ownerUserId === undefined) {
          return true;
        }
        return ownerUserId === null ? lead.ownerUserId === null : lead.ownerUserId === ownerUserId;
      }) ?? null
    );
  }

  async list(options?: LeadListOptions): Promise<LeadRecord[]> {
    const limit = options?.limit ?? 100;
    return clone(this.state.leads.filter((lead) => matchesLead(lead, options)).slice(0, limit));
  }

  async findDueFollowUps(before: Date, ownerUserId?: string | null, limit = 100): Promise<LeadRecord[]> {
    return clone(
      this.state.leads.filter((lead) => isDueFollowUp(lead, before, ownerUserId)).slice(0, limit)
    );
  }

  async update(id: string, input: StoreLeadUpdateInput): Promise<LeadRecord> {
    const record = this.state.leads.find((lead) => lead.id === id);
    if (!record) {
      throw new Error(`Lead ${id} not found`);
    }

    Object.assign(record, {
      ...input,
      ownerUserId: input.ownerUserId ?? record.ownerUserId,
      metadata: input.metadata ? clone(input.metadata) : record.metadata,
      tags: input.tags ? [...input.tags] : record.tags,
      updatedAt: now()
    });

    return clone(record);
  }

  async addActivity(leadId: string, activity: Omit<LeadActivityRecord, 'id' | 'leadId' | 'createdAt'>): Promise<LeadActivityRecord> {
    const record: LeadActivityRecord = {
      id: randomUUID(),
      leadId,
      type: activity.type,
      channel: activity.channel ?? null,
      title: activity.title,
      body: activity.body,
      metadata: clone(activity.metadata ?? {}),
      createdAt: now()
    };
    this.state.activities.push(record);
    return clone(record);
  }

  async listActivities(leadId: string): Promise<LeadActivityRecord[]> {
    return clone(this.state.activities.filter((activity) => activity.leadId === leadId));
  }
}

class InMemoryPromptStore implements PromptStore {
  constructor(private readonly state: MemoryState) {}

  async seedDefaults(prompts: PromptSeedState[]): Promise<void> {
    for (const prompt of prompts) {
      await this.upsertVersion({
        slug: prompt.slug,
        version: prompt.version,
        title: prompt.title,
        content: prompt.content,
        active: prompt.active,
        metadata: prompt.metadata,
        checksum: prompt.checksum
      });
      if (prompt.active) {
        await this.activateVersion(prompt.slug, prompt.version);
      }
    }
  }

  async listVersions(slug: PromptSlug): Promise<PromptVersionRecord[]> {
    return clone(this.state.prompts.filter((prompt) => prompt.slug === slug).sort((a, b) => a.version - b.version));
  }

  async getActive(slug: PromptSlug): Promise<PromptVersionRecord | null> {
    return clone(this.state.prompts.find((prompt) => prompt.slug === slug && prompt.active) ?? null);
  }

  async upsertVersion(input: PromptVersionInput): Promise<PromptVersionRecord> {
    const existing = this.state.prompts.find((prompt) => prompt.slug === input.slug && prompt.version === input.version);
    if (existing) {
      Object.assign(existing, {
        title: input.title,
        content: input.content,
        active: input.active,
        metadata: clone(input.metadata ?? {}),
        checksum: input.checksum,
        updatedAt: now()
      });
      if (input.active) {
        await this.activateVersion(input.slug, input.version);
      }
      return clone(existing);
    }

    const record: PromptVersionRecord = {
      id: randomUUID(),
      slug: input.slug,
      version: input.version,
      title: input.title,
      content: input.content,
      active: input.active,
      metadata: clone(input.metadata ?? {}),
      checksum: input.checksum,
      createdAt: now(),
      updatedAt: now()
    };
    this.state.prompts.push(record);
    if (input.active) {
      await this.activateVersion(input.slug, input.version);
    }
    return clone(record);
  }

  async activateVersion(slug: PromptSlug, version: number): Promise<PromptVersionRecord> {
    let activeRecord: PromptVersionRecord | null = null;
    for (const prompt of this.state.prompts) {
      if (prompt.slug === slug) {
        prompt.active = prompt.version === version;
        prompt.updatedAt = now();
        if (prompt.active) {
          activeRecord = prompt;
        }
      }
    }

    if (!activeRecord) {
      throw new Error(`Prompt ${slug} v${version} not found`);
    }

    return clone(activeRecord);
  }
}

class InMemoryLlmStore implements LlmStore {
  constructor(private readonly state: MemoryState) {}

  async createExecution(input: PromptExecutionInput): Promise<PromptExecutionRecord> {
    const record: PromptExecutionRecord = {
      id: randomUUID(),
      leadId: input.leadId ?? null,
      promptVersionId: input.promptVersionId ?? null,
      slug: input.slug,
      provider: input.provider,
      model: input.model ?? null,
      input: clone(input.input),
      output: input.output === undefined ? null : clone(input.output),
      tokensIn: input.tokensIn ?? null,
      tokensOut: input.tokensOut ?? null,
      success: input.success ?? true,
      error: input.error ?? null,
      createdAt: now()
    };
    this.state.executions.push(record);
    return clone(record);
  }

  async listExecutions(leadId?: string): Promise<PromptExecutionRecord[]> {
    return clone(leadId ? this.state.executions.filter((execution) => execution.leadId === leadId) : this.state.executions);
  }
}

class InMemoryFollowUpStore implements FollowUpStore {
  constructor(private readonly state: MemoryState) {}

  async createRun(input: FollowUpRunInput): Promise<FollowUpRunRecord> {
    const record: FollowUpRunRecord = {
      id: randomUUID(),
      leadId: input.leadId,
      sequenceSlug: input.sequenceSlug,
      sequenceVersion: input.sequenceVersion ?? null,
      status: input.status ?? 'active',
      currentStep: input.currentStep ?? 0,
      attemptCount: input.attemptCount ?? 0,
      context: clone(input.context ?? {}),
      nextRunAt: input.nextRunAt ?? null,
      lastRunAt: input.lastRunAt ?? null,
      createdAt: now(),
      updatedAt: now()
    };
    this.state.followUpRuns.push(record);
    return clone(record);
  }

  async findRun(id: string): Promise<FollowUpRunRecord | null> {
    return clone(this.state.followUpRuns.find((run) => run.id === id) ?? null);
  }

  async findRunByLead(leadId: string, sequenceSlug?: string): Promise<FollowUpRunRecord | null> {
    return clone(
      this.state.followUpRuns.find((run) => run.leadId === leadId && (sequenceSlug ? run.sequenceSlug === sequenceSlug : true)) ?? null
    );
  }

  async updateRun(id: string, input: Partial<FollowUpRunInput>): Promise<FollowUpRunRecord> {
    const record = this.state.followUpRuns.find((run) => run.id === id);
    if (!record) {
      throw new Error(`Follow-up run ${id} not found`);
    }

    Object.assign(record, {
      ...input,
      context: input.context ? clone(input.context) : record.context,
      updatedAt: now()
    });
    return clone(record);
  }

  async listRuns(leadId: string): Promise<FollowUpRunRecord[]> {
    return clone(this.state.followUpRuns.filter((run) => run.leadId === leadId));
  }
}

class InMemoryMessageStore implements MessageStore {
  constructor(private readonly state: MemoryState) {}

  async createMessage(input: MessageInput): Promise<MessageRecord> {
    const record: MessageRecord = {
      id: randomUUID(),
      leadId: input.leadId,
      followUpRunId: input.followUpRunId ?? null,
      channel: input.channel,
      direction: input.direction,
      status: input.status,
      subject: input.subject ?? null,
      body: input.body,
      provider: input.provider,
      externalId: input.externalId ?? null,
      attempt: input.attempt ?? 0,
      scheduledFor: input.scheduledFor ?? null,
      sentAt: input.sentAt ?? null,
      error: input.error ?? null,
      metadata: clone(input.metadata ?? {}),
      createdAt: now(),
      updatedAt: now()
    };
    this.state.messages.push(record);
    return clone(record);
  }

  async updateMessage(id: string, input: Partial<MessageInput>): Promise<MessageRecord> {
    const record = this.state.messages.find((message) => message.id === id);
    if (!record) {
      throw new Error(`Message ${id} not found`);
    }
    Object.assign(record, {
      ...input,
      metadata: input.metadata ? clone(input.metadata) : record.metadata,
      updatedAt: now()
    });
    return clone(record);
  }

  async listMessages(leadId: string): Promise<MessageRecord[]> {
    return clone(this.state.messages.filter((message) => message.leadId === leadId));
  }
}

class InMemoryBookingStore implements BookingStore {
  constructor(private readonly state: MemoryState) {}

  async createBooking(input: BookingInput): Promise<BookingRecord> {
    const record: BookingRecord = {
      id: randomUUID(),
      leadId: input.leadId,
      bookingToken: input.bookingToken,
      slotStart: input.slotStart,
      slotEnd: input.slotEnd,
      timezone: input.timezone,
      meetingLink: input.meetingLink,
      provider: input.provider,
      status: input.status,
      notes: input.notes ?? null,
      metadata: clone(input.metadata ?? {}),
      externalId: input.externalId ?? null,
      createdAt: now(),
      updatedAt: now()
    };
    this.state.bookings.push(record);
    return clone(record);
  }

  async updateBooking(id: string, input: Partial<BookingInput>): Promise<BookingRecord> {
    const record = this.state.bookings.find((booking) => booking.id === id);
    if (!record) {
      throw new Error(`Booking ${id} not found`);
    }
    Object.assign(record, {
      ...input,
      metadata: input.metadata ? clone(input.metadata) : record.metadata,
      updatedAt: now()
    });
    return clone(record);
  }

  async listBookings(leadId: string): Promise<BookingRecord[]> {
    return clone(this.state.bookings.filter((booking) => booking.leadId === leadId));
  }

  async findByToken(token: string): Promise<BookingRecord | null> {
    return clone(this.state.bookings.find((booking) => booking.bookingToken === token) ?? null);
  }
}

class InMemoryAnalyticsStore implements AnalyticsStore {
  constructor(private readonly state: MemoryState) {}

  async createEvent(input: AnalyticsEventInput): Promise<AnalyticsEventRecord> {
    const record: AnalyticsEventRecord = {
      id: randomUUID(),
      leadId: input.leadId ?? null,
      type: input.type,
      value: input.value ?? 0,
      metadata: clone(input.metadata ?? {}),
      createdAt: now()
    };
    this.state.analyticsEvents.push(record);
    return clone(record);
  }

  async listEvents(leadId?: string): Promise<AnalyticsEventRecord[]> {
    return clone(
      leadId ? this.state.analyticsEvents.filter((event) => event.leadId === leadId) : this.state.analyticsEvents
    );
  }

  async upsertDailyReport(input: DailyReportInput): Promise<DailyReportRecord> {
    const key = input.reportDate.toISOString();
    const existing = this.state.dailyReports.find((report) => report.reportDate.toISOString() === key);
    if (existing) {
      existing.payload = clone(input.payload);
      existing.updatedAt = now();
      return clone(existing);
    }

    const record: DailyReportRecord = {
      id: randomUUID(),
      reportDate: input.reportDate,
      payload: clone(input.payload),
      createdAt: now(),
      updatedAt: now()
    };
    this.state.dailyReports.push(record);
    return clone(record);
  }

  async listDailyReports(): Promise<DailyReportRecord[]> {
    return clone(this.state.dailyReports);
  }
}

class InMemoryMemoryStore implements MemoryStore {
  constructor(private readonly state: MemoryState) {}

  async create(input: LearningMemoryInput): Promise<LearningMemoryRecord> {
    const record: LearningMemoryRecord = {
      id: randomUUID(),
      key: input.key,
      value: clone(input.value),
      score: input.score ?? 0,
      source: input.source,
      createdAt: now()
    };
    this.state.learningMemory.push(record);
    return clone(record);
  }

  async list(key?: string): Promise<LearningMemoryRecord[]> {
    return clone(key ? this.state.learningMemory.filter((item) => item.key === key) : this.state.learningMemory);
  }
}

export interface MemoryState {
  leads: LeadRecord[];
  activities: LeadActivityRecord[];
  prompts: PromptVersionRecord[];
  executions: PromptExecutionRecord[];
  followUpRuns: FollowUpRunRecord[];
  messages: MessageRecord[];
  bookings: BookingRecord[];
  analyticsEvents: AnalyticsEventRecord[];
  learningMemory: LearningMemoryRecord[];
  dailyReports: DailyReportRecord[];
}

export function createMemoryStore(initial?: Partial<MemoryState>): AgentStore {
  const state: MemoryState = {
    leads: [],
    activities: [],
    prompts: [],
    executions: [],
    followUpRuns: [],
    messages: [],
    bookings: [],
    analyticsEvents: [],
    learningMemory: [],
    dailyReports: [],
    ...initial
  };

  return {
    leads: new InMemoryLeadStore(state),
    prompts: new InMemoryPromptStore(state),
    llm: new InMemoryLlmStore(state),
    followUps: new InMemoryFollowUpStore(state),
    messages: new InMemoryMessageStore(state),
    bookings: new InMemoryBookingStore(state),
    analytics: new InMemoryAnalyticsStore(state),
    memory: new InMemoryMemoryStore(state)
  };
}
