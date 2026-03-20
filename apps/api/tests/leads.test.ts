import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Prisma and queues before importing service
vi.mock('../src/db/client.js', () => ({
  prisma: {
    lead: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn()
    },
    timelineEvent: { create: vi.fn() }
  }
}));

vi.mock('../src/queues/index.js', () => ({
  qualificationQueue: { add: vi.fn() },
  followUpQueue: { add: vi.fn() },
  optimizationQueue: { add: vi.fn() },
  redis: {}
}));

import { prisma } from '../src/db/client.js';
import { captureLead, getLeads } from '../src/modules/leads/leads.service.js';

describe('leads.service', () => {
  beforeEach(() => vi.clearAllMocks());

  it('creates a lead and queues qualification', async () => {
    const mockLead = { id: 'test-id', source: 'web', status: 'new', email: 'test@test.com', firstName: 'John', lastName: 'Doe' };
    (prisma.lead.create as any).mockResolvedValue(mockLead);
    (prisma.timelineEvent.create as any).mockResolvedValue({});

    const result = await captureLead({ source: 'web', firstName: 'John', lastName: 'Doe', email: 'test@test.com', metadata: {} });

    expect(prisma.lead.create).toHaveBeenCalledOnce();
    expect(result.id).toBe('test-id');
  });

  it('returns leads list', async () => {
    (prisma.lead.findMany as any).mockResolvedValue([{ id: '1' }, { id: '2' }]);
    const leads = await getLeads({});
    expect(leads).toHaveLength(2);
  });
});
