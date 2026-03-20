import type { PromptSlug } from '@alr/shared';
import { DEFAULT_PROMPTS } from '@alr/shared';

import type { PromptSeedState, PromptVersionRecord } from '../../core/store/types.js';
import type { AgentStore } from '../../core/store/interfaces.js';
import { checksum } from '../../utils/hash.js';

export class PromptService {
  constructor(private readonly store: AgentStore) {}

  async seedDefaults(): Promise<void> {
    const seeds: PromptSeedState[] = DEFAULT_PROMPTS.map((prompt) => ({
      ...prompt,
      metadata: prompt.metadata ?? {},
      checksum: checksum(prompt.content)
    }));
    await this.store.prompts.seedDefaults(seeds);
  }

  async getActive(slug: PromptSlug): Promise<PromptVersionRecord> {
    const prompt = await this.store.prompts.getActive(slug);
    if (!prompt) {
      throw new Error(`Active prompt not found for ${slug}`);
    }
    return prompt;
  }

  async listVersions(slug: PromptSlug): Promise<PromptVersionRecord[]> {
    return this.store.prompts.listVersions(slug);
  }

  async createVersion(slug: PromptSlug, title: string, content: string, active = false): Promise<PromptVersionRecord> {
    const versions = await this.store.prompts.listVersions(slug);
    const version = versions.at(-1)?.version ?? 0;
    return this.store.prompts.upsertVersion({
      slug,
      version: version + 1,
      title,
      content,
      active,
      metadata: {},
      checksum: checksum(content)
    });
  }

  async activate(slug: PromptSlug, version: number): Promise<PromptVersionRecord> {
    return this.store.prompts.activateVersion(slug, version);
  }
}
