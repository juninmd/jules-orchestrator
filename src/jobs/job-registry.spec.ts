import { describe, expect, it, vi } from 'vitest';

const {
  runCreateSessionsJob,
  runProductOwnerJob,
  runResolveQuestionsJob,
  runReviewPrsJob,
  runSelfHealingJob
} = vi.hoisted(() => ({
  runCreateSessionsJob: vi.fn(),
  runProductOwnerJob: vi.fn(),
  runResolveQuestionsJob: vi.fn(),
  runReviewPrsJob: vi.fn(),
  runSelfHealingJob: vi.fn()
}));

vi.mock('./create-sessions.job.js', () => ({ runCreateSessionsJob }));
vi.mock('./product-owner.job.js', () => ({ runProductOwnerJob }));
vi.mock('./resolve-questions.job.js', () => ({ runResolveQuestionsJob }));
vi.mock('./review-prs.job.js', () => ({ runReviewPrsJob }));
vi.mock('./self-healing.job.js', () => ({ runSelfHealingJob }));

import { runConfiguredJob } from './job-registry.js';

describe('runConfiguredJob', () => {
  it('dispatches the resolve-questions job', async () => {
    await runConfiguredJob('resolve-questions');

    expect(runResolveQuestionsJob).toHaveBeenCalledOnce();
  });

  it('dispatches the self-healing job', async () => {
    await runConfiguredJob('self-healing');

    expect(runSelfHealingJob).toHaveBeenCalledOnce();
  });

  it('dispatches the product-owner job', async () => {
    await runConfiguredJob('product-owner');

    expect(runProductOwnerJob).toHaveBeenCalledOnce();
  });

  it('falls back to review-prs for unknown jobs', async () => {
    await runConfiguredJob('inventei-essa');

    expect(runReviewPrsJob).toHaveBeenCalledOnce();
  });
});
