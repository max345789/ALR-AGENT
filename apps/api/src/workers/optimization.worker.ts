import { Worker } from 'bullmq';
import { redis } from '../queues/index.js';
import { runOptimizationLoop } from '../modules/optimization/optimization.service.js';
import { logger } from '../utils/logger.js';
import type { OptimizationJob } from '../queues/index.js';

export function startOptimizationWorker() {
  const worker = new Worker<OptimizationJob>(
    'optimization',
    async (job) => {
      logger.info({ jobId: job.id }, 'Running optimization loop');
      await runOptimizationLoop();
    },
    { connection: redis, concurrency: 1 }
  );

  worker.on('completed', job => logger.info({ jobId: job.id }, 'Optimization job completed'));
  worker.on('failed', (job, err) => logger.error({ jobId: job?.id, err }, 'Optimization job failed'));
  return worker;
}
