import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  mockListComments,
  mockListForAuthenticatedUser,
  mockPullsList,
  mockPullsGet,
  mockPullsMerge,
  mockPullsCreate,
  mockCreateComment,
  mockListForRepo,
  mockCreateIssue,
  mockAddLabels,
  mockRemoveLabel,
  mockGetContent,
  mockGetRef,
  mockCreateRef,
  mockCreateOrUpdateFileContents
} = vi.hoisted(() => ({
  mockListComments: vi.fn(),
  mockListForAuthenticatedUser: vi.fn(),
  mockPullsList: vi.fn().mockResolvedValue({ data: [] }),
  mockPullsGet: vi.fn(),
  mockPullsMerge: vi.fn(),
  mockPullsCreate: vi.fn().mockResolvedValue({ data: { number: 99 } }),
  mockCreateComment: vi.fn(),
  mockListForRepo: vi.fn().mockResolvedValue({ data: [] }),
  mockCreateIssue: vi.fn().mockResolvedValue({ data: { number: 321 } }),
  mockAddLabels: vi.fn(),
  mockRemoveLabel: vi.fn().mockResolvedValue(undefined),
  mockGetContent: vi.fn(),
  mockGetRef: vi.fn().mockResolvedValue({ data: { object: { sha: 'abc' } } }),
  mockCreateRef: vi.fn(),
  mockCreateOrUpdateFileContents: vi.fn()
}));

vi.mock('@octokit/rest', () => ({
  Octokit: class {
    repos = {
      listForAuthenticatedUser: mockListForAuthenticatedUser,
      getContent: mockGetContent,
      createOrUpdateFileContents: mockCreateOrUpdateFileContents
    };
    pulls = {
      list: mockPullsList,
      get: mockPullsGet,
      merge: mockPullsMerge,
      create: mockPullsCreate
    };
    issues = {
      createComment: mockCreateComment,
      create: mockCreateIssue,
      listComments: mockListComments,
      listForRepo: mockListForRepo,
      addLabels: mockAddLabels,
      removeLabel: mockRemoveLabel
    };
    git = {
      getRef: mockGetRef,
      createRef: mockCreateRef
    };
  }
}));

vi.mock('../config/env.config.js', () => ({
  env: {
    GITHUB_TOKEN: 'gh-token',
    TARGET_REPOSITORIES: ['juninmd/api', 'juninmd/web']
  }
}));

import { GithubService } from './github.service.js';

