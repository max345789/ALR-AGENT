import { PrismaClient } from '@prisma/client';

import { env, runtimeMode } from '../config/env.js';
import { createCalendarGateway } from '../core/calendar/index.js';
import { createLlmAdapter } from '../core/llm/index.js';
import { createMessagingGateway } from '../core/messaging/index.js';
import { createJobQueue } from '../core/queue/index.js';
import { createMemoryStore } from '../core/store/memory-store.js';
import { createPrismaStore } from '../core/store/prisma-store.js';
import type { AgentStore } from '../core/store/interfaces.js';
import type { AppContext, ServiceDependencies } from '../core/context.js';
import { PromptService } from '../modules/prompts/prompt.service.js';
import { LeadService } from '../modules/leads/lead.service.js';
import { BookingService } from '../modules/bookings/booking.service.js';
import { QualificationService } from '../modules/qualification/qualification.service.js';
import { FollowUpService } from '../modules/followups/followup.service.js';
import { AnalyticsService } from '../modules/analytics/analytics.service.js';
import { OptimizationService } from '../modules/optimization/optimization.service.js';
import { CrmService } from '../modules/crm/crm.service.js';
import { AuthService } from '../modules/auth/index.js';
import { BillingService } from '../modules/billing/billing.service.js';

export interface AgentServices {
  promptService: PromptService;
  leadService: LeadService;
  bookingService: BookingService;
  qualificationService: QualificationService;
  followUpService: FollowUpService;
  analyticsService: AnalyticsService;
  optimizationService: OptimizationService;
  crmService: CrmService;
  billingService: BillingService;
  authService: AuthService;
}

export interface AgentContainer {
  context: AppContext;
  services: AgentServices;
  prisma: PrismaClient | undefined;
  dispose: () => Promise<void>;
}

export async function createAgentContainer(overrides: Partial<ServiceDependencies> = {}): Promise<AgentContainer> {
  const prisma = runtimeMode.usesDatabase && !overrides.store ? new PrismaClient() : undefined;
  const store: AgentStore =
    overrides.store ??
    (prisma ? createPrismaStore(prisma) : createMemoryStore());
  const llm = overrides.llm ?? createLlmAdapter();
  const messaging = overrides.messaging ?? createMessagingGateway();
  const calendar = overrides.calendar ?? createCalendarGateway();
  const queue = overrides.queue ?? createJobQueue();

  const context: AppContext = {
    store,
    llm,
    messaging,
    calendar,
    queue
  };

  const promptService = new PromptService(store);
  await promptService.seedDefaults();
  await queue.bootstrap();

  const bookingService = new BookingService(context);
  const leadService = new LeadService(context);
  const followUpService = new FollowUpService(context, promptService);
  const qualificationService = new QualificationService(context, promptService, bookingService);
  const analyticsService = new AnalyticsService(context);
  const optimizationService = new OptimizationService(context, promptService);
  const crmService = new CrmService(leadService);
  const billingService = new BillingService(prisma);
  const authService = new AuthService(prisma, billingService);

  return {
    context,
    services: {
      promptService,
      leadService,
      bookingService,
      qualificationService,
      followUpService,
      analyticsService,
      optimizationService,
      crmService,
      billingService,
      authService
    },
    prisma,
    dispose: async () => {
      await queue.close();
      if (prisma) {
        await prisma.$disconnect();
      }
    }
  };
}
