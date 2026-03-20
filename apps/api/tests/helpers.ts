import type { AgentContainer } from '../src/bootstrap/container.js';
import { createAgentContainer } from '../src/bootstrap/container.js';
import { createApp } from '../src/bootstrap/app.js';
import { createMemoryStore } from '../src/core/store/memory-store.js';
import { MockLlmAdapter } from '../src/core/llm/index.js';
import type { JobQueue } from '../src/core/queue/index.js';
import type { MessagingGateway } from '../src/core/messaging/index.js';
import type { CalendarGateway } from '../src/core/calendar/index.js';

const noopQueue: JobQueue = {
  async enqueue() {
    return undefined;
  },
  async bootstrap() {
    return undefined;
  },
  async close() {
    return undefined;
  }
};

const noopMessaging: MessagingGateway = {
  async sendEmail(input) {
    return {
      provider: 'noop',
      channel: 'email',
      externalId: `noop-${input.leadId}`,
      status: 'sent'
    };
  },
  async sendWhatsapp(input) {
    return {
      provider: 'noop',
      channel: 'whatsapp',
      externalId: `noop-${input.leadId}`,
      status: 'sent'
    };
  }
};

const localCalendar: CalendarGateway = {
  provider: 'local',
  async findAvailability(request) {
    const start = new Date(Date.now() + 60 * 60 * 1000);
    const end = new Date(start.getTime() + request.slotMinutes * 60 * 1000);
    return [{ start: start.toISOString(), end: end.toISOString(), timezone: request.timezone }];
  },
  generateBookingLink(token) {
    return `http://localhost:3000/book/${token}`;
  }
};

export async function buildTestContainer(): Promise<AgentContainer> {
  return createAgentContainer({
    store: createMemoryStore(),
    llm: new MockLlmAdapter(),
    queue: noopQueue,
    messaging: noopMessaging,
    calendar: localCalendar
  });
}

export async function buildTestApp() {
  const container = await buildTestContainer();
  const app = await createApp(container);
  return { container, app };
}
