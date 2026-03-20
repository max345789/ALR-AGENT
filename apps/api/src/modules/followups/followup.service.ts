import type { FollowUpSequenceDefinition } from '@alr/shared';
import { DEFAULT_FOLLOW_UP_SEQUENCE } from '@alr/shared';
import { addHours } from 'date-fns';

import type { AppContext } from '../../core/context.js';
import type { LeadRecord, FollowUpRunRecord } from '../../core/store/types.js';
import { PromptService } from '../prompts/prompt.service.js';
import { renderTemplate, trimOrNull } from '../../utils/text.js';
import { qualificationResultSchema } from '@alr/shared';
import { parseStructuredJson } from '../../core/llm/index.js';

type FollowUpVariables = Record<string, string | number | null | undefined>;

function buildVariables(lead: LeadRecord, bookingLink = ''): FollowUpVariables {
  return {
    firstName: lead.firstName ?? 'there',
    lastName: lead.lastName ?? '',
    company: lead.company ?? '',
    email: lead.email ?? '',
    phone: lead.phone ?? '',
    bookingLink,
    score: lead.score,
    segment: lead.segment,
    intent: lead.intent ?? lead.intentHint ?? '',
    summary: lead.summary ?? '',
    status: lead.status
  };
}

function selectChannel(stepChannel: FollowUpSequenceDefinition['steps'][number]['channel'], lead: LeadRecord): FollowUpSequenceDefinition['steps'][number]['channel'] | 'note' {
  if (stepChannel === 'email' && lead.email) {
    return 'email';
  }
  if (stepChannel === 'whatsapp' && lead.phone) {
    return 'whatsapp';
  }
  if (stepChannel === 'sms' && lead.phone) {
    return 'sms';
  }
  return 'note';
}

export class FollowUpService {
  constructor(private readonly context: AppContext, private readonly promptService: PromptService) {}

  getSequence(): FollowUpSequenceDefinition {
    return DEFAULT_FOLLOW_UP_SEQUENCE;
  }

  async ensureRun(leadId: string): Promise<FollowUpRunRecord> {
    const existing = await this.context.store.followUps.findRunByLead(leadId, this.getSequence().slug);
    if (existing) {
      return existing;
    }

    return this.context.store.followUps.createRun({
      leadId,
      sequenceSlug: this.getSequence().slug,
      sequenceVersion: 1,
      status: 'active',
      currentStep: 0,
      attemptCount: 0,
      context: {
        createdBy: 'qualification-engine'
      },
      nextRunAt: new Date()
    });
  }

