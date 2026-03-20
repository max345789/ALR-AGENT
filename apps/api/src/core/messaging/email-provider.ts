import { randomUUID } from 'node:crypto';

import nodemailer from 'nodemailer';

import { env } from '../../config/env.js';
import { logger } from '../../utils/logger.js';

export interface EmailDeliveryInput {
  to: string;
  subject?: string;
  body: string;
  from?: string;
  leadId?: string;
  metadata?: Record<string, unknown>;
}

export interface EmailDeliveryResult {
  provider: 'console' | 'smtp' | 'webhook';
  channel: 'email';
  externalId: string;
  status: 'sent' | 'queued';
  raw?: unknown;
}

function requiredConfig(name: string, value: string | undefined): string {
  if (!value || value.trim().length === 0) {
    throw new Error(`${name} must be configured when EMAIL_PROVIDER=${env.EMAIL_PROVIDER}`);
  }

  return value;
}

function buildSubject(subject: string | undefined): string {
  return subject?.trim() || 'Follow-up';
}

function buildFromAddress(from: string | undefined): string {
  return from?.trim() || env.EMAIL_FROM;
}

async function sendViaConsole(input: EmailDeliveryInput): Promise<EmailDeliveryResult> {
  logger.info(
    {
      to: input.to,
      subject: buildSubject(input.subject),
      leadId: input.leadId ?? null,
      metadata: input.metadata ?? {},
      body: input.body
    },
    '[console-email] Message logged'
  );

  return {
    provider: 'console',
    channel: 'email',
    externalId: `console-${randomUUID()}`,
    status: 'queued'
  };
}

async function sendViaSmtp(input: EmailDeliveryInput): Promise<EmailDeliveryResult> {
  const host = requiredConfig('SMTP_HOST', env.SMTP_HOST);
  const transport = nodemailer.createTransport({
    host,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    ...(env.SMTP_USER && env.SMTP_PASS
      ? { auth: { user: env.SMTP_USER, pass: env.SMTP_PASS } }
      : {})
  });

  const response = await transport.sendMail({
    from: buildFromAddress(input.from),
    to: input.to,
    subject: buildSubject(input.subject),
    text: input.body
  });

  return {
    provider: 'smtp',
    channel: 'email',
    externalId: response.messageId ?? `smtp-${randomUUID()}`,
    status: 'sent',
    raw: response
  };
}

async function sendViaWebhook(input: EmailDeliveryInput): Promise<EmailDeliveryResult> {
  const webhookUrl = requiredConfig('EMAIL_WEBHOOK_URL', env.EMAIL_WEBHOOK_URL);
  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: {
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      channel: 'email',
      to: input.to,
      from: buildFromAddress(input.from),
      subject: buildSubject(input.subject),
      body: input.body,
      leadId: input.leadId ?? null,
      metadata: input.metadata ?? {}
    })
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Email webhook failed (${response.status}): ${text}`);
  }

  return {
    provider: 'webhook',
    channel: 'email',
    externalId: `webhook-${randomUUID()}`,
    status: 'sent',
    raw: text
  };
}

export async function deliverEmail(input: EmailDeliveryInput): Promise<EmailDeliveryResult> {
  switch (env.EMAIL_PROVIDER) {
    case 'smtp':
      return sendViaSmtp(input);
    case 'webhook':
      return sendViaWebhook(input);
    case 'console':
      return sendViaConsole(input);
    default: {
      const exhausted: never = env.EMAIL_PROVIDER;
      throw new Error(`Unsupported email provider: ${exhausted}`);
    }
  }
}
