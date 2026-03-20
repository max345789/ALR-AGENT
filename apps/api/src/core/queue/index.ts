import { Queue, Worker } from 'bullmq';

import { env, runtimeMode } from '../../config/env.js';

export type JobName =
  | 'lead.qualify'
  | 'lead.followup'
  | 'lead.book'
  | 'analytics.daily'
  | 'optimization.daily';

export interface JobPayloads {
  'lead.qualify': { leadId: string };
  'lead.followup': { leadId: string };
  'lead.book': { leadId: string };
  'analytics.daily': { date: string };
  'optimization.daily': { date: string };
}

export interface JobQueue {
  enqueue<T extends JobName>(name: T, payload: JobPayloads[T], options?: { delay?: number; jobId?: string }): Promise<void>;
  bootstrap(): Promise<void>;
  close(): Promise<void>;
}

export type JobHandler = <T extends JobName>(name: T, payload: JobPayloads[T]) => Promise<void>;

class NoopJobQueue implements JobQueue {
  async enqueue<T extends JobName>(_name: T, _payload: JobPayloads[T]): Promise<void> {
    return undefined;
  }

  async bootstrap(): Promise<void> {
    return undefined;
  }

  async close(): Promise<void> {
    return undefined;
  }
}

class BullJobQueue implements JobQueue {
  private readonly connection = { url: env.REDIS_URL as string } as any;

  private readonly queue = new Queue<any, unknown, JobName>('lead-to-revenue', {
    connection: this.connection
  });

  async enqueue<T extends JobName>(name: T, payload: JobPayloads[T], options?: { delay?: number; jobId?: string }): Promise<void> {
    const jobOptions: Record<string, unknown> = {
      removeOnComplete: true,
      removeOnFail: false
    };
    if (options?.delay !== undefined) {
      jobOptions.delay = options.delay;
    }
    if (options?.jobId !== undefined) {
      jobOptions.jobId = options.jobId;
    }

    await this.queue.add(name as any, payload as any, jobOptions as any);
  }

  async bootstrap(): Promise<void> {
    await this.queue.add(
      'analytics.daily' as any,
      { date: new Date().toISOString() } as any,
      {
        jobId: 'repeat-analytics.daily',
        repeat: { pattern: '0 2 * * *' },
        removeOnComplete: true,
        removeOnFail: false
      }
    );

    await this.queue.add(
      'optimization.daily' as any,
      { date: new Date().toISOString() } as any,
      {
        jobId: 'repeat-optimization.daily',
        repeat: { pattern: '30 2 * * *' },
        removeOnComplete: true,
        removeOnFail: false
      }
    );
  }

  async close(): Promise<void> {
    await this.queue.close();
    await this.connection.quit();
  }
}

export function createJobQueue(): JobQueue {
  if (!runtimeMode.usesRedis || !env.REDIS_URL) {
    return new NoopJobQueue();
  }
  return new BullJobQueue();
}

export async function createJobWorker(handler: JobHandler): Promise<Worker<any, unknown, JobName> | null> {
  if (!runtimeMode.usesRedis || !env.REDIS_URL) {
    return null;
  }

  const connection = { url: env.REDIS_URL as string } as any;

  const worker = new Worker<any, unknown, JobName>(
    'lead-to-revenue',
    async (job) => {
      await handler(job.name, job.data as any);
    },
    {
      connection,
      concurrency: env.WORKER_CONCURRENCY
    }
  );

  worker.on('failed', (job, error) => {
    console.error('Job failed', { name: job?.name, id: job?.id, error: error.message });
  });

  worker.on('completed', (job) => {
    console.info('Job completed', { name: job.name, id: job.id });
  });

  return worker;
}
