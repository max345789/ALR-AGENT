import type { LeadCaptureInput, LeadFilter, LeadStatus } from '@alr/shared';

import type { AppContext } from '../../core/context.js';
import type { LeadRecord } from '../../core/store/types.js';
import { normalizeEmail, splitName, trimOrNull } from '../../utils/text.js';

function extractStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === 'string');
}

export interface LeadTimeline {
  lead: LeadRecord;
  activities: Awaited<ReturnType<AppContext['store']['leads']['listActivities']>>;
  messages: Awaited<ReturnType<AppContext['store']['messages']['listMessages']>>;
  bookings: Awaited<ReturnType<AppContext['store']['bookings']['listBookings']>>;
  followUpRuns: Awaited<ReturnType<AppContext['store']['followUps']['listRuns']>>;
}

export class LeadService {
  constructor(private readonly context: AppContext) {}

  async captureLead(
    input: LeadCaptureInput & { externalId?: string | null | undefined },
    options: { ownerUserId?: string | null | undefined } = {}
  ): Promise<LeadRecord> {
    const firstName = trimOrNull(input.firstName);
    const lastName = trimOrNull(input.lastName);
    const email = normalizeEmail(input.email ?? null);
    const phone = trimOrNull(input.phone);
    const company = trimOrNull(input.company);
    const jobTitle = trimOrNull(input.jobTitle);
    const message = trimOrNull(input.message);
    const intentHint = trimOrNull(input.intentHint);
    const metadata = input.metadata ?? {};
    const source = input.source ?? 'web';
    const ownerUserId = options.ownerUserId ?? null;

    let lead = email ? await this.context.store.leads.findByEmail(email, ownerUserId) : null;

    if (!lead) {
      const inferredName = typeof metadata.name === 'string' ? metadata.name : '';
      const inferred = splitName(inferredName);
      const tags = extractStringArray(metadata.tags);
      if (!firstName && !lastName && !email && !phone && !company && !message) {
        lead = await this.context.store.leads.create({
          ownerUserId,
          source,
          firstName: firstName ?? inferred.firstName,
          lastName: lastName ?? inferred.lastName,
          email,
          phone,
          company,
          jobTitle,
          message,
          intentHint,
          metadata,
          tags
        });
      } else {
        lead = await this.context.store.leads.create({
          ownerUserId,
          externalId: input.externalId ?? null,
          source,
          firstName,
          lastName,
          email,
          phone,
          company,
          jobTitle,
          message,
          intentHint,
          metadata,
          tags
        });
      }
    } else {
      const tags = extractStringArray(metadata.tags);
      lead = await this.context.store.leads.update(lead.id, {
        ownerUserId,
        externalId: input.externalId ?? lead.externalId,
        source,
        firstName: firstName ?? lead.firstName,
        lastName: lastName ?? lead.lastName,
        email,
        phone: phone ?? lead.phone,
        company: company ?? lead.company,
        jobTitle: jobTitle ?? lead.jobTitle,
        message: message ?? lead.message,
        intentHint: intentHint ?? lead.intentHint,
        metadata: {
          ...lead.metadata,
          ...metadata
        },
        tags: tags.length > 0 ? tags : lead.tags
      });
    }

    await this.context.store.leads.addActivity(lead.id, {
      type: 'lead.captured',
      channel: null,
      title: 'Lead captured',
      body: `${lead.firstName ?? 'A lead'} captured from ${source}.`,
      metadata: {
        source,
        email,
        company,
        intentHint
      }
    });

    await this.context.store.analytics.createEvent({
      leadId: lead.id,
      type: 'lead.captured',
      value: 1,
      metadata: {
        source,
        email,
        company
      }
    });

    if (!['booked', 'won', 'lost', 'disqualified'].includes(lead.status)) {
      await this.context.queue.enqueue('lead.qualify', { leadId: lead.id }, { jobId: `qualify-${lead.id}` });
    }

    return lead;
  }

