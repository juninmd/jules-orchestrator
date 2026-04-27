import { Octokit } from '@octokit/rest';
import { env } from '../config/env.config.js';
import { RoadmapFeatureIssue } from '../contracts/orchestration.js';
import { logger } from './logger.service.js';
import { ExternalServiceError } from '../utils/errors.js';
import { withRetry } from '../utils/retry.js';

export class GithubService {
  private octokit: Octokit;
  private targetRepositories: string[];

  constructor() {
    this.octokit = new Octokit({
      auth: env.GITHUB_TOKEN
    });
    this.targetRepositories = env.TARGET_REPOSITORIES || [];
  }

  private splitRepo(repository: string) {
    const [owner, repo] = repository.split('/');
    if (!owner || !repo) {
      throw new ExternalServiceError(`Repository format invalid: ${repository}`, 'Github', { repository });
    }
    return { owner, repo };
  }

  private async githubOperation<T>(operation: () => Promise<T>, context: string): Promise<T> {
    return withRetry(
      () => operation(),
      {
        maxAttempts: 3,
        initialDelayMs: 1000,
        maxDelayMs: 10000
      },
      `GithubService.${context}`
    );
  }

  private async findOpenIssueByTitle(repository: string, title: string): Promise<number | null> {
    const { owner, repo } = this.splitRepo(repository);
    const { data } = await this.octokit.issues.listForRepo({
      owner,
      repo,
      state: 'open',
      per_page: 100
    });

    const normalizedTitle = title.trim().toLowerCase();
    const existing = data.find(issue =>
      !issue.pull_request && issue.title.trim().toLowerCase() === normalizedTitle
    );
    return existing?.number ?? null;
  }

  async getOpenPullRequests(repository: string): Promise<{ number: number; title: string, body: string }[]> {
    try {
      return await this.githubOperation(async () => {
        const { owner, repo } = this.splitRepo(repository);

        const { data } = await this.octokit.pulls.list({
          owner,
          repo,
          state: 'open',
          sort: 'updated',
          direction: 'desc'
        });
        return data.map(pr => ({
          number: pr.number,
          title: pr.title,
          body: pr.body || ''
        }));
      }, 'getOpenPullRequests');
    } catch (error) {
      logger.error('GithubService', `Erro ao buscar PRs de ${repository}`, error);
      return [];
    }
  }

  async getPullRequestDiff(repository: string, prNumber: number): Promise<string> {
    try {
      return await this.githubOperation(async () => {
        const { owner, repo } = this.splitRepo(repository);

        const { data } = await this.octokit.pulls.get({
          owner,
          repo,
          pull_number: prNumber,
          mediaType: {
            format: "diff",
          },
        });
        return String(data);
      }, `getPullRequestDiff(#${prNumber})`);
    } catch (error) {
      logger.error('GithubService', `Erro ao buscar diff do PR #${prNumber}`, error);
      return '';
    }
  }

  async addPullRequestComment(repository: string, prNumber: number, comment: string): Promise<void> {
    try {
      await this.githubOperation(async () => {
        const { owner, repo } = this.splitRepo(repository);

        await this.octokit.issues.createComment({
          owner,
          repo,
          issue_number: prNumber,
          body: comment
        });
      }, `addPullRequestComment(#${prNumber})`);
    } catch (error) {
      logger.error('GithubService', `Erro ao adicionar comentário no PR #${prNumber}`, error);
    }
  }

  async listPullRequestComments(repository: string, prNumber: number): Promise<string[]> {
    try {
      return await this.githubOperation(async () => {
        const { owner, repo } = this.splitRepo(repository);

        const { data } = await this.octokit.issues.listComments({
          owner,
          repo,
          issue_number: prNumber,
          per_page: 100
        });

        return data.map(comment => comment.body).filter((comment): comment is string => Boolean(comment));
      }, `listPullRequestComments(#${prNumber})`);
    } catch (error) {
      logger.error('GithubService', `Erro ao listar comentários do PR #${prNumber}`, error);
      return [];
    }
  }

  async mergePullRequest(repository: string, prNumber: number, mergeMessage: string): Promise<void> {
    try {
      await this.githubOperation(async () => {
        const { owner, repo } = this.splitRepo(repository);

        await this.octokit.pulls.merge({
          owner,
          repo,
          pull_number: prNumber,
          commit_title: `Merge origin PR #${prNumber} (Automated Squash)`,
          commit_message: mergeMessage,
          merge_method: 'squash'
        });
      }, `mergePullRequest(#${prNumber})`);
    } catch (error) {
      logger.error('GithubService', `Erro ao fazer Squash Merge no PR #${prNumber}`, error);
    }
  }

  async getActiveRepositories(limit: number = 5): Promise<string[]> {
    if (this.targetRepositories.length > 0) {
      return this.targetRepositories.slice(0, limit);
    }

    try {
      return await this.githubOperation(async () => {
        const { data } = await this.octokit.repos.listForAuthenticatedUser({
          sort: 'pushed',
          direction: 'desc',
          per_page: limit
        });
        return data.map(r => r.full_name);
      }, 'getActiveRepositories');
    } catch {
      return [];
    }
  }

