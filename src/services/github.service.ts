import { Octokit } from '@octokit/rest';
import { env } from '../config/env.config.js';

export class GithubService {
  private octokit: Octokit;

  constructor() {
    this.octokit = new Octokit({
      auth: env.GITHUB_TOKEN
    });
  }

  async createImprovementIssue(repository: string, title: string, description: string): Promise<string> {
    const owner = repository.split('/')[0];
    const repo = repository.split('/')[1];

    const { data } = await this.octokit.issues.create({
      owner,
      repo,
      title: `[Jules] ${title}`,
      body: description,
      labels: ['enhancement', 'ai-generated']
    });

    return data.html_url;
  }

  async getRepoReadme(repository: string): Promise<string | null> {
    try {
      const owner = repository.split('/')[0];
      const repo = repository.split('/')[1];
      const { data } = await this.octokit.repos.getReadme({
        owner,
        repo,
      });
      return Buffer.from(data.content, 'base64').toString('utf8');
    } catch {
      return null;
    }
  }

  async getRecentIssues(repository: string): Promise<any[]> {
    try {
      const owner = repository.split('/')[0];
      const repo = repository.split('/')[1];
      const { data } = await this.octokit.issues.listForRepo({
        owner,
        repo,
        state: 'open',
        per_page: 3
      });
      return data;
    } catch {
      return [];
    }
  }
  
  async getActiveRepositories(limit: number = 5): Promise<string[]> {
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
}
