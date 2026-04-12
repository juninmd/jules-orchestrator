import { describe, expect, it, vi } from 'vitest';

const {
  mockListComments,
  mockListForAuthenticatedUser
} = vi.hoisted(() => ({
  mockListComments: vi.fn(),
  mockListForAuthenticatedUser: vi.fn()
}));

vi.mock('@octokit/rest', () => ({
  Octokit: class {
    repos = {
      listForAuthenticatedUser: mockListForAuthenticatedUser
    };
    pulls = {
      list: vi.fn(),
      get: vi.fn(),
      merge: vi.fn()
    };
    issues = {
      createComment: vi.fn(),
      listComments: mockListComments
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

describe('GithubService.getActiveRepositories', () => {
  it('returns configured target repositories before querying GitHub', async () => {
    const service = new GithubService();

    const repositories = await service.getActiveRepositories(20);

    expect(repositories).toEqual(['juninmd/api', 'juninmd/web']);
    expect(mockListForAuthenticatedUser).not.toHaveBeenCalled();
  });
});

describe('GithubService.listPullRequestComments', () => {
  it('returns the existing pull request comment bodies', async () => {
    mockListComments.mockResolvedValue({
      data: [{ body: 'first comment' }, { body: null }, { body: 'second comment' }]
    });

    const service = new GithubService();
    const comments = await service.listPullRequestComments('juninmd/api', 7);

    expect(comments).toEqual(['first comment', 'second comment']);
  });
});