describe('GithubService', () => {
  let service: GithubService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new GithubService();
  });

  describe('getActiveRepositories', () => {
    it('returns configured target repos without querying GitHub', async () => {
      const repos = await service.getActiveRepositories(20);
      expect(repos).toEqual(['juninmd/api', 'juninmd/web']);
      expect(mockListForAuthenticatedUser).not.toHaveBeenCalled();
    });
  });

  describe('getOpenPullRequests', () => {
    it('returns mapped PRs', async () => {
      mockPullsList.mockResolvedValue({ data: [{ number: 1, title: 'fix', body: 'desc' }] });
      const prs = await service.getOpenPullRequests('juninmd/api');
      expect(prs).toEqual([{ number: 1, title: 'fix', body: 'desc' }]);
    });

    it('returns empty on error', async () => {
      mockPullsList.mockRejectedValue(new Error('fail'));
      const prs = await service.getOpenPullRequests('juninmd/api');
      expect(prs).toEqual([]);
    });
  });

  describe('getPullRequestDiff', () => {
    it('returns diff string', async () => {
      mockPullsGet.mockResolvedValue({ data: 'diff data' });
      const diff = await service.getPullRequestDiff('juninmd/api', 1);
      expect(diff).toBe('diff data');
    });

    it('returns empty on error', async () => {
      mockPullsGet.mockRejectedValue(new Error('fail'));
      const diff = await service.getPullRequestDiff('juninmd/api', 1);
      expect(diff).toBe('');
    });
  });

  describe('listPullRequestComments', () => {
    it('returns comment bodies filtering nulls', async () => {
      mockListComments.mockResolvedValue({
        data: [{ body: 'first' }, { body: null }, { body: 'second' }]
      });
      const comments = await service.listPullRequestComments('juninmd/api', 7);
      expect(comments).toEqual(['first', 'second']);
    });
  });

  describe('mergePullRequest', () => {
    it('calls squash merge', async () => {
      await service.mergePullRequest('juninmd/api', 1, 'msg');
      expect(mockPullsMerge).toHaveBeenCalledWith(
        expect.objectContaining({ merge_method: 'squash', pull_number: 1 })
      );
    });
  });

  describe('listIssuesByLabel', () => {
    it('returns issues filtering out PRs', async () => {
      mockListForRepo.mockResolvedValue({
        data: [
          { number: 1, title: 'Issue', body: 'help', pull_request: undefined },
          { number: 2, title: 'PR', body: '', pull_request: {} }
        ]
      });
      const issues = await service.listIssuesByLabel('juninmd/api', 'bug');
      expect(issues).toEqual([{ number: 1, title: 'Issue', body: 'help' }]);
    });
  });

  describe('addLabelToIssue', () => {
    it('calls addLabels on octokit', async () => {
      await service.addLabelToIssue('juninmd/api', 1, 'bug');
      expect(mockAddLabels).toHaveBeenCalledWith(
        expect.objectContaining({ labels: ['bug'], issue_number: 1 })
      );
    });
  });

  describe('removeLabelFromIssue', () => {
    it('calls removeLabel', async () => {
      await service.removeLabelFromIssue('juninmd/api', 1, 'bug');
      expect(mockRemoveLabel).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'bug', issue_number: 1 })
      );
    });
  });

  describe('getFileContents', () => {
    it('decodes base64 content', async () => {
      const encoded = Buffer.from('# Hello').toString('base64');
      mockGetContent.mockResolvedValue({ data: { type: 'file', content: encoded, sha: 'xyz' } });
      const result = await service.getFileContents('juninmd/api', 'README.md');
      expect(result).toEqual({ content: '# Hello', sha: 'xyz' });
    });

    it('throws for directory', async () => {
      mockGetContent.mockResolvedValue({ data: [{ type: 'dir' }] });
      await expect(service.getFileContents('juninmd/api', 'src')).rejects.toThrow('not a file');
    });
  });

  describe('createBranch', () => {
    it('creates ref from master', async () => {
      await service.createBranch('juninmd/api', 'feat/test');
      expect(mockGetRef).toHaveBeenCalledWith(expect.objectContaining({ ref: 'heads/master' }));
      expect(mockCreateRef).toHaveBeenCalledWith(
        expect.objectContaining({ ref: 'refs/heads/feat/test', sha: 'abc' })
      );
    });
  });

  describe('createPullRequest', () => {
    it('returns PR number', async () => {
      const num = await service.createPullRequest('juninmd/api', 'Title', 'Body', 'feat/x');
      expect(num).toBe(99);
    });
  });

  describe('createIssueFromFeature', () => {
    it('creates a feature issue when no duplicate exists', async () => {
      mockListForRepo.mockResolvedValue({ data: [] });

      const result = await service.createIssueFromFeature('juninmd/api', {
        title: 'Feature: Dashboard',
        body: 'body',
        labels: ['enhancement']
      });

      expect(result).toEqual({ number: 321, created: true });
      expect(mockCreateIssue).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Feature: Dashboard',
          labels: ['enhancement']
        })
      );
    });

    it('reuses an open issue with the same title', async () => {
      mockListForRepo.mockResolvedValue({
        data: [{ number: 7, title: 'Feature: Dashboard', body: '', pull_request: undefined }]
      });

      const result = await service.createIssueFromFeature('juninmd/api', {
        title: 'Feature: Dashboard',
        body: 'body',
        labels: ['enhancement']
      });

      expect(result).toEqual({ number: 7, created: false });
      expect(mockCreateIssue).not.toHaveBeenCalled();
    });
  });

  describe('getAllRepositories', () => {
    it('returns target repos when configured', async () => {
      const repos = await service.getAllRepositories();
      expect(repos).toEqual(['juninmd/api', 'juninmd/web']);
    });
  });
});
