import type { FastifyInstance } from 'fastify';
import { runOptimizationLoop, getOptimizationRuns, getPromptVersions, activatePromptVersion } from '../modules/optimization/optimization.service.js';
import { getFollowUpTasks } from '../modules/followup/followup.service.js';
import { optimizationQueue } from '../queues/index.js';

export async function optimizationRoutes(app: FastifyInstance) {
  app.post('/optimization/run', async (_req, reply) => {
    await optimizationQueue.add('run', { triggerReason: 'manual' });
    return reply.send({ success: true, message: 'Optimization job queued' });
  });

  app.get('/optimization/runs', async (_req, reply) => {
    const data = await getOptimizationRuns();
    return reply.send({ success: true, data });
  });

  app.get('/prompts', async (req, reply) => {
    const query = req.query as any;
    const data = await getPromptVersions(query.slug);
    return reply.send({ success: true, data });
  });

  app.post('/prompts/:id/activate', async (req, reply) => {
    const { id } = req.params as { id: string };
    const data = await activatePromptVersion(id);
    return reply.send({ success: true, data });
  });

  app.get('/followup-tasks', async (req, reply) => {
    const query = req.query as any;
    const data = await getFollowUpTasks(query.leadId);
    return reply.send({ success: true, data });
  });
}
