import { afterEach, describe, expect, it } from 'vitest';

import { buildTestContainer } from './helpers.js';

describe('qualification engine', () => {
  it('produces a structured score and records the prompt execution', async () => {
    const container = await buildTestContainer();

    try {
      const lead = await container.context.store.leads.create({
        source: 'api',
        firstName: 'Jordan',
        lastName: 'Lee',
        email: 'jordan@example.com',
        company: 'Acme Co',
        jobTitle: 'VP Sales',
        message: 'We need pricing for an enterprise rollout next week.',
        intentHint: 'enterprise pricing'
      });

      const outcome = await container.services.qualificationService.qualifyLead(lead.id);
      expect(outcome.result.score).toBeGreaterThan(0);
      expect(outcome.lead.score).toBe(outcome.result.score);
      expect(['hot', 'warm', 'cold']).toContain(outcome.result.segment);

      const executions = await container.context.store.llm.listExecutions(lead.id);
      expect(executions.length).toBeGreaterThan(0);
      expect(executions[0]?.slug).toBe('qualification');
    } finally {
      await container.dispose();
    }
  });
});
