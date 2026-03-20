import { createHash } from 'node:crypto';

import { PrismaClient } from '@prisma/client';
import { DEFAULT_PROMPTS, DEFAULT_FOLLOW_UP_SEQUENCE } from '@alr/shared';

const prisma = new PrismaClient();

function checksum(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

async function main() {
  // Seed prompt versions
  for (const p of DEFAULT_PROMPTS) {
    await prisma.promptVersion.upsert({
      where: { slug_version: { slug: p.slug, version: p.version } },
      update: { content: p.content, active: p.active, title: p.title, checksum: checksum(p.content) },
      create: {
        slug: p.slug,
        version: p.version,
        title: p.title,
        content: p.content,
        active: p.active,
        metadata: p.metadata ?? {},
        checksum: checksum(p.content)
      }
    });
  }

  // Seed default follow-up sequence
  const seq = DEFAULT_FOLLOW_UP_SEQUENCE;
  await prisma.followUpSequence.upsert({
    where: { slug: seq.slug },
    update: { name: seq.name, description: seq.description, active: seq.active, stepsJson: seq.steps as any },
    create: {
      slug: seq.slug,
      name: seq.name,
      description: seq.description,
      active: seq.active,
      stepsJson: seq.steps as any
    }
  });

  console.log('Seed complete');
}

main().finally(() => prisma.$disconnect());
