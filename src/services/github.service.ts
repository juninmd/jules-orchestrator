import { Octokit } from '@octokit/rest';
import { env } from '../config/env.config.js';

export class GithubService {
  private octokit: Octokit;

  constructor() {
    this.octokit = new Octokit({
      auth: env.GITHUB_TOKEN
    });
  }

  async getOpenPullRequests(repository: string): Promise<{ number: number; title: string, body: string }[]> {
    try {
      const owner = repository.split('/')[0];
      const repo = repository.split('/')[1];
      
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
      const owner = repository.split('/')[0];
      const repo = repository.split('/')[1];
      
      const { data } = await this.octokit.pulls.get({
        owner,
        repo,
        pull_number: prNumber,
        mediaType: {
          format: "diff",
        },
      });
      // The response data is the raw diff string when requesting the diff format fallback
      return String(data);
    } catch (err) {
      console.error(`[GithubService] Erro ao buscar diff do PR #${prNumber}:`, err);
      return '';
    }
  }

  async addPullRequestComment(repository: string, prNumber: number, comment: string): Promise<void> {
    try {
      const owner = repository.split('/')[0];
      const repo = repository.split('/')[1];

      await this.octokit.issues.createComment({
        owner,
        repo,
        issue_number: prNumber, // No GITHUB API os PRs usam a rota de issues para comentarios gerais
        body: comment
      });
    } catch (err) {
      console.error(`[GithubService] Erro ao adicionar comentário no PR #${prNumber}:`, err);
    }
  }

  async mergePullRequest(repository: string, prNumber: number, mergeMessage: string): Promise<void> {
    try {
      const owner = repository.split('/')[0];
      const repo = repository.split('/')[1];

      await this.octokit.pulls.merge({
        owner,
        repo,
        pull_number: prNumber,
        commit_title: `Merge origin PR #${prNumber} (Automated Squash)`,
        commit_message: mergeMessage,
        merge_method: 'squash' // FORCING squash merge protocol
      });
    } catch (err) {
      console.error(`[GithubService] Erro ao fazer Squash Merge no PR #${prNumber}:`, err);
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
