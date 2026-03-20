import type { FastifyInstance } from 'fastify';

import type { AgentServices } from '../bootstrap/container.js';
import { registerHealthRoutes } from './health.routes.js';
import { registerLeadsRoutes } from './leads.routes.js';
import { registerWebhookRoutes } from './webhooks.routes.js';
import { registerBookingRoutes } from './bookings.routes.js';
import { registerAnalyticsRoutes } from './analytics.routes.js';
import { registerPromptsRoutes } from './prompts.routes.js';
import { registerCrmRoutes } from './crm.routes.js';
import { registerAuthRoutes } from './auth.routes.js';
import { registerBillingRoutes } from './billing.routes.js';
import { registerCronRoutes } from './cron.routes.js';

export async function registerRoutes(app: FastifyInstance, services: AgentServices) {
  await registerHealthRoutes(app);
  await registerLeadsRoutes(app, services);
  await registerWebhookRoutes(app, services);
  await registerBookingRoutes(app, services);
  await registerAnalyticsRoutes(app, services);
  await registerPromptsRoutes(app, services);
  await registerCrmRoutes(app, services);
  await registerAuthRoutes(app, services);
  await registerBillingRoutes(app, services);
  await registerCronRoutes(app, services);
}
