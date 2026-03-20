import { startQualificationWorker } from './workers/qualification.worker.js';
import { startFollowUpWorker } from './workers/followup.worker.js';
import { startOptimizationWorker } from './workers/optimization.worker.js';
import { logger } from './utils/logger.js';

logger.info('Starting background workers...');
startQualificationWorker();
startFollowUpWorker();
startOptimizationWorker();
logger.info('All workers started');

process.on('SIGTERM', () => { logger.info('Worker shutdown'); process.exit(0); });
process.on('SIGINT', () => { logger.info('Worker shutdown'); process.exit(0); });
