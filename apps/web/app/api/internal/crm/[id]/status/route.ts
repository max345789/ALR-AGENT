import { NextResponse } from 'next/server';
import { z } from 'zod';
import { leadStatusEnum } from '@alr/shared';

import { proxyAdminJson } from '@/lib/admin-proxy';

const statusSchema = z.object({
  status: leadStatusEnum,
  note: z.string().trim().max(5000).optional()
}).strict();

const leadIdSchema = z.object({
  id: z.string().uuid()
}).strict();

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const idResult = leadIdSchema.safeParse(resolvedParams);
  if (!idResult.success) {
    return NextResponse.json({ error: 'Invalid lead id' }, { status: 400 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
  }

  const parsed = statusSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', issues: parsed.error.flatten() }, { status: 400 });
  }

  return proxyAdminJson(`/api/v1/crm/${encodeURIComponent(idResult.data.id)}/status`, 'PATCH', parsed.data);
}
