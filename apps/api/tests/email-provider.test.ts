import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => {
  vi.resetModules();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('email provider', () => {
  it('uses the console provider in local mode', async () => {
    vi.stubEnv('EMAIL_PROVIDER', 'console');
    vi.stubEnv('EMAIL_FROM', 'lead-agent@example.com');

    const { deliverEmail } = await import('../src/core/messaging/email-provider.js');

    const delivery = await deliverEmail({
      to: 'test@example.com',
      subject: 'Hello',
      body: 'World'
    });

    expect(delivery.provider).toBe('console');
    expect(delivery.status).toBe('queued');
    expect(delivery.externalId.startsWith('console-')).toBe(true);
  });

  it('fails closed when SMTP is selected without SMTP_HOST', async () => {
    vi.stubEnv('EMAIL_PROVIDER', 'smtp');
    vi.stubEnv('SMTP_HOST', '');
    vi.stubEnv('EMAIL_FROM', 'lead-agent@example.com');

    const { deliverEmail } = await import('../src/core/messaging/email-provider.js');

    await expect(
      deliverEmail({
        to: 'test@example.com',
        subject: 'Hello',
        body: 'World'
      })
    ).rejects.toThrow('SMTP_HOST must be configured when EMAIL_PROVIDER=smtp');
  });

  it('fails closed when webhook delivery is selected without EMAIL_WEBHOOK_URL', async () => {
    vi.stubEnv('EMAIL_PROVIDER', 'webhook');
    vi.stubEnv('EMAIL_WEBHOOK_URL', '');
    vi.stubEnv('EMAIL_FROM', 'lead-agent@example.com');

    const { deliverEmail } = await import('../src/core/messaging/email-provider.js');

    await expect(
      deliverEmail({
        to: 'test@example.com',
        subject: 'Hello',
        body: 'World'
      })
    ).rejects.toThrow('EMAIL_WEBHOOK_URL must be configured when EMAIL_PROVIDER=webhook');
  });
});
