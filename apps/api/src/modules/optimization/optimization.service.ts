import { z } from 'zod';

import type { AppContext } from '../../core/context.js';
import { PromptService } from '../prompts/prompt.service.js';
import { env } from '../../config/env.js';
import type { LeadRecord } from '../../core/store/types.js';
import { parseStructuredJson } from '../../core/llm/index.js';

const optimizationResultSchema = z.object({
  insights: z.array(z.string().min(1)).default([]),
  experiments: z.array(z.string().min(1)).default([]),
  promptPatch: z.string().min(1),
  confidence: z.number().min(0).max(1),
  recommendedTags: z.array(z.string().min(1)).default([])
});

interface OptimizationSummary {
  totalLeads: number;
  won: number;
  booked: number;
  lost: number;
  hot: number;
  warm: number;
  cold: number;
  topTags: string[];
  topSources: Array<{ source: string; count: number }>;
}

function countBy<T extends string>(items: T[]): Array<{ value: string; count: number }> {
  const counts = items.reduce<Record<string, number>>((acc, item) => {
    acc[item] = (acc[item] ?? 0) + 1;
    return acc;
  }, {});

  return Object.entries(counts)
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count);
}

function topTags(leads: LeadRecord[], limit = 5): string[] {
  const counts = countBy(leads.flatMap((lead) => lead.tags));
  return counts.slice(0, limit).map((entry) => entry.value);
}

function buildSummary(leads: LeadRecord[]): OptimizationSummary {
  const won = leads.filter((lead) => lead.status === 'won').length;
  const booked = leads.filter((lead) => lead.status === 'booked').length;
  const lost = leads.filter((lead) => lead.status === 'lost' || lead.status === 'disqualified').length;
  const hot = leads.filter((lead) => lead.segment === 'hot').length;
  const warm = leads.filter((lead) => lead.segment === 'warm').length;
  const cold = leads.filter((lead) => lead.segment === 'cold').length;
  const topSources = countBy(leads.map((lead) => lead.source)).map(({ value, count }) => ({ source: value, count }));

  return {
    totalLeads: leads.length,
    won,
    booked,
    lost,
    hot,
    warm,
    cold,
    topTags: topTags(leads),
    topSources
  };
}

function fallbackOptimization(summary: OptimizationSummary) {
  const insights = [
    `Hot leads currently represent ${summary.hot} of ${summary.totalLeads} leads.`,
    `The strongest sources are ${summary.topSources.slice(0, 3).map((entry) => `${entry.source} (${entry.count})`).join(', ') || 'not enough data yet'}.`,
    `The most common tags are ${summary.topTags.slice(0, 3).join(', ') || 'not enough data yet'}.`
  ];

  return {
    insights,
    experiments: [
      'Reduce first-touch length for high-intent leads.',
      'Prioritize booking links in the first follow-up for hot leads.',
      'Mirror the top pain point in the qualification summary.'
    ],
    promptPatch:
      'When a lead is hot or warm, emphasize urgency, clear next steps, and an immediate booking option. Keep the response concise and specific.',
    confidence: summary.totalLeads >= 5 ? 0.78 : 0.62,
    recommendedTags: ['high-intent', 'fast-follow-up', 'booking-ready']
  };
}

export class OptimizationService {
  constructor(private readonly context: AppContext, private readonly promptService: PromptService) {}

  async run(date = new Date()): Promise<{
    summary: OptimizationSummary;
    result: z.infer<typeof optimizationResultSchema>;
    promptVersionId?: string;
    memoryId?: string;
  }> {
    const leads = await this.context.store.leads.list({ limit: 1000 });
    const summary = buildSummary(leads);
    const optimizationPrompt = await this.promptService.getActive('optimization');
    const qualificationPrompt = await this.promptService.getActive('qualification');
    let result = fallbackOptimization(summary);

    try {
      const response = await this.context.llm.complete({
        task: 'optimization',
        system: optimizationPrompt.content,
        messages: [
          {
            role: 'user',
            content: JSON.stringify({
              date: date.toISOString(),
              summary,
              sampleLeads: leads.slice(0, 20).map((lead) => ({
                id: lead.id,
                segment: lead.segment,
                status: lead.status,
                score: lead.score,
                tags: lead.tags,
                source: lead.source,
                intent: lead.intent,
                summary: lead.summary
              }))
            })
          }
        ],
        responseFormat: 'json',
        metadata: { summary }
      });

      result = optimizationResultSchema.parse(parseStructuredJson(response));
      await this.context.store.llm.createExecution({
        slug: 'optimization',
        provider: response.provider,
        model: response.model,
        input: { summary },
        output: result,
        tokensIn: response.usage?.inputTokens ?? null,
        tokensOut: response.usage?.outputTokens ?? null,
        success: true
      });
    } catch (error) {
      await this.context.store.llm.createExecution({
        slug: 'optimization',
        provider: this.context.llm.provider,
        model: null,
        input: { summary },
        output: result,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown optimization error'
      });
    }

    const memory = await this.context.store.memory.create({
      key: 'optimization-insight',
      value: {
        summary,
        result
      },
      score: result.confidence,
      source: 'optimization-service'
    });

    if (env.AUTO_PROMOTION && result.confidence >= 0.75 && result.promptPatch.trim().length > 0) {
      const nextContent = `${qualificationPrompt.content}\n\n${result.promptPatch.trim()}`;
      const version = await this.promptService.createVersion('qualification', `${qualificationPrompt.title} - optimized`, nextContent, true);
      await this.context.store.analytics.createEvent({
        type: 'optimization.prompt.updated',
        value: result.confidence,
        metadata: {
          promptVersionId: version.id,
          qualificationPromptVersion: qualificationPrompt.version
        }
      });
      return {
        summary,
        result,
        promptVersionId: version.id,
        memoryId: memory.id
      };
    }

    return {
      summary,
      result,
      memoryId: memory.id
    };
  }
}
