import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  runCreateSessionsJob,
  runProductOwnerJob,
  runResolveQuestionsJob,
  runReviewPrsJob,
  runSelfHealingJob,
  runOpsReportJob,
  mockRunJob,
  mockSendMessage
} = vi.hoisted(() => ({
  runCreateSessionsJob: vi.fn(async () => undefined),
  runProductOwnerJob: vi.fn(async () => undefined),
  runResolveQuestionsJob: vi.fn(async () => undefined),
  runReviewPrsJob: vi.fn(async () => undefined),
  runSelfHealingJob: vi.fn(async () => undefined),
  runOpsReportJob: vi.fn(async () => undefined),
  mockRunJob: vi.fn(async (_jobName: string, handler: () => Promise<void>) => handler()),
  mockSendMessage: vi.fn(async () => undefined)
}));

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
vi.mock('../services/telegram.service.js', () => ({
  TelegramService: class {
    sendMessage = mockSendMessage;
  }
}));

import { runAutopilotJob } from './autopilot.job.js';

describe('runAutopilotJob', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('runs the full autonomous cycle in operational priority order', async () => {
    await runAutopilotJob();

    expect(mockRunJob.mock.calls.map(call => call[0])).toEqual([
      'self-healing',
      'review-prs',
      'resolve-questions',
      'product-owner',
      'create-sessions',
      'ops-report'
    ]);
    expect(mockSendMessage).toHaveBeenCalledWith(expect.stringContaining('Autopilot Jules'));
  });

  it('continues remaining stages and fails the aggregate run when one stage fails', async () => {
    mockRunJob.mockImplementation(async (jobName: string, handler: () => Promise<void>) => {
      if (jobName === 'review-prs') throw new Error('build quebrou');
      return handler();
    });

    await expect(runAutopilotJob()).rejects.toThrow('review-prs');

    expect(mockRunJob.mock.calls.map(call => call[0])).toEqual([
      'self-healing',
      'review-prs',
      'resolve-questions',
      'product-owner',
      'create-sessions',
      'ops-report'
    ]);
    expect(mockSendMessage).toHaveBeenCalledWith(expect.stringContaining('review-prs: FALHOU'));
  });
});
