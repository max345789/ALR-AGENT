import { qualificationResultSchema, type QualificationResult as SharedQualificationResult } from '@alr/shared';
import { addHours } from 'date-fns';

import type { AppContext } from '../../core/context.js';
import type { LeadRecord, PromptVersionRecord } from '../../core/store/types.js';
import { parseStructuredJson } from '../../core/llm/index.js';
import { PromptService } from '../prompts/prompt.service.js';
import { BookingService } from '../bookings/booking.service.js';

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function fallbackQualification(lead: LeadRecord): SharedQualificationResult {
  const text = [
    lead.message,
    lead.intentHint,
    lead.company,
    lead.jobTitle,
    lead.firstName
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  let score = 38;
  if (text.includes('urgent') || text.includes('asap') || text.includes('today')) score += 25;
  if (text.includes('pricing') || text.includes('budget') || text.includes('proposal')) score += 16;
  if (text.includes('demo') || text.includes('book') || text.includes('meeting')) score += 15;
  if (text.includes('enterprise') || text.includes('team') || text.includes('growth')) score += 10;
  if (!lead.company) score -= 6;
  if (!lead.email) score -= 5;

  score = Math.max(0, Math.min(100, score));
  const segment = score >= 80 ? 'hot' : score >= 55 ? 'warm' : 'cold';

  return {
    score,
    segment,
    intent: lead.intentHint ?? lead.message?.slice(0, 120) ?? 'General inquiry',
    confidence: segment === 'hot' ? 0.9 : segment === 'warm' ? 0.8 : 0.68,
    summary: `${lead.firstName ?? 'The lead'} is a ${segment} opportunity based on the available context.`,
    painPoints: score >= 70 ? ['Speed and implementation clarity'] : ['Need more context', 'Timing or budget uncertainty'],
    objections: score >= 70 ? ['Comparing options'] : ['Still evaluating'],
    tags: uniqueStrings([
      segment,
      lead.company ? 'company-present' : 'individual',
      lead.email ? 'reachable-email' : 'no-email',
      ...(score >= 75 ? ['high-intent'] : [])
    ]),
    recommendedNextStep: segment === 'hot' ? 'Send an immediate booking link and confirm the best meeting time.' : 'Send a personalized follow-up and book a short call if interest remains.',
    bookingRecommended: segment !== 'cold',
    followUpDelayHours: segment === 'hot' ? 1 : segment === 'warm' ? 12 : 48
  };
}

export class QualificationService {
  constructor(
    private readonly context: AppContext,
    private readonly promptService: PromptService,
    private readonly bookingService: BookingService
  ) {}

  async qualifyLead(
    leadId: string,
    ownerUserId?: string | null | undefined
  ): Promise<{ lead: LeadRecord; result: SharedQualificationResult; prompt: PromptVersionRecord }> {
    const lead = await this.context.store.leads.findById(leadId, ownerUserId);
    if (!lead) {
      throw new Error(`Lead ${leadId} not found`);
    }

    if (['booked', 'won', 'lost', 'disqualified'].includes(lead.status)) {
      const prompt = await this.promptService.getActive('qualification');
      return { lead, result: fallbackQualification(lead), prompt };
    }

    const prompt = await this.promptService.getActive('qualification');
    const requestMessages = [
      {
        role: 'system' as const,
        content: prompt.content
      },
      {
        role: 'user' as const,
        content: JSON.stringify({
          lead,
          objective: 'Qualify this lead and produce the scoring JSON.'
        })
      }
    ];

    let result: SharedQualificationResult = fallbackQualification(lead);
    let responseText = '';
    let success = true;

    try {
      const response = await this.context.llm.complete({
        task: 'qualification',
        system: prompt.content,
        messages: requestMessages.filter((message) => message.role !== 'system'),
        responseFormat: 'json',
        metadata: { lead }
      });
      responseText = response.text;
      result = qualificationResultSchema.parse(parseStructuredJson<SharedQualificationResult>(response));
      await this.context.store.llm.createExecution({
        leadId,
        promptVersionId: prompt.id,
        slug: 'qualification',
        provider: response.provider,
        model: response.model,
        input: { lead },
        output: result,
        tokensIn: response.usage?.inputTokens ?? null,
        tokensOut: response.usage?.outputTokens ?? null,
        success: true
      });
    } catch (error) {
      success = false;
      await this.context.store.llm.createExecution({
        leadId,
        promptVersionId: prompt.id,
        slug: 'qualification',
        provider: this.context.llm.provider,
        model: null,
        input: { lead },
        output: result,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown qualification error'
      });
      await this.context.store.leads.addActivity(leadId, {
        type: 'lead.qualification.warning',
        channel: 'note',
        title: 'Qualification fallback used',
        body: `Primary qualification model failed, fallback applied. ${responseText ? `Raw response: ${responseText}` : ''}`.trim(),
        metadata: {
          error: error instanceof Error ? error.message : 'Unknown qualification error'
        }
      });
    }

    const nextStatus = result.score >= 75 ? 'qualified' : result.segment === 'cold' ? 'nurturing' : 'qualified';
    const qualifiedAt = new Date();
    const nextFollowUpAt = addHours(qualifiedAt, result.followUpDelayHours);

    const updatedLead = await this.context.store.leads.update(leadId, {
      ownerUserId,
      status: nextStatus,
      segment: result.segment,
      score: result.score,
      intent: result.intent,
      summary: result.summary,
      tags: uniqueStrings([...lead.tags, ...result.tags, result.segment]),
      qualifiedAt,
      nextFollowUpAt
    });

    await this.context.store.leads.addActivity(leadId, {
      type: 'lead.qualified',
      channel: 'note',
      title: `Lead qualified as ${result.segment}`,
      body: result.summary,
      metadata: {
        result,
        promptVersionId: prompt.id,
        success
      }
    });

    await this.context.store.analytics.createEvent({
      leadId,
      type: 'lead.qualified',
      value: result.score,
      metadata: result as unknown as Record<string, unknown>
    });

    if (result.bookingRecommended) {
      await this.bookingService.prepareBookingOffer(leadId, ownerUserId);
    }

    const followUpJobId = `followup-${leadId}-${qualifiedAt.toISOString().replace(/[:.]/g, '-')}`;
    await this.context.queue.enqueue('lead.followup', { leadId }, { delay: result.followUpDelayHours * 60 * 60 * 1000, jobId: followUpJobId });

    return {
      lead: updatedLead,
      result,
      prompt
    };
  }
}
