import type { FastifyReply } from 'fastify';
import { z, type ZodTypeAny } from 'zod';

export function validate<T extends ZodTypeAny>(
  schema: T,
  payload: unknown,
  reply: FastifyReply
): { ok: true; data: z.infer<T> } | { ok: false } {
  const result = schema.safeParse(payload);
  if (!result.success) {
    reply.code(400).send({
      error: 'Validation failed',
      issues: result.error.flatten()
    });
    return { ok: false };
  }
  return { ok: true, data: result.data as z.infer<T> };
}
