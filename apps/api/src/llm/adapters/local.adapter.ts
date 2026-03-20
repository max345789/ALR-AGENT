import OpenAI from 'openai';
import { env } from '../../config/env.js';
import type { LLMAdapter, LLMCompletionRequest, LLMCompletionResponse } from '../types.js';

export class LocalLLMAdapter implements LLMAdapter {
  private client: OpenAI;
  private model: string;

  constructor() {
    this.client = new OpenAI({ apiKey: 'local', baseURL: env.LOCAL_LLM_BASE_URL });
    this.model = env.LLM_MODEL ?? 'llama3';
  }

  name() { return 'local'; }

  async complete(req: LLMCompletionRequest): Promise<LLMCompletionResponse> {
    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: req.messages,
      temperature: req.temperature ?? 0.3,
      max_tokens: req.maxTokens ?? 1024
    });
    const choice = response.choices[0];
    return {
      content: choice?.message.content ?? '',
      model: response.model,
      provider: 'local',
      usage: {
        promptTokens: response.usage?.prompt_tokens ?? 0,
        completionTokens: response.usage?.completion_tokens ?? 0
      }
    };
  }
}
