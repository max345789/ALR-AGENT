import { createAgentContainer } from './container.js';
import { createJobWorker } from '../core/queue/index.js';
import { env } from '../config/env.js';

async function main() {
  const container = await createAgentContainer();
  const worker = await createJobWorker(async (name, payload) => {
    switch (name) {
      case 'lead.qualify':
        if ('leadId' in payload) await container.services.qualificationService.qualifyLead(payload.leadId);
        break;
      case 'lead.followup':
        if ('leadId' in payload) await container.services.followUpService.runNextStep(payload.leadId);
        break;
      case 'lead.book':
        if ('leadId' in payload) await container.services.bookingService.prepareBookingOffer(payload.leadId);
        break;
      case 'analytics.daily':
        if ('date' in payload) await container.services.analyticsService.dailyReport(new Date(payload.date));
        break;
      case 'optimization.daily':
        if ('date' in payload) await container.services.optimizationService.run(new Date(payload.date));
        break;
      default:
        break;
    }
  });

  if (!worker) {
    console.warn('Redis is not configured. Worker started in no-op mode.');
    await container.dispose();
    return;
  }

  console.log(`Worker listening using Redis ${env.REDIS_URL}`);

  const close = async () => {
    await worker.close();
    await container.dispose();
  };

  process.on('SIGINT', () => {
    void close().finally(() => process.exit(0));
  });
  process.on('SIGTERM', () => {
    void close().finally(() => process.exit(0));
  });
}

void main().catch((error) => {
  console.error(error);
  process.exit(1);
});
