import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import { env } from '../config/env.js';

export const redis = new IORedis(env.REDIS_URL, { maxRetriesPerRequest: null });

export const qualificationQueue = new Queue('qualification', { connection: redis });
export const followUpQueue = new Queue('follow-up', { connection: redis });
export const optimizationQueue = new Queue('optimization', { connection: redis });

export type QualificationJob = { leadId: string };
export type FollowUpJob = { taskId: string };
export type OptimizationJob = { triggerReason: string };
