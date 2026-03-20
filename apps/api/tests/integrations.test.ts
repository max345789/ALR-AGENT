import { afterEach, describe, expect, it } from 'vitest';

import { buildTestApp } from './helpers.js';

describe('integrations', () => {
  afterEach(() => {
    // No shared state to reset here; the test app is disposed per test.
  });

  it('returns the onboarding endpoints and snippets', async () => {
    const { app, container } = await buildTestApp();

    try {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/integrations'
      });

      expect(response.statusCode).toBe(200);
      const body = response.json() as {
        captureEndpoint: string;
        webhookEndpoint: string;
        connectors: Array<{ name: string; status: string }>;
        snippets: Array<{ title: string; code: string }>;
      };

      expect(body.captureEndpoint).toContain('/api/v1/leads');
      expect(body.webhookEndpoint).toContain('/api/v1/webhooks/leads');
      expect(body.connectors.some((connector) => connector.name === 'Website form')).toBe(true);
      expect(body.connectors.some((connector) => connector.status === 'recommended')).toBe(true);
      expect(body.snippets.some((snippet) => snippet.title === 'cURL example')).toBe(true);
    } finally {
      await app.close();
      await container.dispose();
    }
  });
});
