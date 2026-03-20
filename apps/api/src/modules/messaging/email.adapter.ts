import { deliverEmail, type EmailDeliveryInput } from '../../core/messaging/email-provider.js';
import { logger } from '../../utils/logger.js';

export type SendEmailOptions = EmailDeliveryInput;

export async function sendEmail(opts: SendEmailOptions): Promise<void> {
  const delivery = await deliverEmail(opts);

  if (delivery.provider !== 'console') {
    logger.info(
      {
        to: opts.to,
        subject: opts.subject ?? 'Follow-up',
        provider: delivery.provider,
        externalId: delivery.externalId
      },
      'Email sent via provider'
    );
  }
}
