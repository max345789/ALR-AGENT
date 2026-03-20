import type { AnalyticsSummary } from '@alr/shared';
import { analyticsSummarySchema } from '@alr/shared';

import type { AppContext } from '../../core/context.js';
import type { LeadRecord } from '../../core/store/types.js';
import { startOfUtcDay } from '../../utils/dates.js';

export interface AnalyticsDashboard {
  summary: AnalyticsSummary;
  byStatus: Record<string, number>;
  bySource: Record<string, number>;
  bySegment: Record<string, number>;
  recentLeads: Array<Pick<LeadRecord, 'id' | 'source' | 'firstName' | 'lastName' | 'email' | 'company' | 'status' | 'segment' | 'score' | 'createdAt'>>;
}

export class AnalyticsService {
  constructor(private readonly context: AppContext) {}

  private async allLeads(ownerUserId?: string | null): Promise<LeadRecord[]> {
    return this.context.store.leads.list({ limit: 1000, ownerUserId });
  }

  async summary(ownerUserId?: string | null): Promise<AnalyticsSummary> {
    const leads = await this.allLeads(ownerUserId);
    const totalLeads = leads.length;
    const qualifiedLeads = leads.filter((lead) => ['qualified', 'nurturing', 'booked', 'won'].includes(lead.status)).length;
    const hotLeads = leads.filter((lead) => lead.segment === 'hot').length;
    const warmLeads = leads.filter((lead) => lead.segment === 'warm').length;
    const coldLeads = leads.filter((lead) => lead.segment === 'cold').length;
    const bookedLeads = leads.filter((lead) => lead.status === 'booked').length;
    const wonLeads = leads.filter((lead) => lead.status === 'won').length;
    const lostLeads = leads.filter((lead) => lead.status === 'lost' || lead.status === 'disqualified').length;
    const conversionRate = totalLeads > 0 ? Math.round(((bookedLeads + wonLeads) / totalLeads) * 10000) / 100 : 0;
    const averageScore = totalLeads > 0 ? Math.round((leads.reduce((sum, lead) => sum + lead.score, 0) / totalLeads) * 100) / 100 : 0;
    const openFollowUps = leads.filter((lead) => Boolean(lead.nextFollowUpAt) && !['booked', 'won', 'lost', 'disqualified'].includes(lead.status)).length;

    return analyticsSummarySchema.parse({
      totalLeads,
      qualifiedLeads,
      hotLeads,
      warmLeads,
      coldLeads,
      bookedLeads,
      wonLeads,
      lostLeads,
      conversionRate,
      averageScore,
      openFollowUps
    });
  }

  async dashboard(ownerUserId?: string | null): Promise<AnalyticsDashboard> {
    const leads = await this.allLeads(ownerUserId);
    const summary = await this.summary(ownerUserId);

    const byStatus = leads.reduce<Record<string, number>>((acc, lead) => {
      acc[lead.status] = (acc[lead.status] ?? 0) + 1;
      return acc;
    }, {});
    const bySource = leads.reduce<Record<string, number>>((acc, lead) => {
      acc[lead.source] = (acc[lead.source] ?? 0) + 1;
      return acc;
    }, {});
    const bySegment = leads.reduce<Record<string, number>>((acc, lead) => {
      acc[lead.segment] = (acc[lead.segment] ?? 0) + 1;
      return acc;
    }, {});

    return {
      summary,
      byStatus,
      bySource,
      bySegment,
      recentLeads: leads
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .slice(0, 12)
        .map((lead) => ({
          id: lead.id,
          source: lead.source,
          firstName: lead.firstName,
          lastName: lead.lastName,
          email: lead.email,
          company: lead.company,
          status: lead.status,
          segment: lead.segment,
          score: lead.score,
          createdAt: lead.createdAt
        }))
    };
  }

  async dailyReport(date = new Date(), ownerUserId?: string | null): Promise<{ date: string; summary: AnalyticsSummary; dashboard: AnalyticsDashboard }> {
    const normalizedDate = startOfUtcDay(date);
    const dashboard = await this.dashboard(ownerUserId);
    const payload = {
      date: normalizedDate.toISOString(),
      summary: dashboard.summary,
      byStatus: dashboard.byStatus,
      bySource: dashboard.bySource,
      bySegment: dashboard.bySegment,
      recentLeads: dashboard.recentLeads
    };

    await this.context.store.analytics.upsertDailyReport({
      reportDate: normalizedDate,
      payload
    });

    await this.context.store.analytics.createEvent({
      type: 'daily.report.created',
      value: dashboard.summary.conversionRate,
      metadata: payload
    });

    return {
      date: normalizedDate.toISOString(),
      summary: dashboard.summary,
      dashboard
    };
  }

  async leadMetrics(leadId: string, ownerUserId?: string | null): Promise<{
    leadId: string;
    messages: number;
    bookings: number;
    followUps: number;
    activities: number;
  }> {
    const lead = await this.context.store.leads.findById(leadId, ownerUserId);
    if (!lead) {
      throw new Error(`Lead ${leadId} not found`);
    }

    const [messages, bookings, followUps, activities] = await Promise.all([
      this.context.store.messages.listMessages(leadId),
      this.context.store.bookings.listBookings(leadId),
      this.context.store.followUps.listRuns(leadId),
      this.context.store.leads.listActivities(leadId)
    ]);

    return {
      leadId,
      messages: messages.length,
      bookings: bookings.length,
      followUps: followUps.length,
      activities: activities.length
    };
  }
}
