import { describe, it, expect, vi, beforeEach } from 'vitest';

const {
  mockGetAllRepositories,
  mockListIssuesByLabel,
  mockListIssueComments,
  mockAddPullRequestComment,
  mockRemoveLabelFromIssue,
  mockAddLabelToIssue,
  mockGenerateText,
  mockSendMessage
} = vi.hoisted(() => ({
  mockGetAllRepositories: vi.fn().mockResolvedValue([]),
  mockListIssuesByLabel: vi.fn().mockResolvedValue([]),
  mockListIssueComments: vi.fn().mockResolvedValue([]),
  mockAddPullRequestComment: vi.fn(),
  mockRemoveLabelFromIssue: vi.fn(),
  mockAddLabelToIssue: vi.fn(),
  mockGenerateText: vi.fn().mockResolvedValue({ text: 'Use async/await...' }),
  mockSendMessage: vi.fn()
}));

vi.mock('../services/github.service.js', () => {
  function GithubService(this: any) {
    this.getAllRepositories = mockGetAllRepositories;
    this.listIssuesByLabel = mockListIssuesByLabel;
    this.listIssueComments = mockListIssueComments;
    this.addPullRequestComment = mockAddPullRequestComment;
    this.removeLabelFromIssue = mockRemoveLabelFromIssue;
    this.addLabelToIssue = mockAddLabelToIssue;
  }
  return { GithubService };
});

vi.mock('../services/telegram.service.js', () => {
  function TelegramService(this: any) {
    this.sendMessage = mockSendMessage;
  }
  return { TelegramService };
});

vi.mock('ai', () => ({ generateText: mockGenerateText }));
vi.mock('ollama-ai-provider', () => ({ createOllama: () => () => 'mock-model' }));
vi.mock('../config/env.config.js', () => ({
  env: { OLLAMA_HOST: 'http://localhost:11434', OLLAMA_MODEL: 'gemma2' }
}));

import { runResolveQuestionsJob } from './resolve-questions.job.js';

describe('runResolveQuestionsJob', () => {
  beforeEach(() => vi.clearAllMocks());

  it('does nothing when no repos', async () => {
    await runResolveQuestionsJob();
    expect(mockListIssuesByLabel).not.toHaveBeenCalled();
  });

  it('skips repos with no pending-jules issues', async () => {
    mockGetAllRepositories.mockResolvedValue(['juninmd/api']);
    await runResolveQuestionsJob();
    expect(mockGenerateText).not.toHaveBeenCalled();
  });

  it('answers an issue and swaps labels', async () => {
    mockGetAllRepositories.mockResolvedValue(['juninmd/api']);
    mockListIssuesByLabel.mockResolvedValue([{ number: 10, title: 'Q?', body: 'Help' }]);
    mockListIssueComments.mockResolvedValue([]);

    await runResolveQuestionsJob();

    expect(mockGenerateText).toHaveBeenCalledTimes(1);
    expect(mockAddPullRequestComment).toHaveBeenCalledWith('juninmd/api', 10, expect.stringContaining('jules-orchestrator:answer'));
    expect(mockRemoveLabelFromIssue).toHaveBeenCalledWith('juninmd/api', 10, 'pending-jules');
    expect(mockAddLabelToIssue).toHaveBeenCalledWith('juninmd/api', 10, 'jules-responded');
    expect(mockSendMessage).toHaveBeenCalled();
  });

  it('skips issue already answered by bot marker', async () => {
    mockGetAllRepositories.mockResolvedValue(['juninmd/api']);
    mockListIssuesByLabel.mockResolvedValue([{ number: 5, title: 'Q', body: 'Help' }]);
    mockListIssueComments.mockResolvedValue([
      { user: 'bot', body: '<!-- jules-orchestrator:answer -->\nDone' }
    ]);

    await runResolveQuestionsJob();
    expect(mockGenerateText).not.toHaveBeenCalled();
  });

  it('continues on error for individual issues', async () => {
    mockGetAllRepositories.mockResolvedValue(['juninmd/api']);
    mockListIssuesByLabel.mockResolvedValue([
      { number: 1, title: 'A', body: 'a' },
      { number: 2, title: 'B', body: 'b' }
    ]);
    mockListIssueComments.mockResolvedValue([]);
    mockGenerateText.mockRejectedValueOnce(new Error('timeout')).mockResolvedValueOnce({ text: 'ok' });

    await runResolveQuestionsJob();
    expect(mockAddPullRequestComment).toHaveBeenCalledTimes(1);
  });
});
