import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockGetCrashingPods, mockInvokeSession, mockSendMessage } = vi.hoisted(() => ({
  mockGetCrashingPods: vi.fn(),
  mockInvokeSession: vi.fn(),
  mockSendMessage: vi.fn()
}));

vi.mock('../services/k8s.service.js', () => {
  function K8sService(this: any) {
    this.getCrashingPods = mockGetCrashingPods;
  }
  return { K8sService };
});

vi.mock('../services/jules.service.js', () => {
  function JulesService(this: any) {
    this.invokeSession = mockInvokeSession;
  }
  return { JulesService };
});

vi.mock('../services/telegram.service.js', () => {
  function TelegramService(this: any) {
    this.sendMessage = mockSendMessage;
  }
  return { TelegramService };
});

import { runSelfHealingJob } from './self-healing.job.js';

describe('runSelfHealingJob', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns early when no crashing pods', async () => {
    mockGetCrashingPods.mockResolvedValue([]);
    await runSelfHealingJob();
    expect(mockInvokeSession).not.toHaveBeenCalled();
    expect(mockSendMessage).not.toHaveBeenCalled();
  });

  it('dispatches Jules for each crashing pod', async () => {
    mockGetCrashingPods.mockResolvedValue([
      { name: 'api-abc', namespace: 'production', repo: 'juninmd/api', logTrace: 'Error: OOM' }
    ]);
    await runSelfHealingJob();
    expect(mockSendMessage).toHaveBeenCalledWith(expect.stringContaining('api-abc'));
    expect(mockInvokeSession).toHaveBeenCalledWith(
      expect.objectContaining({ repository: 'juninmd/api' })
    );
  });

  it('continues when Jules invocation fails', async () => {
    mockGetCrashingPods.mockResolvedValue([
      { name: 'a', namespace: 'ns', repo: 'juninmd/a', logTrace: 'err' },
      { name: 'b', namespace: 'ns', repo: 'juninmd/b', logTrace: 'err' }
    ]);
    mockInvokeSession.mockRejectedValueOnce(new Error('fail'));
    await runSelfHealingJob();
    expect(mockInvokeSession).toHaveBeenCalledTimes(2);
  });
});
