import { Octokit } from '@octokit/rest';
import { env } from '../config/env.config.js';
import { RoadmapFeatureIssue } from '../contracts/orchestration.js';

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
    return { owner, repo };
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
    } catch {
      return [];
    }
  }

  async getPullRequestDiff(repository: string, prNumber: number): Promise<string> {
    try {
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
    } catch (err) {
      console.error(`[GithubService] Erro ao buscar diff do PR #${prNumber}:`, err);
      return '';
    }
  }

  async addPullRequestComment(repository: string, prNumber: number, comment: string): Promise<void> {
    try {
      const { owner, repo } = this.splitRepo(repository);

      await this.octokit.issues.createComment({
        owner,
        repo,
        issue_number: prNumber,
        body: comment
      });
    } catch (err) {
      console.error(`[GithubService] Erro ao adicionar comentário no PR #${prNumber}:`, err);
    }
  }

  async listPullRequestComments(repository: string, prNumber: number): Promise<string[]> {
    try {
      const { owner, repo } = this.splitRepo(repository);

      const { data } = await this.octokit.issues.listComments({
        owner,
        repo,
        issue_number: prNumber,
        per_page: 100
      });

      return data.map(comment => comment.body).filter((comment): comment is string => Boolean(comment));
    } catch (err) {
      console.error(`[GithubService] Erro ao listar comentários do PR #${prNumber}:`, err);
      return [];
    }
  }

  async mergePullRequest(repository: string, prNumber: number, mergeMessage: string): Promise<void> {
    try {
      const { owner, repo } = this.splitRepo(repository);

      await this.octokit.pulls.merge({
        owner,
        repo,
        pull_number: prNumber,
        commit_title: `Merge origin PR #${prNumber} (Automated Squash)`,
        commit_message: mergeMessage,
        merge_method: 'squash'
      });
    } catch (err) {
      console.error(`[GithubService] Erro ao fazer Squash Merge no PR #${prNumber}:`, err);
    }
  }

  async getActiveRepositories(limit: number = 5): Promise<string[]> {
    if (this.targetRepositories.length > 0) {
      return this.targetRepositories.slice(0, limit);
    }

    try {
      const { data } = await this.octokit.repos.listForAuthenticatedUser({
        sort: 'pushed',
        direction: 'desc',
        per_page: limit
      });
      return data.map(r => r.full_name);
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
      const { data } = await this.octokit.repos.listForAuthenticatedUser({
        sort: 'pushed',
        direction: 'desc',
        per_page: perPage,
        page
      });
      repos.push(...data.map(r => r.full_name));
      if (data.length < perPage) break;
      page++;
    }
    return repos;
  }

  async listIssuesByLabel(repository: string, label: string): Promise<{ number: number; title: string; body: string }[]> {
    try {
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
    } catch {
      return [];
    }
  }

  async listIssueComments(repository: string, issueNumber: number): Promise<{ body: string; user: string }[]> {
    try {
      const { owner, repo } = this.splitRepo(repository);
      const { data } = await this.octokit.issues.listComments({
        owner,
        repo,
        issue_number: issueNumber,
        per_page: 50
      });
      return data.map(c => ({ body: c.body || '', user: c.user?.login || '' }));
    } catch {
      return [];
    }
  }

  async addLabelToIssue(repository: string, issueNumber: number, label: string): Promise<void> {
    const { owner, repo } = this.splitRepo(repository);
    await this.octokit.issues.addLabels({ owner, repo, issue_number: issueNumber, labels: [label] });
  }

  async removeLabelFromIssue(repository: string, issueNumber: number, label: string): Promise<void> {
    const { owner, repo } = this.splitRepo(repository);
    await this.octokit.issues.removeLabel({ owner, repo, issue_number: issueNumber, name: label }).catch(() => {});
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
    const { owner, repo } = this.splitRepo(repository);
    const { data: ref } = await this.octokit.git.getRef({ owner, repo, ref: `heads/${fromRef}` });
    await this.octokit.git.createRef({ owner, repo, ref: `refs/heads/${branchName}`, sha: ref.object.sha });
  }

  async createOrUpdateFile(repository: string, filePath: string, content: string, message: string, branch: string, sha?: string): Promise<void> {
    const { owner, repo } = this.splitRepo(repository);
    await this.octokit.repos.createOrUpdateFileContents({
      owner, repo, path: filePath, message, branch,
      content: Buffer.from(content).toString('base64'),
      ...(sha ? { sha } : {})
    });
  }

  async createPullRequest(repository: string, title: string, body: string, head: string, base = 'master'): Promise<number> {
    const { owner, repo } = this.splitRepo(repository);
    const { data } = await this.octokit.pulls.create({ owner, repo, title, body, head, base });
    return data.number;
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
