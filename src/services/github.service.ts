import { Octokit } from '@octokit/rest';
import { env } from '../config/env.config.js';

export class GithubService {
  private octokit: Octokit;

  constructor() {
    this.octokit = new Octokit({ auth: env.GITHUB_TOKEN });
  }

  public async createImprovementIssue(title: string, body: string): Promise<string> {
    try {
      const [owner, repo] = env.TARGET_REPO.split('/');
      
      console.log(`[GithubService] Criando Issue no repositório ${owner}/${repo}...`);

      const response = await this.octokit.issues.create({
        owner,
        repo,
        title: `[Enhancement] ${title}`,
        body: `${body}\n\n---\n*Issue gerada automaticamente pelo Jules Orchestrator via Ollama.*`,
        labels: ['enhancement', 'ai-generated']
      });

      console.log(`[GithubService] Issue criada com sucesso: ${response.data.html_url}`);
      return response.data.html_url;
    } catch (error) {
      console.error('[GithubService] Erro ao criar Issue:', error);
      throw error;
    }
  }
}
