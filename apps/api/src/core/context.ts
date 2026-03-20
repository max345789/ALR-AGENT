import type { AgentStore } from './store/index.js';
import type { CalendarGateway } from './calendar/index.js';
import type { LlmAdapter } from './llm/index.js';
import type { MessagingGateway } from './messaging/index.js';
import type { JobQueue } from './queue/index.js';

export interface AppContext {
  store: AgentStore;
  llm: LlmAdapter;
  messaging: MessagingGateway;
  calendar: CalendarGateway;
  queue: JobQueue;
}

export interface ServiceDependencies extends AppContext {
  appUrl: string;
  adminApiKey?: string;
}
