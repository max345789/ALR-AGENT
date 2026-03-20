import { PrismaClient, Prisma } from '@prisma/client';

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

function normalizeObject(value: Prisma.JsonValue | null | undefined): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

function normalizeStringArray(value: Prisma.JsonValue | null | undefined): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === 'string');
  }
  return [];
}

function json(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

export class PrismaStore implements AgentStore {
  constructor(private readonly prisma: PrismaClient) {}

  leads: LeadStore = {
    create: async (input: StoreLeadInput): Promise<LeadRecord> => {
      const lead = await this.prisma.lead.create({
        data: {
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
          tags: input.tags ?? [],
          metadata: json(input.metadata ?? {}),
          status: 'new',
          segment: 'cold',
          score: 0
        }
      });
      return this.mapLead(lead);
    },
    findById: async (id: string, ownerUserId?: string | null): Promise<LeadRecord | null> => {
      const lead = await this.prisma.lead.findUnique({ where: { id } });
      if (!lead) {
        return null;
      }
      if (ownerUserId !== undefined) {
        const matchesOwner = ownerUserId === null ? lead.ownerUserId === null : lead.ownerUserId === ownerUserId;
        if (!matchesOwner) {
          return null;
        }
      }
      return this.mapLead(lead);
    },
    findByEmail: async (email: string, ownerUserId?: string | null): Promise<LeadRecord | null> => {
      const lead = await this.prisma.lead.findFirst({
        where: {
          email: email.trim().toLowerCase(),
          ...(ownerUserId === undefined
            ? {}
            : ownerUserId === null
              ? { ownerUserId: null }
              : { ownerUserId })
        }
      });
      return lead ? this.mapLead(lead) : null;
    },
    list: async (options?: LeadListOptions): Promise<LeadRecord[]> => {
      const where: Prisma.LeadWhereInput = {};
      if (options?.ownerUserId !== undefined) {
        where.ownerUserId = options.ownerUserId;
      }
      if (options?.status && options.status !== 'any') {
        where.status = options.status;
      }
      if (options?.segment && options.segment !== 'any') {
        where.segment = options.segment;
      }
      if (options?.source && options.source !== 'any') {
        where.source = options.source;
      }
      if (options?.search) {
        const term = options.search.trim();
        where.OR = [
          { firstName: { contains: term, mode: 'insensitive' } },
          { lastName: { contains: term, mode: 'insensitive' } },
          { email: { contains: term, mode: 'insensitive' } },
          { phone: { contains: term, mode: 'insensitive' } },
          { company: { contains: term, mode: 'insensitive' } },
          { jobTitle: { contains: term, mode: 'insensitive' } },
          { message: { contains: term, mode: 'insensitive' } },
          { intent: { contains: term, mode: 'insensitive' } },
          { summary: { contains: term, mode: 'insensitive' } }
        ];
      }
      const leads = await this.prisma.lead.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: options?.limit ?? 100
      });
      return leads.map((lead) => this.mapLead(lead));
    },
    update: async (id: string, input: StoreLeadUpdateInput): Promise<LeadRecord> => {
      const data: Prisma.LeadUncheckedUpdateInput = {};
      if ('ownerUserId' in input) data.ownerUserId = input.ownerUserId ?? null;
      if ('externalId' in input) data.externalId = input.externalId ?? null;
      if ('source' in input && input.source !== undefined) data.source = input.source;
      if ('firstName' in input) data.firstName = input.firstName ?? null;
      if ('lastName' in input) data.lastName = input.lastName ?? null;
      if ('email' in input) data.email = input.email ?? null;
      if ('phone' in input) data.phone = input.phone ?? null;
      if ('company' in input) data.company = input.company ?? null;
      if ('jobTitle' in input) data.jobTitle = input.jobTitle ?? null;
      if ('message' in input) data.message = input.message ?? null;
      if ('intentHint' in input) data.intentHint = input.intentHint ?? null;
      if ('status' in input && input.status !== undefined) data.status = input.status;
      if ('segment' in input && input.segment !== undefined) data.segment = input.segment;
      if ('score' in input && input.score !== undefined) data.score = input.score;
      if ('intent' in input) data.intent = input.intent ?? null;
      if ('summary' in input) data.summary = input.summary ?? null;
      if ('tags' in input && input.tags !== undefined) data.tags = input.tags;
      if ('metadata' in input && input.metadata !== undefined) data.metadata = json(input.metadata);
      if ('ownerName' in input) data.ownerName = input.ownerName ?? null;
      if ('notes' in input) data.notes = input.notes ?? null;
      if ('qualifiedAt' in input) data.qualifiedAt = input.qualifiedAt ?? null;
      if ('bookedAt' in input) data.bookedAt = input.bookedAt ?? null;
      if ('convertedAt' in input) data.convertedAt = input.convertedAt ?? null;
      if ('nextFollowUpAt' in input) data.nextFollowUpAt = input.nextFollowUpAt ?? null;
      const lead = await this.prisma.lead.update({ where: { id }, data });
      return this.mapLead(lead);
    },
    addActivity: async (leadId: string, activity): Promise<LeadActivityRecord> => {
      const row = await this.prisma.leadActivity.create({
        data: {
          leadId,
          type: activity.type,
          channel: activity.channel ?? null,
          title: activity.title,
          body: activity.body,
          metadata: json(activity.metadata)
        }
      });
      return this.mapActivity(row);
    },
    listActivities: async (leadId: string): Promise<LeadActivityRecord[]> => {
      const rows = await this.prisma.leadActivity.findMany({
        where: { leadId },
        orderBy: { createdAt: 'asc' }
      });
      return rows.map((row) => this.mapActivity(row));
    }
  };

  prompts: PromptStore = {
    seedDefaults: async (prompts: PromptSeedState[]): Promise<void> => {
      for (const prompt of prompts) {
        await this.prisma.promptVersion.upsert({
          where: { slug_version: { slug: prompt.slug, version: prompt.version } },
          create: {
            slug: prompt.slug,
            version: prompt.version,
            title: prompt.title,
            content: prompt.content,
            active: prompt.active,
            metadata: json(prompt.metadata),
            checksum: prompt.checksum
          },
          update: {
            title: prompt.title,
            content: prompt.content,
            active: prompt.active,
            metadata: json(prompt.metadata),
            checksum: prompt.checksum
          }
        });
        if (prompt.active) {
          await this.prompts.activateVersion(prompt.slug, prompt.version);
        }
      }
    },
    listVersions: async (slug: PromptSlug): Promise<PromptVersionRecord[]> => {
      const rows = await this.prisma.promptVersion.findMany({
        where: { slug },
        orderBy: { version: 'asc' }
      });
      return rows.map((row) => this.mapPromptVersion(row));
    },
    getActive: async (slug: PromptSlug): Promise<PromptVersionRecord | null> => {
      const row = await this.prisma.promptVersion.findFirst({
        where: { slug, active: true },
        orderBy: { version: 'desc' }
      });
      return row ? this.mapPromptVersion(row) : null;
    },
    upsertVersion: async (input: PromptVersionInput): Promise<PromptVersionRecord> => {
      const row = await this.prisma.promptVersion.upsert({
        where: { slug_version: { slug: input.slug, version: input.version } },
        create: {
          slug: input.slug,
          version: input.version,
          title: input.title,
          content: input.content,
          active: input.active,
          metadata: json(input.metadata ?? {}),
          checksum: input.checksum
        },
        update: {
          title: input.title,
          content: input.content,
          active: input.active,
          metadata: json(input.metadata ?? {}),
          checksum: input.checksum
        }
      });
      if (input.active) {
        await this.prompts.activateVersion(input.slug, input.version);
      }
      return this.mapPromptVersion(row);
    },
    activateVersion: async (slug: PromptSlug, version: number): Promise<PromptVersionRecord> => {
      const [updated] = await this.prisma.$transaction([
        this.prisma.promptVersion.updateMany({
          where: { slug },
          data: { active: false }
        }),
        this.prisma.promptVersion.update({
          where: { slug_version: { slug, version } },
          data: { active: true }
        })
      ]);
      void updated;
      const row = await this.prisma.promptVersion.findUnique({ where: { slug_version: { slug, version } } });
      if (!row) {
        throw new Error(`Prompt ${slug} v${version} not found`);
      }
      return this.mapPromptVersion(row);
    }
  };

  llm: LlmStore = {
    createExecution: async (input: PromptExecutionInput): Promise<PromptExecutionRecord> => {
      const data: Prisma.PromptExecutionUncheckedCreateInput = {
        slug: input.slug,
        provider: input.provider,
        input: json(input.input),
        success: input.success ?? true
      };
      if (input.leadId !== undefined) data.leadId = input.leadId ?? null;
      if (input.promptVersionId !== undefined) data.promptVersionId = input.promptVersionId ?? null;
      if (input.model !== undefined) data.model = input.model ?? null;
      if (input.output !== undefined) data.output = input.output === null ? Prisma.JsonNull : json(input.output);
      if (input.tokensIn !== undefined) data.tokensIn = input.tokensIn ?? null;
      if (input.tokensOut !== undefined) data.tokensOut = input.tokensOut ?? null;
      if (input.error !== undefined) data.error = input.error ?? null;
      const row = await this.prisma.promptExecution.create({ data });
      return this.mapExecution(row);
    },
    listExecutions: async (leadId?: string): Promise<PromptExecutionRecord[]> => {
      const rows = await this.prisma.promptExecution.findMany({
        ...(leadId !== undefined ? { where: { leadId } } : {}),
        orderBy: { createdAt: 'desc' }
      });
      return rows.map((row) => this.mapExecution(row));
    }
  };

  followUps: FollowUpStore = {
    createRun: async (input: FollowUpRunInput): Promise<FollowUpRunRecord> => {
      const data: Prisma.FollowUpRunUncheckedCreateInput = {
        leadId: input.leadId,
        sequenceSlug: input.sequenceSlug,
        status: input.status ?? 'active',
        currentStep: input.currentStep ?? 0,
        attemptCount: input.attemptCount ?? 0,
        context: json(input.context ?? {})
      };
      if (input.sequenceVersion !== undefined) data.sequenceVersion = input.sequenceVersion ?? null;
      if (input.nextRunAt !== undefined) data.nextRunAt = input.nextRunAt ?? null;
      if (input.lastRunAt !== undefined) data.lastRunAt = input.lastRunAt ?? null;
      const row = await this.prisma.followUpRun.create({ data });
      return this.mapFollowUpRun(row);
    },
    findRun: async (id: string): Promise<FollowUpRunRecord | null> => {
      const row = await this.prisma.followUpRun.findUnique({ where: { id } });
      return row ? this.mapFollowUpRun(row) : null;
    },
    findRunByLead: async (leadId: string, sequenceSlug?: string): Promise<FollowUpRunRecord | null> => {
      const row = await this.prisma.followUpRun.findFirst({
        where: {
          leadId,
          ...(sequenceSlug ? { sequenceSlug } : {})
        },
        orderBy: { createdAt: 'desc' }
      });
      return row ? this.mapFollowUpRun(row) : null;
    },
    updateRun: async (id: string, input: Partial<FollowUpRunInput>): Promise<FollowUpRunRecord> => {
      const data: Prisma.FollowUpRunUpdateInput = {};
      if ('sequenceSlug' in input && input.sequenceSlug !== undefined) data.sequenceSlug = input.sequenceSlug;
      if ('sequenceVersion' in input) data.sequenceVersion = input.sequenceVersion ?? null;
      if ('status' in input && input.status !== undefined) data.status = input.status;
      if ('currentStep' in input && input.currentStep !== undefined) data.currentStep = input.currentStep;
      if ('attemptCount' in input && input.attemptCount !== undefined) data.attemptCount = input.attemptCount;
      if ('context' in input && input.context !== undefined) data.context = json(input.context);
      if ('nextRunAt' in input) data.nextRunAt = input.nextRunAt ?? null;
      if ('lastRunAt' in input) data.lastRunAt = input.lastRunAt ?? null;
      const row = await this.prisma.followUpRun.update({ where: { id }, data });
      return this.mapFollowUpRun(row);
    },
    listRuns: async (leadId: string): Promise<FollowUpRunRecord[]> => {
      const rows = await this.prisma.followUpRun.findMany({
        where: { leadId },
        orderBy: { createdAt: 'asc' }
      });
      return rows.map((row) => this.mapFollowUpRun(row));
    }
  };

  messages: MessageStore = {
    createMessage: async (input: MessageInput): Promise<MessageRecord> => {
      const data: Prisma.MessageUncheckedCreateInput = {
        leadId: input.leadId,
        channel: input.channel,
        direction: input.direction,
        status: input.status,
        body: input.body,
        provider: input.provider,
        attempt: input.attempt ?? 0,
        metadata: json(input.metadata ?? {})
      };
      if (input.followUpRunId !== undefined) data.followUpRunId = input.followUpRunId ?? null;
      if (input.subject !== undefined) data.subject = input.subject ?? null;
      if (input.externalId !== undefined) data.externalId = input.externalId ?? null;
      if (input.scheduledFor !== undefined) data.scheduledFor = input.scheduledFor ?? null;
      if (input.sentAt !== undefined) data.sentAt = input.sentAt ?? null;
      if (input.error !== undefined) data.error = input.error ?? null;
      const row = await this.prisma.message.create({ data });
      return this.mapMessage(row);
    },
    updateMessage: async (id: string, input: Partial<MessageInput>): Promise<MessageRecord> => {
      const data: Prisma.MessageUncheckedUpdateInput = {};
      if ('followUpRunId' in input) data.followUpRunId = input.followUpRunId ?? null;
      if ('channel' in input && input.channel !== undefined) data.channel = input.channel;
      if ('direction' in input && input.direction !== undefined) data.direction = input.direction;
      if ('status' in input && input.status !== undefined) data.status = input.status;
      if ('subject' in input) data.subject = input.subject ?? null;
      if ('body' in input && input.body !== undefined) data.body = input.body;
      if ('provider' in input && input.provider !== undefined) data.provider = input.provider;
      if ('externalId' in input) data.externalId = input.externalId ?? null;
      if ('attempt' in input && input.attempt !== undefined) data.attempt = input.attempt;
      if ('scheduledFor' in input) data.scheduledFor = input.scheduledFor ?? null;
      if ('sentAt' in input) data.sentAt = input.sentAt ?? null;
      if ('error' in input) data.error = input.error ?? null;
      if ('metadata' in input && input.metadata !== undefined) data.metadata = json(input.metadata);
      const row = await this.prisma.message.update({ where: { id }, data });
      return this.mapMessage(row);
    },
    listMessages: async (leadId: string): Promise<MessageRecord[]> => {
      const rows = await this.prisma.message.findMany({
        where: { leadId },
        orderBy: { createdAt: 'asc' }
      });
      return rows.map((row) => this.mapMessage(row));
    }
  };

  bookings: BookingStore = {
    createBooking: async (input: BookingInput): Promise<BookingRecord> => {
      const data: Prisma.BookingUncheckedCreateInput = {
        leadId: input.leadId,
        bookingToken: input.bookingToken,
        slotStart: input.slotStart,
        slotEnd: input.slotEnd,
        timezone: input.timezone,
        meetingLink: input.meetingLink,
        provider: input.provider,
        status: input.status,
        metadata: json(input.metadata ?? {})
      };
      if (input.notes !== undefined) data.notes = input.notes ?? null;
      if (input.externalId !== undefined) data.externalId = input.externalId ?? null;
      const row = await this.prisma.booking.create({ data });
      return this.mapBooking(row);
    },
    updateBooking: async (id: string, input: Partial<BookingInput>): Promise<BookingRecord> => {
      const data: Prisma.BookingUpdateInput = {};
      if ('leadId' in input && input.leadId !== undefined) data.lead = { connect: { id: input.leadId } };
      if ('bookingToken' in input && input.bookingToken !== undefined) data.bookingToken = input.bookingToken;
      if ('slotStart' in input && input.slotStart !== undefined) data.slotStart = input.slotStart;
      if ('slotEnd' in input && input.slotEnd !== undefined) data.slotEnd = input.slotEnd;
      if ('timezone' in input && input.timezone !== undefined) data.timezone = input.timezone;
      if ('meetingLink' in input && input.meetingLink !== undefined) data.meetingLink = input.meetingLink;
      if ('provider' in input && input.provider !== undefined) data.provider = input.provider;
      if ('status' in input && input.status !== undefined) data.status = input.status;
      if ('notes' in input) data.notes = input.notes ?? null;
      if ('metadata' in input && input.metadata !== undefined) data.metadata = json(input.metadata);
      if ('externalId' in input) data.externalId = input.externalId ?? null;
      const row = await this.prisma.booking.update({ where: { id }, data });
      return this.mapBooking(row);
    },
    listBookings: async (leadId: string): Promise<BookingRecord[]> => {
      const rows = await this.prisma.booking.findMany({
        where: { leadId },
        orderBy: { createdAt: 'asc' }
      });
      return rows.map((row) => this.mapBooking(row));
    },
    findByToken: async (token: string): Promise<BookingRecord | null> => {
      const row = await this.prisma.booking.findFirst({ where: { bookingToken: token } });
      return row ? this.mapBooking(row) : null;
    }
  };

  analytics: AnalyticsStore = {
    createEvent: async (input: AnalyticsEventInput): Promise<AnalyticsEventRecord> => {
      const data: Prisma.AnalyticsEventUncheckedCreateInput = {
        type: input.type,
        value: input.value ?? 0,
        metadata: json(input.metadata ?? {})
      };
      if (input.leadId !== undefined) data.leadId = input.leadId ?? null;
      const row = await this.prisma.analyticsEvent.create({ data });
      return this.mapAnalytics(row);
    },
    listEvents: async (leadId?: string): Promise<AnalyticsEventRecord[]> => {
      const rows = await this.prisma.analyticsEvent.findMany({
        ...(leadId !== undefined ? { where: { leadId } } : {}),
        orderBy: { createdAt: 'asc' }
      });
      return rows.map((row) => this.mapAnalytics(row));
    },
    upsertDailyReport: async (input: DailyReportInput): Promise<DailyReportRecord> => {
      const row = await this.prisma.dailyReport.upsert({
        where: { reportDate: input.reportDate },
        create: {
          reportDate: input.reportDate,
          payload: json(input.payload)
        },
        update: {
          payload: json(input.payload)
        }
      });
      return this.mapReport(row);
    },
    listDailyReports: async (): Promise<DailyReportRecord[]> => {
      const rows = await this.prisma.dailyReport.findMany({
        orderBy: { reportDate: 'desc' }
      });
      return rows.map((row) => this.mapReport(row));
    }
  };

  memory: MemoryStore = {
    create: async (input: LearningMemoryInput): Promise<LearningMemoryRecord> => {
      const row = await this.prisma.learningMemory.create({
        data: {
          key: input.key,
          value: json(input.value),
          score: input.score ?? 0,
          source: input.source
        }
      });
      return this.mapMemory(row);
    },
    list: async (key?: string): Promise<LearningMemoryRecord[]> => {
      const rows = await this.prisma.learningMemory.findMany({
        ...(key !== undefined ? { where: { key } } : {}),
        orderBy: { createdAt: 'desc' }
      });
      return rows.map((row) => this.mapMemory(row));
    }
  };

  private mapLead(row: Prisma.LeadGetPayload<Record<string, never>>): LeadRecord {
    return {
      id: row.id,
      ownerUserId: row.ownerUserId ?? null,
      externalId: row.externalId ?? null,
      source: row.source as LeadRecord['source'],
      firstName: row.firstName ?? null,
      lastName: row.lastName ?? null,
      email: row.email ?? null,
      phone: row.phone ?? null,
      company: row.company ?? null,
      jobTitle: row.jobTitle ?? null,
      message: row.message ?? null,
      intentHint: row.intentHint ?? null,
      status: row.status as LeadRecord['status'],
      segment: row.segment as LeadRecord['segment'],
      score: row.score,
      intent: row.intent ?? null,
      summary: row.summary ?? null,
      tags: normalizeStringArray(row.tags),
      metadata: normalizeObject(row.metadata),
      ownerName: row.ownerName ?? null,
      notes: row.notes ?? null,
      qualifiedAt: row.qualifiedAt,
      bookedAt: row.bookedAt,
      convertedAt: row.convertedAt,
      nextFollowUpAt: row.nextFollowUpAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
    };
  }

  private mapActivity(row: Prisma.LeadActivityGetPayload<Record<string, never>>): LeadActivityRecord {
    return {
      id: row.id,
      leadId: row.leadId,
      type: row.type,
      channel: row.channel as LeadActivityRecord['channel'],
      title: row.title,
      body: row.body,
      metadata: normalizeObject(row.metadata),
      createdAt: row.createdAt
    };
  }

  private mapPromptVersion(row: Prisma.PromptVersionGetPayload<Record<string, never>>): PromptVersionRecord {
    return {
      id: row.id,
      slug: row.slug as PromptSlug,
      version: row.version,
      title: row.title,
      content: row.content,
      active: row.active,
      metadata: normalizeObject(row.metadata),
      checksum: row.checksum ?? '',
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
    };
  }

  private mapExecution(row: Prisma.PromptExecutionGetPayload<Record<string, never>>): PromptExecutionRecord {
    return {
      id: row.id,
      leadId: row.leadId,
      promptVersionId: row.promptVersionId,
      slug: row.slug as PromptExecutionRecord['slug'],
      provider: row.provider,
      model: row.model ?? null,
      input: row.input as Prisma.JsonValue,
      output: row.output as Prisma.JsonValue | null,
      tokensIn: row.tokensIn ?? null,
      tokensOut: row.tokensOut ?? null,
      success: row.success,
      error: row.error ?? null,
      createdAt: row.createdAt
    };
  }

  private mapFollowUpRun(row: Prisma.FollowUpRunGetPayload<Record<string, never>>): FollowUpRunRecord {
    return {
      id: row.id,
      leadId: row.leadId,
      sequenceSlug: row.sequenceSlug,
      sequenceVersion: row.sequenceVersion ?? null,
      status: row.status,
      currentStep: row.currentStep,
      attemptCount: row.attemptCount,
      context: normalizeObject(row.context),
      nextRunAt: row.nextRunAt,
      lastRunAt: row.lastRunAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
    };
  }

  private mapMessage(row: Prisma.MessageGetPayload<Record<string, never>>): MessageRecord {
    return {
      id: row.id,
      leadId: row.leadId,
      followUpRunId: row.followUpRunId ?? null,
      channel: row.channel as MessageRecord['channel'],
      direction: row.direction as MessageRecord['direction'],
      status: row.status as MessageRecord['status'],
      subject: row.subject ?? null,
      body: row.body,
      provider: row.provider,
      externalId: row.externalId ?? null,
      attempt: row.attempt,
      scheduledFor: row.scheduledFor,
      sentAt: row.sentAt,
      error: row.error ?? null,
      metadata: normalizeObject(row.metadata),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
    };
  }

  private mapBooking(row: Prisma.BookingGetPayload<Record<string, never>>): BookingRecord {
    return {
      id: row.id,
      leadId: row.leadId,
      bookingToken: row.bookingToken,
      slotStart: row.slotStart,
      slotEnd: row.slotEnd,
      timezone: row.timezone,
      meetingLink: row.meetingLink,
      provider: row.provider,
      status: row.status as BookingRecord['status'],
      notes: row.notes ?? null,
      metadata: normalizeObject(row.metadata),
      externalId: row.externalId ?? null,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
    };
  }

  private mapAnalytics(row: Prisma.AnalyticsEventGetPayload<Record<string, never>>): AnalyticsEventRecord {
    return {
      id: row.id,
      leadId: row.leadId ?? null,
      type: row.type,
      value: row.value,
      metadata: normalizeObject(row.metadata),
      createdAt: row.createdAt
    };
  }

  private mapReport(row: Prisma.DailyReportGetPayload<Record<string, never>>): DailyReportRecord {
    return {
      id: row.id,
      reportDate: row.reportDate,
      payload: row.payload as Prisma.JsonValue,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
    };
  }

  private mapMemory(row: Prisma.LearningMemoryGetPayload<Record<string, never>>): LearningMemoryRecord {
    return {
      id: row.id,
      key: row.key,
      value: row.value as Prisma.JsonValue,
      score: row.score,
      source: row.source,
      createdAt: row.createdAt
    };
  }
}

export function createPrismaStore(prisma: PrismaClient): AgentStore {
  return new PrismaStore(prisma);
}
