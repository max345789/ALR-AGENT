import { NextResponse } from 'next/server';
import { z } from 'zod';

import { proxyAdminJson } from '@/lib/admin-proxy';

const noteSchema = z.object({
  note: z.string().trim().min(1).max(5000),
  metadata: z.record(z.unknown()).optional()
}).strict();

const leadIdSchema = z.object({
  id: z.string().uuid()
}).strict();

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
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

  const parsed = noteSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', issues: parsed.error.flatten() }, { status: 400 });
  }

  return proxyAdminJson(`/api/v1/crm/${encodeURIComponent(idResult.data.id)}/note`, 'POST', parsed.data);
}
