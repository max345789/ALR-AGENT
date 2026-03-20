import { env, runtimeMode } from '../../config/env.js';

export type IntegrationStatus = 'ready' | 'recommended' | 'available';

export interface IntegrationConnector {
  name: string;
  description: string;
  endpoint: string;
  method: 'POST' | 'WEBHOOK' | 'WORKFLOW';
  status: IntegrationStatus;
  handoff: string;
}

export interface IntegrationSnippet {
  title: string;
  language: string;
  code: string;
}

export interface IntegrationOverview {
  appUrl: string;
  captureEndpoint: string;
  webhookEndpoint: string;
  captureKeyHeader: string;
  runtime: {
    database: string;
    redis: string;
    llmProvider: string;
    emailProvider: string;
    whatsappProvider: string;
    calendarProvider: string;
  };
  connectors: IntegrationConnector[];
  snippets: IntegrationSnippet[];
  checklist: string[];
  payloadExample: Record<string, unknown>;
}

function normalizeAppUrl() {
  const trimmed = env.APP_URL.trim().replace(/\/$/, '');
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  return `https://${trimmed}`;
}

function prettyJson(value: Record<string, unknown>) {
  return JSON.stringify(value, null, 2);
}

export function buildIntegrationOverview(): IntegrationOverview {
  const appUrl = normalizeAppUrl();
  const captureEndpoint = new URL('/api/v1/leads', appUrl).toString();
  const webhookEndpoint = new URL('/api/v1/webhooks/leads', appUrl).toString();
  const captureKeyHeader = 'x-alr-capture-key';

  const payloadExample = {
    source: 'integration',
    firstName: 'Ava',
    lastName: 'Patel',
    email: 'ava@example.com',
    company: 'Northwind',
    jobTitle: 'VP of Growth',
    message: 'Requesting a demo and pricing.',
    intentHint: 'Pricing request from connected platform',
    metadata: {
      sourceSystem: 'hubspot',
      campaign: 'spring-launch',
      entryPoint: 'integrations-page'
    }
  };

  const connectors: IntegrationConnector[] = [
    {
      name: 'Website form',
      description: 'Send submissions from your public site or app directly into the lead pipeline.',
      endpoint: captureEndpoint,
      method: 'POST',
      status: 'ready',
      handoff: 'Use the capture endpoint in your form action, frontend fetch call, or form builder webhook.'
    },
    {
      name: 'REST API',
      description: 'Push leads from your backend, CRM job, or data pipeline in JSON format.',
      endpoint: captureEndpoint,
      method: 'POST',
      status: 'ready',
      handoff: 'Post normalized lead data with metadata from any backend service.'
    },
    {
      name: 'Webhook receiver',
      description: 'Receive lead events from tools like HubSpot, Salesforce, or your internal orchestration layer.',
      endpoint: webhookEndpoint,
      method: 'WEBHOOK',
      status: 'ready',
      handoff: 'Forward the external payload and let the agent store the original source metadata.'
    },
    {
      name: 'Zapier / Make',
      description: 'No-code automations can transform events from one platform and relay them into the agent.',
      endpoint: captureEndpoint,
      method: 'WORKFLOW',
      status: 'recommended',
      handoff: 'Trigger on form submission or CRM updates, then send the mapped payload to the capture endpoint.'
    },
    {
      name: 'HubSpot / Salesforce',
      description: 'CRM systems can stream lead records into the agent through webhooks or automation steps.',
      endpoint: webhookEndpoint,
      method: 'WEBHOOK',
      status: 'recommended',
      handoff: 'Map contact and opportunity fields, then forward them to the webhook receiver.'
    },
    {
      name: 'Custom app / SDK',
      description: 'Any internal product or private application can hand off leads with the same contract.',
      endpoint: captureEndpoint,
      method: 'POST',
      status: 'available',
      handoff: 'Re-use the same payload schema everywhere so the agent stays model-agnostic and portable.'
    }
  ];

  const snippets: IntegrationSnippet[] = [
    {
      title: 'cURL example',
      language: 'bash',
      code: `curl -X POST "${captureEndpoint}" \\
  -H "Content-Type: application/json" \\
  -H "${captureKeyHeader}: <your capture key>" \\
  -d '${prettyJson(payloadExample)}'`
    },
    {
      title: 'Fetch example',
      language: 'typescript',
      code: `await fetch("${captureEndpoint}", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "${captureKeyHeader}": "<your capture key>"
  },
  body: JSON.stringify(${prettyJson(payloadExample)})
});`
    },
    {
      title: 'Webhook payload',
      language: 'json',
      code: prettyJson({
        ...payloadExample,
        source: 'webhook',
        externalId: 'crm-contact-123'
      })
    }
  ];

  const checklist = [
    'Create Google OAuth credentials if you want Google sign-in.',
    'Set a production email provider and verified sender for real inbox delivery.',
    'Connect a live calendar provider if you want booking sync outside local mode.',
    'Copy your capture key from Billing and send it as the x-alr-capture-key header.',
    'Point your website, CRM, or automation tool at the capture endpoint.',
    'Set production domain and runtime env vars when you leave localhost.'
  ];

  return {
    appUrl,
    captureEndpoint,
    webhookEndpoint,
    captureKeyHeader,
    runtime: {
      database: runtimeMode.usesDatabase ? 'postgres' : 'memory',
      redis: runtimeMode.usesRedis ? 'redis' : 'in-memory',
      llmProvider: env.LLM_PROVIDER,
      emailProvider: env.EMAIL_PROVIDER,
      whatsappProvider: env.WHATSAPP_PROVIDER,
      calendarProvider: env.CALENDAR_PROVIDER
    },
    connectors,
    snippets,
    checklist,
    payloadExample
  };
}
