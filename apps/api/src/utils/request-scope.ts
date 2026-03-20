import type { FastifyRequest } from 'fastify';

import type { AgentServices } from '../bootstrap/container.js';
import { extractHeaderValue } from './request.js';
import { extractSessionToken } from './session.js';

export async function resolveRequestUserId(
  request: FastifyRequest,
  services: Pick<AgentServices, 'authService' | 'billingService'>,
  options: { allowCaptureKey?: boolean } = {}
): Promise<string | null | undefined> {
  const sessionToken = extractSessionToken(request);
  if (sessionToken) {
    const user = await services.authService.getCurrentUserFromSessionToken(sessionToken);
    return user?.id ?? null;
  }

  if (options.allowCaptureKey === false) {
    return undefined;
  }

  const captureKey = extractHeaderValue(request, 'x-alr-capture-key');
  if (captureKey) {
    const user = await services.billingService.resolveUserByCaptureKey(captureKey);
    return user?.id ?? null;
  }

  return undefined;
}
