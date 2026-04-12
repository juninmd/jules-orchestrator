import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  mockAddPullRequestComment,
  mockExecAsync,
  mockGenerateText,
  mockGetAllRepositories,
  mockGetOpenPullRequests,
  mockGetPullRequestDiff,
  mockListPullRequestComments,
  mockMergePullRequest,
  mockSendMessage
} = vi.hoisted(() => ({
  mockAddPullRequestComment: vi.fn(),
  mockExecAsync: vi.fn(),
  mockGenerateText: vi.fn(),
  mockGetAllRepositories: vi.fn(),
  mockGetOpenPullRequests: vi.fn(),
  mockGetPullRequestDiff: vi.fn(),
  mockListPullRequestComments: vi.fn(),
  mockMergePullRequest: vi.fn(),
  mockSendMessage: vi.fn()
}));

vi.mock('node:util', async importOriginal => {
  const actual = await importOriginal<typeof import('node:util')>();
  return { ...actual, promisify: () => mockExecAsync };
});

vi.mock('ai', () => ({ generateText: mockGenerateText }));
vi.mock('ollama-ai-provider', () => ({ createOllama: () => () => 'mock-model' }));
vi.mock('node:child_process', () => ({ exec: vi.fn() }));
vi.mock('node:fs', () => ({
  default: {
    existsSync: vi.fn().mockReturnValue(false),
    rmSync: vi.fn()
  }
}));

vi.mock('../config/env.config.js', () => ({
  env: {
    GITHUB_TOKEN: 'gh-token',
    OLLAMA_HOST: 'http://ollama:11434',
    OLLAMA_MODEL: 'gemma2'
  }
}));

vi.mock('../services/github.service.js', () => {
  function GithubService(this: any) {
    this.getAllRepositories = mockGetAllRepositories;
    this.getOpenPullRequests = mockGetOpenPullRequests;
    this.getPullRequestDiff = mockGetPullRequestDiff;
    this.listPullRequestComments = mockListPullRequestComments;
    this.addPullRequestComment = mockAddPullRequestComment;
    this.mergePullRequest = mockMergePullRequest;
  }

  return { GithubService };
});

vi.mock('../services/telegram.service.js', () => {
  function TelegramService(this: any) {
    this.sendMessage = mockSendMessage;
  }

  return { TelegramService };
});

import { createReviewMarker } from '../services/review-comment-marker.service.js';
import { runReviewPrsJob } from './review-prs.job.js';

describe('runReviewPrsJob', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockExecAsync.mockResolvedValue({ stdout: '', stderr: '' });
    mockGenerateText.mockResolvedValue({ text: 'CRÍTICA: ajuste isso' });
    mockGetAllRepositories.mockResolvedValue(['juninmd/api']);
    mockGetOpenPullRequests.mockResolvedValue([{ number: 7, title: 'fix: ajuste', body: '' }]);
    mockGetPullRequestDiff.mockResolvedValue('diff-content');
    mockListPullRequestComments.mockResolvedValue([]);
  });

  it('skips repeated feedback when the same diff was already reviewed', async () => {
    mockListPullRequestComments.mockResolvedValue([
      `${createReviewMarker('diff-content')}\ncomentario antigo`
    ]);

    await runReviewPrsJob();

    expect(mockExecAsync).not.toHaveBeenCalled();
    expect(mockGenerateText).not.toHaveBeenCalled();
    expect(mockAddPullRequestComment).not.toHaveBeenCalled();
    expect(mockSendMessage).not.toHaveBeenCalled();
  });
});
