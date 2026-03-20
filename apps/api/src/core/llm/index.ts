import { randomUUID } from 'node:crypto';

import type { LeadRecord } from '../store/types.js';
import type { PromptSlug } from '@alr/shared';
import { env } from '../../config/env.js';
import { safeJsonParse } from '../../utils/json.js';
import { checksum } from '../../utils/hash.js';

export interface LlmMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LlmRequest {
  task: PromptSlug | 'custom';
  system: string;
  messages: LlmMessage[];
  model?: string | null;
  temperature?: number;
  maxTokens?: number;
  responseFormat?: 'json' | 'text';
  metadata?: Record<string, unknown>;
}

export interface LlmResponse {
  text: string;
  provider: string;
  model: string;
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
  };
  raw?: unknown;
}

export interface LlmAdapter {
  readonly provider: string;
  complete(request: LlmRequest): Promise<LlmResponse>;
}

function selectModel(request: LlmRequest, fallback: string): string {
  return request.model?.trim() || env.LLM_MODEL?.trim() || fallback;
}

function normalizeLeadFromMetadata(metadata: Record<string, unknown> | undefined): LeadRecord | null {
  const lead = metadata?.lead;
  if (!lead || typeof lead !== 'object' || Array.isArray(lead)) {
    return null;
  }
  const record = lead as Partial<LeadRecord>;
  if (!record.id) {
    return null;
  }
  return {
    id: record.id,
    ownerUserId: record.ownerUserId ?? null,
    externalId: record.externalId ?? null,
    source: record.source ?? 'web',
    firstName: record.firstName ?? null,
    lastName: record.lastName ?? null,
    email: record.email ?? null,
    phone: record.phone ?? null,
    company: record.company ?? null,
    jobTitle: record.jobTitle ?? null,
    message: record.message ?? null,
    intentHint: record.intentHint ?? null,
    status: record.status ?? 'new',
    segment: record.segment ?? 'cold',
    score: record.score ?? 0,
    intent: record.intent ?? null,
    summary: record.summary ?? null,
    tags: record.tags ?? [],
    metadata: record.metadata ?? {},
    ownerName: record.ownerName ?? null,
    notes: record.notes ?? null,
    qualifiedAt: record.qualifiedAt ?? null,
    bookedAt: record.bookedAt ?? null,
    convertedAt: record.convertedAt ?? null,
    nextFollowUpAt: record.nextFollowUpAt ?? null,
    createdAt: record.createdAt ?? new Date(),
    updatedAt: record.updatedAt ?? new Date()
  };
}

function scoreLead(lead: LeadRecord | null, text: string): number {
  const lower = text.toLowerCase();
  let score = 35;
  if (lead?.company) score += 10;
  if (lead?.email) score += 5;
  if (lower.includes('urgent') || lower.includes('asap') || lower.includes('today')) score += 18;
  if (lower.includes('budget') || lower.includes('pricing') || lower.includes('proposal')) score += 12;
  if (lower.includes('book') || lower.includes('meeting') || lower.includes('demo')) score += 12;
  if (lower.includes('enterprise') || lower.includes('team') || lower.includes('scale')) score += 10;
  if (lower.includes('research') || lower.includes('just looking')) score -= 8;
  if (!lead?.company && !lead?.email) score -= 6;
  return Math.max(0, Math.min(100, score));
}

function deriveSegment(score: number): 'hot' | 'warm' | 'cold' {
  if (score >= 80) return 'hot';
  if (score >= 55) return 'warm';
  return 'cold';
}

function buildQualificationMock(lead: LeadRecord | null, request: LlmRequest): string {
  const referenceText = [
    lead?.message,
    lead?.intentHint,
    ...request.messages.map((message) => message.content)
  ]
    .filter(Boolean)
    .join(' ');
  const score = scoreLead(lead, referenceText);
  const segment = deriveSegment(score);
  const urgency = score >= 75 ? 'immediate' : score >= 55 ? 'near-term' : 'long-term';
  const intent = lead?.intentHint || lead?.message?.slice(0, 120) || 'General sales inquiry';
  const summary = `${lead?.firstName ?? 'The lead'} appears to be a ${segment} opportunity with ${urgency} urgency.`;
  const followUpDelayHours = segment === 'hot' ? 1 : segment === 'warm' ? 12 : 48;
  return JSON.stringify({
    score,
    segment,
    intent,
    confidence: segment === 'hot' ? 0.92 : segment === 'warm' ? 0.81 : 0.69,
    summary,
    painPoints: score >= 70 ? ['Speed to implementation', 'Need a clear next step'] : ['Need more clarity', 'Timing and budget'],
    objections: score >= 70 ? ['Comparing options'] : ['Still evaluating'],
    tags: [
      segment,
      urgency,
      ...(lead?.company ? ['company-present'] : ['individual']),
      ...(lead?.email ? ['reachable-email'] : [])
    ].filter(Boolean),
    recommendedNextStep: segment === 'hot' ? 'Book a call today and confirm fit.' : 'Send a tailored follow-up and offer a booking link.',
    bookingRecommended: segment !== 'cold',
    followUpDelayHours
  });
}

function buildFollowUpMock(lead: LeadRecord | null, request: LlmRequest): string {
  const message = request.messages.at(-1)?.content ?? '';
  const firstName = lead?.firstName ?? 'there';
  return [
    `Hi ${firstName},`,
    lead?.segment === 'hot'
      ? 'I reviewed your request and can help move this forward quickly.'
      : 'I wanted to follow up with a concise next step based on your goals.',
    message.length > 0 ? `Context: ${message.slice(0, 140)}` : '',
    lead?.score && lead.score >= 70
      ? 'If useful, I can send a booking link and hold a short slot.'
      : 'If the timing is not right, I can keep this on my radar and send the most relevant update.'
  ]
    .filter(Boolean)
    .join(' ');
}

