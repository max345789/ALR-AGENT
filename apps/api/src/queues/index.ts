import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import { env } from '../config/env.js';

type QueueLike = {
  add: (...args: any[]) => Promise<void>;
};

const noopQueue: QueueLike = {
  async add(): Promise<void> {
    return undefined;
  }
};

export const redis = env.REDIS_URL ? new IORedis(env.REDIS_URL, { maxRetriesPerRequest: null }) : null;

export const qualificationQueue = redis ? new Queue('qualification', { connection: redis }) : noopQueue;
export const followUpQueue = redis ? new Queue('follow-up', { connection: redis }) : noopQueue;
export const optimizationQueue = redis ? new Queue('optimization', { connection: redis }) : noopQueue;

export type QualificationJob = { leadId: string };
export type FollowUpJob = { taskId: string };
export type OptimizationJob = { triggerReason: string };