  async listLeads(filter?: LeadFilter & { ownerUserId?: string | null | undefined }): Promise<LeadRecord[]> {
    return this.context.store.leads.list(filter);
  }

  async listDueFollowUps(before = new Date(), ownerUserId?: string | null | undefined, limit = 100): Promise<LeadRecord[]> {
    return this.context.store.leads.findDueFollowUps(before, ownerUserId, limit);
  }

  async getLead(id: string, ownerUserId?: string | null | undefined): Promise<LeadRecord> {
    const lead = await this.context.store.leads.findById(id, ownerUserId);
    if (!lead) {
      throw new Error(`Lead ${id} not found`);
    }
    return lead;
  }

  async updateLead(
    id: string,
    patch: {
      ownerUserId?: string | null | undefined;
      status?: LeadRecord['status'] | undefined;
      segment?: LeadRecord['segment'] | undefined;
      score?: LeadRecord['score'] | null | undefined;
      intent?: LeadRecord['intent'] | undefined;
      summary?: LeadRecord['summary'] | undefined;
      tags?: LeadRecord['tags'] | undefined;
      notes?: LeadRecord['notes'] | undefined;
      ownerName?: LeadRecord['ownerName'] | undefined;
      metadata?: Record<string, unknown> | undefined;
    }
  ): Promise<LeadRecord> {
    const update: Parameters<AppContext['store']['leads']['update']>[1] = {};

    if (patch.status !== undefined) {
      update.status = patch.status;
    }
    if (patch.ownerUserId !== undefined) {
      update.ownerUserId = patch.ownerUserId;
    }
    if (patch.segment !== undefined) {
      update.segment = patch.segment;
    }
    if (patch.score !== undefined && patch.score !== null) {
      update.score = patch.score;
    }
    if (patch.intent !== undefined) {
      update.intent = patch.intent;
    }
    if (patch.summary !== undefined) {
      update.summary = patch.summary;
    }
    if (patch.tags !== undefined) {
      update.tags = patch.tags;
    }
    if (patch.notes !== undefined) {
      update.notes = patch.notes;
    }
    if (patch.ownerName !== undefined) {
      update.ownerName = patch.ownerName;
    }
    if (patch.metadata !== undefined) {
      update.metadata = patch.metadata;
    }

    return this.context.store.leads.update(id, update);
  }

  async markLeadStatus(id: string, status: LeadStatus, note?: string, ownerUserId?: string | null | undefined): Promise<LeadRecord> {
    const update: Parameters<AppContext['store']['leads']['update']>[1] = { status };
    if (ownerUserId !== undefined) {
      update.ownerUserId = ownerUserId;
    }
    if (note !== undefined) {
      update.notes = note;
    }

    const lead = await this.context.store.leads.update(id, update);

    await this.context.store.leads.addActivity(id, {
      type: 'lead.status',
      channel: 'note',
      title: `Lead moved to ${status}`,
      body: note ?? `Status updated to ${status}.`,
      metadata: { status }
    });

    return lead;
  }

  async addNote(id: string, note: string, metadata: Record<string, unknown> = {}, ownerUserId?: string | null | undefined): Promise<LeadRecord> {
    const lead = await this.context.store.leads.update(id, {
      ownerUserId,
      notes: note
    });

    await this.context.store.leads.addActivity(id, {
      type: 'lead.note',
      channel: 'note',
      title: 'Note added',
      body: note,
      metadata
    });

    return lead;
  }

  async getTimeline(id: string, ownerUserId?: string | null | undefined): Promise<LeadTimeline> {
    const lead = await this.getLead(id, ownerUserId);
    const [activities, messages, bookings, followUpRuns] = await Promise.all([
      this.context.store.leads.listActivities(id),
      this.context.store.messages.listMessages(id),
      this.context.store.bookings.listBookings(id),
      this.context.store.followUps.listRuns(id)
    ]);

    return {
      lead,
      activities,
      messages,
      bookings,
      followUpRuns
    };
  }
}
