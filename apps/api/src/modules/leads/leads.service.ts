import { prisma } from '../../db/client.js';
import { qualificationQueue } from '../../queues/index.js';
import { logger } from '../../utils/logger.js';
import type { LeadCaptureInput, LeadUpdateInput } from '@alr/shared';

export async function captureLead(input: LeadCaptureInput) {
  const lead = await prisma.lead.create({
    data: {
      source: input.source ?? 'web',
      firstName: input.firstName ?? null,
      lastName: input.lastName ?? null,
      email: input.email ?? null,
      phone: input.phone ?? null,
      company: input.company ?? null,
      jobTitle: input.jobTitle ?? null,
      message: input.message ?? null,
      intentHint: input.intentHint ?? null,
      metadata: (input.metadata ?? {}) as any,
      status: 'new'
    }
  });

  await prisma.timelineEvent.create({
    data: {
      leadId: lead.id,
      type: 'lead_captured',
      title: 'Lead captured',
      body: `Lead arrived via ${lead.source}`
    }
  });

  await qualificationQueue.add('qualify', { leadId: lead.id }, { attempts: 3, backoff: { type: 'exponential', delay: 5000 } });
  logger.info({ leadId: lead.id }, 'Lead captured, queued for qualification');
  return lead;
}

export async function getLeads(opts: { status?: string; segment?: string; source?: string; search?: string; limit?: number }) {
  const where: any = {};
  if (opts.status && opts.status !== 'any') where.status = opts.status;
  if (opts.segment && opts.segment !== 'any') where.segment = opts.segment;
  if (opts.source && opts.source !== 'any') where.source = opts.source;
  if (opts.search) {
    where.OR = [
      { firstName: { contains: opts.search, mode: 'insensitive' } },
      { lastName: { contains: opts.search, mode: 'insensitive' } },
      { email: { contains: opts.search, mode: 'insensitive' } },
      { company: { contains: opts.search, mode: 'insensitive' } }
    ];
  }
  return prisma.lead.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: opts.limit ?? 50
  });
}

export async function getLeadById(id: string) {
  return prisma.lead.findUnique({
    where: { id },
    include: {
      qualification: true,
      messages: { orderBy: { createdAt: 'desc' }, take: 50 },
      bookings: { orderBy: { slotStart: 'asc' } },
      timeline: { orderBy: { createdAt: 'desc' }, take: 100 },
      followUpTasks: { orderBy: { scheduledAt: 'asc' } }
    }
  });
}

export async function updateLead(id: string, input: LeadUpdateInput) {
  const lead = await prisma.lead.update({
    where: { id },
    data: {
      ...(input.status && { status: input.status }),
      ...(input.segment && { segment: input.segment }),
      ...(input.ownerName !== undefined && { ownerName: input.ownerName }),
      ...(input.notes !== undefined && { notes: input.notes }),
      ...(input.score !== undefined && { score: input.score }),
      ...(input.tags && { tags: input.tags }),
      ...(input.metadata && { metadata: input.metadata as any })
    }
  });

  await prisma.timelineEvent.create({
    data: {
      leadId: id,
      type: 'lead_updated',
      title: 'Lead updated',
      body: `Fields updated: ${Object.keys(input).join(', ')}`
    }
  });

  return lead;
}

export async function deleteLead(id: string) {
  return prisma.lead.delete({ where: { id } });
}
