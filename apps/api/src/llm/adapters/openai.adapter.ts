import OpenAI from 'openai';
import { env } from '../../config/env.js';
import type { LLMAdapter, LLMCompletionRequest, LLMCompletionResponse } from '../types.js';

export class OpenAIAdapter implements LLMAdapter {
  private client: OpenAI;
  private model: string;

  constructor() {
    this.client = new OpenAI({
      apiKey: env.OPENAI_API_KEY,
      baseURL: env.OPENAI_BASE_URL
    });
    this.model = env.LLM_MODEL ?? 'gpt-4o-mini';
  }

  name() { return 'openai'; }

  async complete(req: LLMCompletionRequest): Promise<LLMCompletionResponse> {
    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: req.messages,
      temperature: req.temperature ?? 0.3,
      max_tokens: req.maxTokens ?? 1024,
      response_format: req.jsonMode ? { type: 'json_object' } : undefined
    });
    const choice = response.choices[0];
    return {
      content: choice?.message.content ?? '',
      model: response.model,
      provider: 'openai',
      usage: {
        promptTokens: response.usage?.prompt_tokens ?? 0,
        completionTokens: response.usage?.completion_tokens ?? 0
      }
    };
  }
}
