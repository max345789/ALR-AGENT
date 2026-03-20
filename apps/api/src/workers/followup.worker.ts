import { Worker } from 'bullmq';
import { redis } from '../queues/index.js';
import { processFollowUpTask } from '../modules/followup/followup.service.js';
import { logger } from '../utils/logger.js';
import type { FollowUpJob } from '../queues/index.js';

export function startFollowUpWorker() {
  const worker = new Worker<FollowUpJob>(
    'follow-up',
    async (job) => {
      logger.info({ jobId: job.id, taskId: job.data.taskId }, 'Processing follow-up job');
      await processFollowUpTask(job.data.taskId);
    },
    { connection: redis, concurrency: 10 }
  );

  worker.on('completed', job => logger.info({ jobId: job.id }, 'Follow-up job completed'));
  worker.on('failed', (job, err) => logger.error({ jobId: job?.id, err }, 'Follow-up job failed'));
  return worker;
}
