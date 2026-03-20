import { Worker } from 'bullmq';
import { redis } from '../queues/index.js';
import { qualifyLead } from '../modules/qualification/qualification.service.js';
import { logger } from '../utils/logger.js';
import type { QualificationJob } from '../queues/index.js';

export function startQualificationWorker() {
  const worker = new Worker<QualificationJob>(
    'qualification',
    async (job) => {
      logger.info({ jobId: job.id, leadId: job.data.leadId }, 'Processing qualification job');
      await qualifyLead(job.data.leadId);
    },
    { connection: redis, concurrency: 5 }
  );

  worker.on('completed', job => logger.info({ jobId: job.id }, 'Qualification job completed'));
  worker.on('failed', (job, err) => logger.error({ jobId: job?.id, err }, 'Qualification job failed'));
  return worker;
}
