import { env } from '../config/env.config.js';
import { composeJulesDevelopmentPrompt } from './development-team.service.js';

export interface JulesInvokePayload {
  issueUrl?: string; // Optional: we might just pass the github issue URL
  prompt: string;    // The actual raw instruction
  repository: string; // "owner/repo"
}

export class JulesService {
  public async invokeSession(payload: JulesInvokePayload): Promise<void> {
    const url = env.JULES_API_URL;
    const prompt = composeJulesDevelopmentPrompt(payload.repository, payload.prompt);
    
    if (!url) {
      console.log(`[JulesService] Monitor: Sessão do Jules simulada com sucesso para ${payload.repository}. (URL não configurada)`);
      return;
    }

    try {
      console.log(`[JulesService] Invocando API do Jules em ${url}...`);
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': env.JULES_API_KEY
        },
        body: JSON.stringify({
          prompt,
          sourceContext: {
            source: `sources/github/${payload.repository}`,
            githubRepoContext: {
              startingBranch: "master"
            }
          },
          title: "Jules Orchestrator - Autonomous Development Session"
        })
      });

      if (!response.ok) {
        throw new Error(`[JulesService] Retorno inválido da API do Jules: ${response.statusText}`);
      }

      console.log(`[JulesService] Sessão iniciada com sucesso. Jules está processando ${payload.repository}!`);
    } catch (error) {
      console.error('[JulesService] Falha ao invocar sessão.', error);
      throw error;
    }
  }
}
