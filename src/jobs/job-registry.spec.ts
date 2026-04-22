import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  runAutopilotJob,
  runCreateSessionsJob,
  runProductOwnerJob,
  runResolveQuestionsJob,
  runReviewPrsJob,
  runSelfHealingJob,
  runOpsReportJob,
  mockRunJob
} = vi.hoisted(() => ({
  runAutopilotJob: vi.fn(),
  runCreateSessionsJob: vi.fn(),
  runProductOwnerJob: vi.fn(),
  runResolveQuestionsJob: vi.fn(),
  runReviewPrsJob: vi.fn(),
  runSelfHealingJob: vi.fn(),
  runOpsReportJob: vi.fn(),
  mockRunJob: vi.fn(async (_jobName: string, handler: () => Promise<void>) => {
    await handler();
  })
}));

vi.mock('./autopilot.job.js', () => ({ runAutopilotJob }));
vi.mock('./create-sessions.job.js', () => ({ runCreateSessionsJob }));
vi.mock('./product-owner.job.js', () => ({ runProductOwnerJob }));
vi.mock('./resolve-questions.job.js', () => ({ runResolveQuestionsJob }));
vi.mock('./review-prs.job.js', () => ({ runReviewPrsJob }));
vi.mock('./self-healing.job.js', () => ({ runSelfHealingJob }));
vi.mock('./ops-report.job.js', () => ({ runOpsReportJob }));
vi.mock('../services/orchestrator-runtime.service.js', () => ({
  OrchestratorRuntimeService: class {
    runJob = mockRunJob;
  }
}));

import { runConfiguredJob } from './job-registry.js';

describe('runConfiguredJob', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('dispatches the autopilot job', async () => {
    await runConfiguredJob('autopilot');

    expect(runAutopilotJob).toHaveBeenCalledOnce();
  });

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

  it('dispatches the ops-report job', async () => {
    await runConfiguredJob('ops-report');

    expect(runOpsReportJob).toHaveBeenCalledOnce();
  });

  it('falls back to autopilot for unknown jobs', async () => {
    await runConfiguredJob('inventei-essa');

    expect(runAutopilotJob).toHaveBeenCalledOnce();
  });

  it('wraps the selected job with runtime auditing', async () => {
    await runConfiguredJob('create-sessions');

    expect(mockRunJob).toHaveBeenCalledWith('create-sessions', runCreateSessionsJob);
  });
});
