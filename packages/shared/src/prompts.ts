import { PromptSeed, FollowUpSequenceDefinition } from './domain.js';

export const DEFAULT_PROMPTS: PromptSeed[] = [
  {
    slug: 'qualification',
    version: 1,
    title: 'Lead qualification v1',
    active: true,
    content: [
      'You are the qualification engine for an autonomous sales system.',
      'Score the lead from 0 to 100, segment it as hot, warm, or cold, and explain the next action.',
      'Return strict JSON with these keys: score, segment, intent, confidence, summary, painPoints, objections, tags, recommendedNextStep, bookingRecommended, followUpDelayHours.',
      'Use the lead context, message, and metadata to infer urgency, budget, authority, and fit.',
      'Prefer concise, business-ready language. Do not return markdown.'
    ].join('\n')
  },
  {
    slug: 'followup',
    version: 1,
    title: 'Follow-up messaging v1',
    active: true,
    content: [
      'You write short, persuasive follow-up messages for qualified leads.',
      'Keep the message human, specific, and focused on a single next action.',
      'Adapt the tone to the lead segment and the available contact channel.',
      'If booking is recommended, drive toward scheduling a meeting in one clear sentence.'
    ].join('\n')
  },
  {
    slug: 'optimization',
    version: 1,
    title: 'Optimization loop v1',
    active: true,
    content: [
      'You analyze closed-loop sales outcomes.',
      'Summarize the patterns behind successful and failed leads.',
      'Return strict JSON with keys: insights, experiments, promptPatch, confidence, recommendedTags.',
      'Make prompt patches concise, additive, and safe to activate automatically.'
    ].join('\n')
  }
];

export const DEFAULT_FOLLOW_UP_SEQUENCE: FollowUpSequenceDefinition = {
  slug: 'default-outreach',
  name: 'Default Outreach Sequence',
  description: 'A three-step autonomous follow-up flow for new qualified leads.',
  active: true,
  steps: [
    {
      id: 'step-1',
      delayHours: 0,
      channel: 'email',
      subject: 'Thanks for reaching out',
      body: 'Thanks for reaching out, {{firstName}}. I reviewed your request and can help you move quickly. Would you like me to send over the best next step or book a short call?',
      retryAttempts: 3,
      fallbackChannel: 'note'
    },
    {
      id: 'step-2',
      delayHours: 24,
      channel: 'whatsapp',
      subject: 'Quick follow-up',
      body: 'Checking in on your goals, {{firstName}}. If timing is right, I can line up a short call and outline the fastest path forward.',
      retryAttempts: 2,
      fallbackChannel: 'email'
    },
    {
      id: 'step-3',
      delayHours: 72,
      channel: 'email',
      subject: 'Last touch',
      body: 'Closing the loop here, {{firstName}}. If this is still a priority, reply with the one outcome that matters most and I will tailor the next step.',
      retryAttempts: 2,
      fallbackChannel: 'note'
    }
  ]
};

