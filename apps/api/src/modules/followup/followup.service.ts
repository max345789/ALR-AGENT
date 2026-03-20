import { prisma } from '../../db/client.js';
import { getLLMAdapter } from '../../llm/index.js';
import { sendEmail } from '../messaging/email.adapter.js';
import { sendWhatsApp } from '../messaging/whatsapp.adapter.js';
import { logger } from '../../utils/logger.js';

function interpolate(template: string, vars: Record<string, string | null | undefined>) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? '');
}

export async function processFollowUpTask(taskId: string) {
  const task = await prisma.followUpTask.findUniqueOrThrow({ where: { id: taskId }, include: { lead: true } });

  if (task.status === 'sent' || task.status === 'skipped') {
    logger.info({ taskId }, 'Follow-up task already processed, skipping');
    return;
  }

  const lead = task.lead;
  const vars = {
    firstName: lead.firstName,
    lastName: lead.lastName,
    email: lead.email,
    company: lead.company
  };

  const body = interpolate(task.body, vars);
  const subject = task.subject ? interpolate(task.subject, vars) : 'Follow-up';

  try {
    if (task.channel === 'email' && lead.email) {
      await sendEmail({ to: lead.email, subject, body });
    } else if (task.channel === 'whatsapp' && lead.phone) {
      await sendWhatsApp({ to: lead.phone, body });
    } else {
      // Log as note for unsupported channels or missing contact
      logger.info({ taskId, channel: task.channel }, 'Follow-up logged as note (no contact or note channel)');
    }

    await prisma.followUpTask.update({ where: { id: taskId }, data: { status: 'sent', sentAt: new Date(), attempts: { increment: 1 } } });
    await prisma.messageRecord.create({
      data: {
        leadId: lead.id,
        channel: task.channel as any,
        direction: 'outbound',
        status: 'sent',
        subject,
        body,
        provider: task.channel === 'email' ? 'smtp/console' : 'whatsapp/stub'
      }
    });
    await prisma.timelineEvent.create({
      data: {
        leadId: lead.id,
        type: 'followup_sent',
        title: `Follow-up sent via ${task.channel}`,
        body: subject
      }
    });
    logger.info({ taskId, leadId: lead.id, channel: task.channel }, 'Follow-up sent');
  } catch (err) {
    await prisma.followUpTask.update({ where: { id: taskId }, data: { status: 'failed', attempts: { increment: 1 } } });
    throw err;
  }
}

export async function getFollowUpTasks(leadId?: string) {
  return prisma.followUpTask.findMany({
    where: leadId ? { leadId } : undefined,
    orderBy: { scheduledAt: 'asc' },
    take: 100,
    include: { lead: { select: { firstName: true, lastName: true, email: true } } }
  });
}
