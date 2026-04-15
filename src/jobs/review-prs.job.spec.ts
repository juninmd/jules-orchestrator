import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const {
  mockAddPullRequestComment,
  mockExecAsync,
  mockGenerateText,
  mockGetAllRepositories,
  mockGetOpenPullRequests,
  mockGetPullRequestDiff,
  mockListPullRequestComments,
  mockMergePullRequest,
  mockSendMessage,
  mockSafeGitClone,
  mockGitFetchPr,
  mockDetectPackageManager
} = vi.hoisted(() => ({
  mockAddPullRequestComment: vi.fn(),
  mockExecAsync: vi.fn(),
  mockGenerateText: vi.fn(),
  mockGetAllRepositories: vi.fn(),
  mockGetOpenPullRequests: vi.fn(),
  mockGetPullRequestDiff: vi.fn(),
  mockListPullRequestComments: vi.fn(),
  mockMergePullRequest: vi.fn(),
  mockSendMessage: vi.fn(),
  mockSafeGitClone: vi.fn().mockResolvedValue(undefined),
  mockGitFetchPr: vi.fn().mockResolvedValue(undefined),
  mockDetectPackageManager: vi.fn().mockReturnValue({ name: 'pnpm', install: 'pnpm install', build: 'pnpm run build' })
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

vi.mock('../services/git-helper.service.js', () => ({
  safeGitClone: mockSafeGitClone,
  gitFetchPr: mockGitFetchPr,
  detectPackageManager: mockDetectPackageManager
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
    vi.useFakeTimers();
    mockExecAsync.mockResolvedValue({ stdout: '', stderr: '' });
    mockGenerateText.mockResolvedValue({ text: 'APROVADO' });
    mockGetAllRepositories.mockResolvedValue(['juninmd/api']);
    mockGetOpenPullRequests.mockResolvedValue([{ number: 7, title: 'fix: ajuste', body: '' }]);
    mockGetPullRequestDiff.mockResolvedValue('diff --git a/f.ts b/f.ts\n+console.log("ok")');
    mockListPullRequestComments.mockResolvedValue([]);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('skips repeated feedback when the same diff was already reviewed', async () => {
    const diff = 'diff --git a/f.ts b/f.ts\n+console.log("ok")';
    mockGetPullRequestDiff.mockResolvedValue(diff);
    mockListPullRequestComments.mockResolvedValue([
      `${createReviewMarker(diff)}\ncomentario antigo`
    ]);

    const p = runReviewPrsJob();
    await vi.runAllTimersAsync();
    await p;

    expect(mockGenerateText).not.toHaveBeenCalled();
  });

  it('returns early when no repos', async () => {
    mockGetAllRepositories.mockResolvedValue([]);
    const p = runReviewPrsJob();
    await vi.runAllTimersAsync();
    await p;
    expect(mockGetOpenPullRequests).not.toHaveBeenCalled();
  });

  it('skips repo with no open PRs', async () => {
    mockGetOpenPullRequests.mockResolvedValue([]);
    const p = runReviewPrsJob();
    await vi.runAllTimersAsync();
    await p;
    expect(mockGetPullRequestDiff).not.toHaveBeenCalled();
  });

  it('approves and merges when LLM says APROVADO', async () => {
    mockGenerateText.mockResolvedValue({ text: 'APROVADO' });
    const p = runReviewPrsJob();
    await vi.runAllTimersAsync();
    await p;
    expect(mockMergePullRequest).toHaveBeenCalledWith('juninmd/api', 7, expect.any(String));
    expect(mockSendMessage).toHaveBeenCalledWith(expect.stringContaining('Squash Merge'));
  });

  it('leaves critique comment when LLM responds CRÍTICA', async () => {
    mockGenerateText.mockResolvedValue({ text: 'CRÍTICA: código acoplado' });
    const p = runReviewPrsJob();
    await vi.runAllTimersAsync();
    await p;
    expect(mockAddPullRequestComment).toHaveBeenCalledWith('juninmd/api', 7, expect.stringContaining('Revisão'));
    expect(mockMergePullRequest).not.toHaveBeenCalled();
  });

  it('reports build failure and blocks review', async () => {
    mockExecAsync.mockRejectedValue(new Error('tsc error'));
    const p = runReviewPrsJob();
    await vi.runAllTimersAsync();
    await p;
    expect(mockAddPullRequestComment).toHaveBeenCalledWith('juninmd/api', 7, expect.stringContaining('Falha de Compilação'));
    expect(mockGenerateText).not.toHaveBeenCalled();
  });

  it('skips PR with empty diff', async () => {
    mockGetPullRequestDiff.mockResolvedValue('');
    const p = runReviewPrsJob();
    await vi.runAllTimersAsync();
    await p;
    expect(mockGenerateText).not.toHaveBeenCalled();
  });
});
