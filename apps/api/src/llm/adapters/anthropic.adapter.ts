import Anthropic from '@anthropic-ai/sdk';
import { env } from '../../config/env.js';
import type { LLMAdapter, LLMCompletionRequest, LLMCompletionResponse } from '../types.js';

export class AnthropicAdapter implements LLMAdapter {
  private client: Anthropic;
  private model: string;

  constructor() {
    this.client = new Anthropic({
      apiKey: env.ANTHROPIC_API_KEY,
      baseURL: env.ANTHROPIC_BASE_URL
    });
    this.model = env.LLM_MODEL ?? 'claude-sonnet-4-6';
  }

  name() { return 'anthropic'; }

  async complete(req: LLMCompletionRequest): Promise<LLMCompletionResponse> {
    const system = req.messages.find(m => m.role === 'system')?.content;
    const messages = req.messages
      .filter(m => m.role !== 'system')
      .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }));

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: req.maxTokens ?? 1024,
      system,
      messages
    });

    const textBlock = response.content.find(b => b.type === 'text');
    return {
      content: textBlock?.type === 'text' ? textBlock.text : '',
      model: response.model,
      provider: 'anthropic',
      usage: {
        promptTokens: response.usage.input_tokens,
        completionTokens: response.usage.output_tokens
      }
    };
  }
}
