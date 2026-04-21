import { describe, it, expect, vi, beforeEach } from 'vitest';

const {
  mockGetActiveRepositories,
  mockGetFileContents,
  mockCreateBranch,
  mockCreateOrUpdateFile,
  mockCreatePullRequest,
  mockCreateIssueFromFeature,
  mockSendMessage,
  mockExtractTasks,
  mockGenerateNewFeature
} = vi.hoisted(() => ({
  mockGetActiveRepositories: vi.fn().mockResolvedValue(['juninmd/api']),
  mockGetFileContents: vi.fn(),
  mockCreateBranch: vi.fn(),
  mockCreateOrUpdateFile: vi.fn(),
  mockCreatePullRequest: vi.fn().mockResolvedValue(42),
  mockCreateIssueFromFeature: vi.fn().mockResolvedValue({ number: 77, created: true }),
  mockSendMessage: vi.fn(),
  mockExtractTasks: vi.fn().mockReturnValue([]),
  mockGenerateNewFeature: vi.fn().mockResolvedValue('## New Feature')
}));

vi.mock('../services/github.service.js', () => {
  function GithubService(this: any) {
    this.getActiveRepositories = mockGetActiveRepositories;
    this.getFileContents = mockGetFileContents;
    this.createBranch = mockCreateBranch;
    this.createOrUpdateFile = mockCreateOrUpdateFile;
    this.createPullRequest = mockCreatePullRequest;
    this.createIssueFromFeature = mockCreateIssueFromFeature;
  }
  return { GithubService };
});

vi.mock('../services/telegram.service.js', () => {
  function TelegramService(this: any) {
    this.sendMessage = mockSendMessage;
  }
  return { TelegramService };
});

vi.mock('../services/roadmap-parser.service.js', () => {
  function RoadmapParserService(this: any) {
    this.extractTasks = mockExtractTasks;
  }
  return { RoadmapParserService };
});

vi.mock('../services/po.service.js', () => {
  function POService(this: any) {
    this.generateNewFeature = mockGenerateNewFeature;
  }
  return { POService };
});

vi.mock('../config/env.config.js', () => ({ env: { TARGET_REPOSITORIES: [] } }));

import { runProductOwnerJob } from './product-owner.job.js';

describe('runProductOwnerJob', () => {
  beforeEach(() => vi.clearAllMocks());

  it('skips repo without ROADMAP.md', async () => {
    mockGetFileContents.mockRejectedValue(new Error('Not Found'));
    await runProductOwnerJob();
    expect(mockCreateBranch).not.toHaveBeenCalled();
  });

  it('skips when no completed tasks with triggers', async () => {
    mockGetFileContents.mockResolvedValue({ content: '# Roadmap', sha: 'abc' });
    mockExtractTasks.mockReturnValue([{ completed: false, trigger: null, title: 'Task', description: '' }]);
    await runProductOwnerJob();
    expect(mockGenerateNewFeature).not.toHaveBeenCalled();
  });

  it('creates PR when trigger is found', async () => {
    const roadmapContent = '# Roadmap\n## 📝 Gestão do Documento e Próximos Passos';
    mockGetFileContents.mockResolvedValue({ content: roadmapContent, sha: 'abc123' });
    mockExtractTasks.mockReturnValue([
      { completed: true, trigger: 'Deploy automático', title: 'CI/CD Setup', description: 'Pipeline' }
    ]);

    await runProductOwnerJob();

    expect(mockGenerateNewFeature).toHaveBeenCalledWith('CI/CD Setup', 'Pipeline', 'Deploy automático');
    expect(mockCreateIssueFromFeature).toHaveBeenCalledWith(
      'juninmd/api',
      expect.objectContaining({ title: 'Feature: Deploy automático' })
    );
    expect(mockCreateBranch).toHaveBeenCalledWith('juninmd/api', expect.stringContaining('feat/roadmap-'));
    expect(mockCreatePullRequest).toHaveBeenCalled();
    expect(mockSendMessage).toHaveBeenCalledWith(expect.stringContaining('PR #42'));
  });

  it('does not duplicate existing features', async () => {
    mockGetFileContents.mockResolvedValue({ content: '**Feature: Deploy automático**', sha: 'x' });
    mockExtractTasks.mockReturnValue([
      { completed: true, trigger: 'Deploy automático', title: 'T', description: 'D' }
    ]);

    await runProductOwnerJob();
    expect(mockGenerateNewFeature).not.toHaveBeenCalled();
  });
});
