import { env } from '../../config/env.js';
import { logger } from '../../utils/logger.js';

export interface SendWhatsAppOptions {
  to: string;
  body: string;
}

async function sendViaWhatsAppCloud(opts: SendWhatsAppOptions) {
  const res = await fetch(`${env.WHATSAPP_API_URL}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${env.WHATSAPP_API_TOKEN}`
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: opts.to,
      type: 'text',
      text: { body: opts.body }
    })
  });
  if (!res.ok) {
    throw new Error(`WhatsApp API error: ${res.status} ${await res.text()}`);
  }
}

export async function sendWhatsApp(opts: SendWhatsAppOptions): Promise<void> {
  if (env.WHATSAPP_PROVIDER === 'whatsapp_cloud') {
    await sendViaWhatsAppCloud(opts);
    logger.info({ to: opts.to }, 'WhatsApp message sent');
  } else {
    logger.info({ to: opts.to, body: opts.body }, '[stub-whatsapp] Message logged');
  }
}