function buildOptimizationMock(request: LlmRequest): string {
  const payload = request.metadata?.summary;
  const hash = checksum(JSON.stringify(payload ?? request.messages));
  return JSON.stringify({
    insights: [
      'Leads with a concrete company and urgency signal convert faster.',
      'Short first-touch messages perform better than long explanations.',
      'Hot leads should receive a booking link immediately.'
    ],
    experiments: [
      'Test a shorter subject line on hot leads.',
      'Promote booking recommendations for score > 75.',
      'Add a specific pain-point mirror in the first follow-up.'
    ],
    promptPatch: `Update the active prompt to emphasize urgency, company fit, and immediate booking for high-intent leads. Ref:${hash.slice(0, 8)}`,
    confidence: 0.84,
    recommendedTags: ['high-intent', 'fast-follow-up', 'booking-ready']
  });
}

export class MockLlmAdapter implements LlmAdapter {
  readonly provider = 'mock';

  async complete(request: LlmRequest): Promise<LlmResponse> {
    const lead = normalizeLeadFromMetadata(request.metadata);
    const text =
      request.task === 'qualification'
        ? buildQualificationMock(lead, request)
        : request.task === 'followup'
          ? buildFollowUpMock(lead, request)
          : request.task === 'optimization'
            ? buildOptimizationMock(request)
            : request.messages.at(-1)?.content ?? '';

    return {
      text,
      provider: this.provider,
      model: selectModel(request, 'mock-llm'),
      usage: {
        inputTokens: request.messages.reduce((count, message) => count + message.content.split(/\s+/).filter(Boolean).length, 0),
        outputTokens: text.split(/\s+/).filter(Boolean).length
      },
      raw: { mock: true, requestId: randomUUID() }
    };
  }
}

abstract class FetchBasedAdapter implements LlmAdapter {
  constructor(
    public readonly provider: string,
    protected readonly baseUrl: string,
    protected readonly apiKey: string
  ) {}

  protected async readJson(url: string, init: RequestInit): Promise<any> {
    const response = await fetch(url, init);
    if (!response.ok) {
      const body = await response.text();
      throw new Error(`${this.provider} request failed (${response.status}): ${body}`);
    }
    return response.json() as Promise<any>;
  }

  abstract complete(request: LlmRequest): Promise<LlmResponse>;
}

export class OpenAiCompatibleAdapter extends FetchBasedAdapter {
  constructor(baseUrl: string, apiKey: string, provider = 'openai') {
    super(provider, baseUrl.replace(/\/$/, ''), apiKey);
  }

  async complete(request: LlmRequest): Promise<LlmResponse> {
    const model = selectModel(request, 'gpt-4o-mini');
    const payload = {
      model,
      messages: [
        { role: 'system', content: request.system },
        ...request.messages.map((message) => ({ role: message.role, content: message.content }))
      ],
      temperature: request.temperature ?? 0.2,
      max_tokens: request.maxTokens ?? 1024,
      response_format: request.responseFormat === 'json' ? { type: 'json_object' } : undefined
    };

    const data = await this.readJson(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const text = data?.choices?.[0]?.message?.content ?? '';
    return {
      text,
      provider: this.provider,
      model,
      usage: {
        inputTokens: data?.usage?.prompt_tokens,
        outputTokens: data?.usage?.completion_tokens,
        totalTokens: data?.usage?.total_tokens
      },
      raw: data
    };
  }
}

export class AnthropicAdapter extends FetchBasedAdapter {
  constructor(baseUrl: string, apiKey: string) {
    super('anthropic', baseUrl.replace(/\/$/, ''), apiKey);
  }

  async complete(request: LlmRequest): Promise<LlmResponse> {
    const model = selectModel(request, 'claude-3-5-sonnet-latest');
    const data = await this.readJson(`${this.baseUrl}/v1/messages`, {
      method: 'POST',
      headers: {
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        model,
        max_tokens: request.maxTokens ?? 1024,
        system: request.system,
        messages: request.messages.map((message) => ({ role: message.role === 'assistant' ? 'assistant' : 'user', content: message.content })),
        temperature: request.temperature ?? 0.2
      })
    });

    const text = Array.isArray(data?.content)
      ? data.content.map((item: { text?: string }) => item.text ?? '').join('')
      : '';

    return {
      text,
      provider: this.provider,
      model,
      usage: {
        inputTokens: data?.usage?.input_tokens,
        outputTokens: data?.usage?.output_tokens,
        totalTokens: (data?.usage?.input_tokens ?? 0) + (data?.usage?.output_tokens ?? 0)
      },
      raw: data
    };
  }
}

export function createLlmAdapter(): LlmAdapter {
  if (env.LLM_PROVIDER === 'openai' && env.OPENAI_API_KEY) {
    return new OpenAiCompatibleAdapter(env.OPENAI_BASE_URL, env.OPENAI_API_KEY, 'openai');
  }

  if (env.LLM_PROVIDER === 'anthropic' && env.ANTHROPIC_API_KEY) {
    return new AnthropicAdapter(env.ANTHROPIC_BASE_URL, env.ANTHROPIC_API_KEY);
  }

  if (env.LLM_PROVIDER === 'local' && env.LOCAL_LLM_BASE_URL) {
    const apiKey = 'local';
    return new OpenAiCompatibleAdapter(env.LOCAL_LLM_BASE_URL, apiKey, 'local');
  }

  return new MockLlmAdapter();
}

export function parseStructuredJson<T>(response: LlmResponse): T {
  const parsed = safeJsonParse<T>(response.text);
  if (parsed === null) {
    throw new Error(`Invalid structured LLM response from ${response.provider}`);
  }
  return parsed;
}
