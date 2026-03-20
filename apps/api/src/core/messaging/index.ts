import { randomUUID } from 'node:crypto';

import type { Channel } from '@alr/shared';

import { env } from '../../config/env.js';
import { deliverEmail } from './email-provider.js';

export interface MessageDeliveryInput {
  to: string;
  subject?: string;
  body: string;
  leadId: string;
  metadata?: Record<string, unknown>;
}

export interface MessageDeliveryResult {
  provider: string;
  channel: Channel;
  externalId: string;
  status: 'sent' | 'queued';
  raw?: unknown;
}

export interface MessagingGateway {
  sendEmail(input: MessageDeliveryInput): Promise<MessageDeliveryResult>;
  sendWhatsapp(input: MessageDeliveryInput): Promise<MessageDeliveryResult>;
}

class ConsoleMessagingGateway implements MessagingGateway {
  async sendEmail(input: MessageDeliveryInput): Promise<MessageDeliveryResult> {
    console.info('[email]', {
      to: input.to,
      subject: input.subject,
      body: input.body,
      leadId: input.leadId,
      metadata: input.metadata ?? {}
    });
    return {
      provider: 'console',
      channel: 'email',
      externalId: `console-${randomUUID()}`,
      status: 'queued'
    };
  }

  async sendWhatsapp(input: MessageDeliveryInput): Promise<MessageDeliveryResult> {
    console.info('[whatsapp]', {
      to: input.to,
      body: input.body,
      leadId: input.leadId,
      metadata: input.metadata ?? {}
    });
    return {
      provider: 'console',
      channel: 'whatsapp',
      externalId: `console-${randomUUID()}`,
      status: 'queued'
    };
  }
}

class SmtpMessagingGateway implements MessagingGateway {
  async sendEmail(input: MessageDeliveryInput): Promise<MessageDeliveryResult> {
    const response = await deliverEmail({
      ...input,
      subject: input.subject ?? 'Follow-up'
    });

    return {
      provider: response.provider,
      channel: response.channel,
      externalId: response.externalId,
      status: response.status,
      raw: response.raw
    };
  }

  async sendWhatsapp(input: MessageDeliveryInput): Promise<MessageDeliveryResult> {
    console.warn('SMTP gateway cannot send WhatsApp messages. Falling back to console.');
    return new ConsoleMessagingGateway().sendWhatsapp(input);
  }
}

class WebhookMessagingGateway implements MessagingGateway {
  constructor(private readonly whatsappWebhookUrl?: string) {}

  async sendEmail(input: MessageDeliveryInput): Promise<MessageDeliveryResult> {
    const response = await deliverEmail({
      ...input,
      subject: input.subject ?? 'Follow-up'
    });

    return {
      provider: response.provider,
      channel: response.channel,
      externalId: response.externalId,
      status: response.status,
      raw: response.raw
    };
  }

  async sendWhatsapp(input: MessageDeliveryInput): Promise<MessageDeliveryResult> {
    if (!this.whatsappWebhookUrl) {
      return new ConsoleMessagingGateway().sendWhatsapp(input);
    }

    const response = await fetch(this.whatsappWebhookUrl, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(env.WHATSAPP_API_TOKEN ? { authorization: `Bearer ${env.WHATSAPP_API_TOKEN}` } : {})
      },
      body: JSON.stringify({
        channel: 'whatsapp',
        to: input.to,
        body: input.body,
        leadId: input.leadId,
        metadata: input.metadata ?? {}
      })
    });

    const text = await response.text();
    if (!response.ok) {
      throw new Error(`WhatsApp webhook failed (${response.status}): ${text}`);
    }

    return {
      provider: 'webhook',
      channel: 'whatsapp',
      externalId: `webhook-${randomUUID()}`,
      status: 'sent',
      raw: text
    };
  }
}

export function createMessagingGateway(): MessagingGateway {
  switch (env.EMAIL_PROVIDER) {
    case 'smtp':
      return new SmtpMessagingGateway();
    case 'webhook':
      return new WebhookMessagingGateway(env.WHATSAPP_API_URL);
    case 'console':
      return new ConsoleMessagingGateway();
    default: {
      const exhausted: never = env.EMAIL_PROVIDER;
      throw new Error(`Unsupported email provider: ${exhausted}`);
    }
  }
}
