import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockGetActiveRepositories, mockAnalyze, mockRouteImprovement, mockSendMessage } = vi.hoisted(() => ({
  mockGetActiveRepositories: vi.fn(),
  mockAnalyze: vi.fn(),
  mockRouteImprovement: vi.fn(),
  mockSendMessage: vi.fn()
}));

vi.mock('../services/github.service.js', () => {
  function GithubService(this: any) {
    this.getActiveRepositories = mockGetActiveRepositories;
  }
  return { GithubService };
});

vi.mock('../services/repo-analyzer.service.js', () => {
  function RepoAnalyzerService(this: any) {
    this.analyzeRepoAndGeneratePrompt = mockAnalyze;
  }
  return { RepoAnalyzerService };
});

vi.mock('../services/ai-router.service.js', () => {
  function AIRouterService(this: any) {
    this.routeImprovement = mockRouteImprovement;
  }
  return { AIRouterService };
});

vi.mock('../services/telegram.service.js', () => {
  function TelegramService(this: any) {
    this.sendMessage = mockSendMessage;
  }
  return { TelegramService };
});

vi.mock('../config/env.config.js', () => ({ env: {} }));

import { runCreateSessionsJob } from './create-sessions.job.js';

describe('runCreateSessionsJob', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetActiveRepositories.mockResolvedValue(['juninmd/api']);
    mockAnalyze.mockResolvedValue(null);
  });

  it('skips when no repos are found', async () => {
    mockGetActiveRepositories.mockResolvedValue([]);
    await runCreateSessionsJob();
    expect(mockAnalyze).not.toHaveBeenCalled();
  });

  it('routes improvement when insight is found', async () => {
    mockAnalyze.mockResolvedValue('SRP violation found');
    await runCreateSessionsJob();
    expect(mockRouteImprovement).toHaveBeenCalledWith('juninmd/api', 'SRP violation found');
    expect(mockSendMessage).toHaveBeenCalled();
  });

  it('does not route when no insight is found', async () => {
    await runCreateSessionsJob();
    expect(mockRouteImprovement).not.toHaveBeenCalled();
  });

  it('continues processing when one repo throws', async () => {
    mockGetActiveRepositories.mockResolvedValue(['juninmd/api', 'juninmd/web']);
    mockAnalyze.mockRejectedValueOnce(new Error('fail')).mockResolvedValueOnce(null);
    await runCreateSessionsJob();
    expect(mockAnalyze).toHaveBeenCalledTimes(2);
  });
});
