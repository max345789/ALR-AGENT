import type { LLMAdapter, LLMCompletionRequest, LLMCompletionResponse } from '../types.js';
import type { QualificationResult } from '@alr/shared';

const MOCK_QUALIFICATION: QualificationResult = {
  score: 72,
  segment: 'warm',
  intent: 'Interested in product demo',
  confidence: 0.85,
  summary: 'Lead shows strong buying signals with clear intent to evaluate.',
  painPoints: ['Manual processes', 'Scaling issues'],
  objections: ['Pricing concerns'],
  tags: ['demo-ready', 'mid-market'],
  recommendedNextStep: 'Book a 30-minute discovery call',
  bookingRecommended: true,
  followUpDelayHours: 24
};

export class MockLLMAdapter implements LLMAdapter {
  name() { return 'mock'; }

  async complete(req: LLMCompletionRequest): Promise<LLMCompletionResponse> {
    const lastMessage = req.messages[req.messages.length - 1]?.content ?? '';
    let content: string;

    if (lastMessage.includes('optimization') || lastMessage.includes('analyze')) {
      content = JSON.stringify({
        insights: 'Hot leads that mention budget close 3x more. Leads from API source convert highest.',
        experiments: ['Add budget qualifier to follow-up step 2'],
        promptPatch: 'Always ask about budget timeline in first touch.',
        confidence: 0.78,
        recommendedTags: ['budget-qualified', 'high-intent']
      });
    } else if (lastMessage.includes('follow') || lastMessage.includes('message')) {
      content = 'Hi {{firstName}}, just wanted to follow up on your inquiry. I think we can help you achieve your goals quickly. Would you like to hop on a quick call this week?';
    } else {
      content = JSON.stringify(MOCK_QUALIFICATION);
    }

    return { content, model: 'mock-v1', provider: 'mock', usage: { promptTokens: 0, completionTokens: 0 } };
  }
}