  async runNextStep(leadId: string): Promise<{
    lead: LeadRecord;
    run: FollowUpRunRecord;
    messageId?: string;
    completed: boolean;
  }> {
    const lead = await this.context.store.leads.findById(leadId);
    if (!lead) {
      throw new Error(`Lead ${leadId} not found`);
    }

    const sequence = this.getSequence();
    const run = await this.ensureRun(leadId);
    if (run.status !== 'active') {
      return { lead, run, completed: true };
    }

    const step = sequence.steps[run.currentStep];
    if (!step) {
      const completed = await this.context.store.followUps.updateRun(run.id, {
        status: 'completed',
        nextRunAt: null
      });
      return { lead, run: completed, completed: true };
    }

    const bookings = await this.context.store.bookings.listBookings(leadId);
    const booking = bookings.find((item) => item.status === 'pending' || item.status === 'confirmed');
    const bookingLink = booking?.meetingLink ?? '';
    const variables = buildVariables(lead, bookingLink);
    const channel = selectChannel(step.channel, lead) as string;
    const messageChannel = (channel === 'note' ? 'note' : channel) as 'email' | 'whatsapp' | 'sms' | 'note';

    if (channel === 'note') {
      await this.context.store.leads.addActivity(leadId, {
        type: 'followup.skipped',
        channel: 'note',
        title: 'Follow-up skipped',
        body: `No outbound contact channel available for step ${step.id}.`,
        metadata: {
          stepId: step.id,
          reason: 'no-contact-channel'
        }
      });

      const updatedRun = await this.context.store.followUps.updateRun(run.id, {
        currentStep: run.currentStep + 1,
        attemptCount: run.attemptCount + 1,
        lastRunAt: new Date(),
        nextRunAt: run.currentStep + 1 < sequence.steps.length ? addHours(new Date(), sequence.steps[run.currentStep + 1]?.delayHours ?? 0) : null
      });

      return { lead, run: updatedRun, completed: run.currentStep + 1 >= sequence.steps.length };
    }

    const followupPrompt = await this.promptService.getActive('followup');
    const templateSubject = renderTemplate(step.subject, variables);
    const fallbackBody = renderTemplate(step.body, variables);

    let body = fallbackBody;
    let provider = 'template';
    let messageId: string | undefined;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < step.retryAttempts; attempt += 1) {
      try {
        const llmResponse = await this.context.llm.complete({
          task: 'followup',
          system: followupPrompt.content,
          messages: [
            {
              role: 'user',
              content: JSON.stringify({
                lead,
                step,
                bookingLink,
                intent: lead.intent ?? lead.intentHint ?? '',
                summary: lead.summary ?? ''
              })
            }
          ],
          responseFormat: 'text',
          metadata: { lead, step, bookingLink }
        });

        body = trimOrNull(llmResponse.text) ?? fallbackBody;
        provider = llmResponse.provider;

        await this.context.store.llm.createExecution({
          leadId,
          promptVersionId: followupPrompt.id,
          slug: 'followup',
          provider: llmResponse.provider,
          model: llmResponse.model,
          input: { lead, step, bookingLink },
          output: { body },
          tokensIn: llmResponse.usage?.inputTokens ?? null,
          tokensOut: llmResponse.usage?.outputTokens ?? null,
          success: true
        });

        const message = await this.context.store.messages.createMessage({
          leadId,
          followUpRunId: run.id,
          channel: messageChannel,
          direction: 'outbound',
          status: 'queued',
          subject: templateSubject,
          body,
          provider,
          scheduledFor: new Date(),
          attempt,
          metadata: {
            stepId: step.id,
            fallbackBody
          }
        });

        messageId = message.id;

        if (channel === 'email') {
          const delivery = await this.context.messaging.sendEmail({
            to: lead.email as string,
            subject: templateSubject,
            body,
            leadId,
            metadata: { stepId: step.id, bookingLink }
          });
          await this.context.store.messages.updateMessage(message.id, {
            status: delivery.status === 'sent' ? 'sent' : 'queued',
            externalId: delivery.externalId,
            sentAt: delivery.status === 'sent' ? new Date() : null,
            provider: delivery.provider
          });
        } else if (channel === 'whatsapp') {
          const delivery = await this.context.messaging.sendWhatsapp({
            to: lead.phone as string,
            subject: templateSubject,
            body,
            leadId,
            metadata: { stepId: step.id, bookingLink }
          });
          await this.context.store.messages.updateMessage(message.id, {
            status: delivery.status === 'sent' ? 'sent' : 'queued',
            externalId: delivery.externalId,
            sentAt: delivery.status === 'sent' ? new Date() : null,
            provider: delivery.provider
          });
        }

        break;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown follow-up error');
        if (attempt === step.retryAttempts - 1) {
          await this.context.store.llm.createExecution({
            leadId,
            promptVersionId: followupPrompt.id,
            slug: 'followup',
            provider: this.context.llm.provider,
            model: null,
            input: { lead, step, bookingLink },
            output: { error: lastError.message },
            success: false,
            error: lastError.message
          });
        }
      }
    }

    if (!messageId) {
      const fallbackMessage = await this.context.store.messages.createMessage({
        leadId,
        followUpRunId: run.id,
        channel: messageChannel,
        direction: 'outbound',
        status: 'failed',
        subject: templateSubject,
        body: fallbackBody,
        provider: this.context.llm.provider,
        error: lastError?.message ?? 'Unable to send follow-up',
        metadata: {
          stepId: step.id,
          fallbackBody
        }
      });
      messageId = fallbackMessage.id;
    }

    await this.context.store.leads.addActivity(leadId, {
      type: 'followup.sent',
      channel: messageChannel,
      title: `Follow-up step ${step.id} sent`,
      body,
      metadata: {
        stepId: step.id,
        bookingLink,
        messageId
      }
    });

    const nextStep = sequence.steps[run.currentStep + 1];
    const updatedRun = await this.context.store.followUps.updateRun(run.id, {
      currentStep: run.currentStep + 1,
      attemptCount: run.attemptCount + 1,
      lastRunAt: new Date(),
      nextRunAt: nextStep ? addHours(new Date(), nextStep.delayHours) : null,
      status: nextStep ? 'active' : 'completed'
    });

    await this.context.store.leads.update(leadId, {
      nextFollowUpAt: nextStep ? addHours(new Date(), nextStep.delayHours) : null
    });

    return {
      lead,
      run: updatedRun,
      messageId,
      completed: !nextStep
    };
  }
}