  async getAllRepositories(): Promise<string[]> {
    if (this.targetRepositories.length > 0) {
      return this.targetRepositories;
    }

    const perPage = 100;
    const repos: string[] = [];
    let page = 1;
    while (true) {
      try {
        const { data } = await this.octokit.repos.listForAuthenticatedUser({
          sort: 'pushed',
          direction: 'desc',
          per_page: perPage,
          page
        });
        repos.push(...data.map(r => r.full_name));
        if (data.length < perPage) break;
        page++;
      } catch (error) {
        logger.error('GithubService', `Erro ao buscar repositórios página ${page}`, error);
        break;
      }
    }
    return repos;
  }

  async listIssuesByLabel(repository: string, label: string): Promise<{ number: number; title: string; body: string }[]> {
    try {
      return await this.githubOperation(async () => {
        const { owner, repo } = this.splitRepo(repository);
        const { data } = await this.octokit.issues.listForRepo({
          owner,
          repo,
          labels: label,
          state: 'open',
          per_page: 20
        });
        return data
          .filter(issue => !issue.pull_request)
          .map(issue => ({ number: issue.number, title: issue.title, body: issue.body || '' }));
      }, `listIssuesByLabel(${label})`);
    } catch {
      return [];
    }
  }

  async listIssueComments(repository: string, issueNumber: number): Promise<{ body: string; user: string }[]> {
    try {
      return await this.githubOperation(async () => {
        const { owner, repo } = this.splitRepo(repository);
        const { data } = await this.octokit.issues.listComments({
          owner,
          repo,
          issue_number: issueNumber,
          per_page: 50
        });
        return data.map(c => ({ body: c.body || '', user: c.user?.login || '' }));
      }, `listIssueComments(#${issueNumber})`);
    } catch {
      return [];
    }
  }

  async addLabelToIssue(repository: string, issueNumber: number, label: string): Promise<void> {
    try {
      const { owner, repo } = this.splitRepo(repository);
      await this.octokit.issues.addLabels({ owner, repo, issue_number: issueNumber, labels: [label] });
    } catch (error) {
      logger.error('GithubService', `Erro ao adicionar label ${label} na issue #${issueNumber}`, error);
    }
  }

  async removeLabelFromIssue(repository: string, issueNumber: number, label: string): Promise<void> {
    try {
      const { owner, repo } = this.splitRepo(repository);
      await this.octokit.issues.removeLabel({ owner, repo, issue_number: issueNumber, name: label });
    } catch (error) {
      logger.error('GithubService', `Erro ao remover label ${label} da issue #${issueNumber}`, error);
    }
  }

  async getFileContents(repository: string, filePath: string, ref?: string): Promise<{ content: string; sha: string }> {
    const { owner, repo } = this.splitRepo(repository);
    const { data } = await this.octokit.repos.getContent({
      owner, repo, path: filePath, ...(ref ? { ref } : {})
    });
    if (Array.isArray(data) || data.type !== 'file') throw new Error(`${filePath} is not a file`);
    const content = Buffer.from(data.content, 'base64').toString('utf-8');
    return { content, sha: data.sha };
  }

  async createBranch(repository: string, branchName: string, fromRef = 'master'): Promise<void> {
    try {
      await this.githubOperation(async () => {
        const { owner, repo } = this.splitRepo(repository);
        const { data: ref } = await this.octokit.git.getRef({ owner, repo, ref: `heads/${fromRef}` });
        await this.octokit.git.createRef({ owner, repo, ref: `refs/heads/${branchName}`, sha: ref.object.sha });
      }, `createBranch(${branchName})`);
    } catch (error) {
      throw new ExternalServiceError(`Failed to create branch ${branchName}`, 'Github', { repository, branchName });
    }
  }

  async createOrUpdateFile(repository: string, filePath: string, content: string, message: string, branch: string, sha?: string): Promise<void> {
    try {
      await this.githubOperation(async () => {
        const { owner, repo } = this.splitRepo(repository);
        await this.octokit.repos.createOrUpdateFileContents({
          owner, repo, path: filePath, message, branch,
          content: Buffer.from(content).toString('base64'),
          ...(sha ? { sha } : {})
        });
      }, `createOrUpdateFile(${filePath})`);
    } catch (error) {
      throw new ExternalServiceError(`Failed to update file ${filePath}`, 'Github', { repository, filePath });
    }
  }

  async createPullRequest(repository: string, title: string, body: string, head: string, base = 'master'): Promise<number> {
    try {
      const { owner, repo } = this.splitRepo(repository);
      const { data } = await this.octokit.pulls.create({ owner, repo, title, body, head, base });
      return data.number;
    } catch (error) {
      throw new ExternalServiceError('Failed to create Pull Request', 'Github', { repository, title });
    }
  }

  async createIssueFromFeature(repository: string, feature: RoadmapFeatureIssue): Promise<{ number: number; created: boolean }> {
    const existingIssueNumber = await this.findOpenIssueByTitle(repository, feature.title);
    if (existingIssueNumber) {
      return { number: existingIssueNumber, created: false };
    }

    const { owner, repo } = this.splitRepo(repository);
    const { data } = await this.octokit.issues.create({
      owner,
      repo,
      title: feature.title,
      body: feature.body,
      labels: feature.labels
    });

    return { number: data.number, created: true };
  }
}
