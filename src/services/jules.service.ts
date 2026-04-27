import { env } from '../config/env.config.js';
import { composeJulesDevelopmentPrompt } from './development-team.service.js';
import { logger } from './logger.service.js';
import { ExternalServiceError } from '../utils/errors.js';
import { withRetry } from '../utils/retry.js';

export interface JulesInvokePayload {
  issueUrl?: string;
  prompt: string;
  repository: string;
}

export class JulesService {
  public async invokeSession(payload: JulesInvokePayload): Promise<void> {
    const url = env.JULES_API_URL;
    const prompt = composeJulesDevelopmentPrompt(payload.repository, payload.prompt);

    if (!url) {
      logger.info('JulesService', `Monitor: Sessão do Jules simulada com sucesso para ${payload.repository}. (URL não configurada)`);
      return;
    }

    try {
      await withRetry(
        () => this.doInvoke(url, prompt, payload.repository),
        {
          maxAttempts: 3,
          initialDelayMs: 2000,
          maxDelayMs: 15000
        },
        'JulesService.invokeSession'
      );
    } catch (error) {
      throw new ExternalServiceError('Jules API invocation failed', 'Jules', { repository: payload.repository, url });
    }
  }

  private async doInvoke(url: string, prompt: string, repository: string): Promise<void> {
    logger.info('JulesService', `Invocando API do Jules em ${url}...`);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': env.JULES_API_KEY
      },
      body: JSON.stringify({
        prompt,
        sourceContext: {
          source: `sources/github/${repository}`,
          githubRepoContext: {
            startingBranch: "master"
          }
        },
        title: "Jules Orchestrator - Autonomous Development Session"
      })
    });

    if (!response.ok) {
      throw new Error(`Jules API returned ${response.status}: ${response.statusText}`);
    }

    logger.info('JulesService', `Sessão iniciada com sucesso. Jules está processando ${repository}!`);
  }
}