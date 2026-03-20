import type { LeadStatus } from '@alr/shared';

import type { LeadService } from '../leads/lead.service.js';

export class CrmService {
  constructor(private readonly leads: LeadService) {}

  async updateStatus(leadId: string, status: LeadStatus, note?: string, ownerUserId?: string | null): Promise<void> {
    await this.leads.markLeadStatus(leadId, status, note, ownerUserId);
  }

  async addNote(leadId: string, note: string, metadata: Record<string, unknown> = {}, ownerUserId?: string | null): Promise<void> {
    await this.leads.addNote(leadId, note, metadata, ownerUserId);
  }

  async assignOwner(leadId: string, ownerName: string, ownerUserId?: string | null): Promise<void> {
    await this.leads.updateLead(leadId, { ownerName, ownerUserId });
  }

  async timeline(leadId: string, ownerUserId?: string | null) {
    return this.leads.getTimeline(leadId, ownerUserId);
  }
}
