import { env } from '../config/env.js';
import type { LLMAdapter } from './types.js';
import { OpenAIAdapter } from './adapters/openai.adapter.js';
import { AnthropicAdapter } from './adapters/anthropic.adapter.js';
import { LocalLLMAdapter } from './adapters/local.adapter.js';
import { MockLLMAdapter } from './adapters/mock.adapter.js';

let _adapter: LLMAdapter | null = null;

export function getLLMAdapter(): LLMAdapter {
  if (_adapter) return _adapter;
  switch (env.LLM_PROVIDER) {
    case 'openai': _adapter = new OpenAIAdapter(); break;
    case 'anthropic': _adapter = new AnthropicAdapter(); break;
    case 'local': _adapter = new LocalLLMAdapter(); break;
    default: _adapter = new MockLLMAdapter();
  }
  return _adapter;
}

export type { LLMAdapter, LLMCompletionRequest, LLMCompletionResponse } from './types.js';
