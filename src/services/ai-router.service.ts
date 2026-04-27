import { env } from '../config/env.config.js';
import { generateText, tool } from 'ai';
import { createOllama } from 'ollama-ai-provider';
import { z } from 'zod';
import { JulesService } from './jules.service.js';
import { logger } from './logger.service.js';
import { AIProviderError } from '../utils/errors.js';
import { withTimeout } from '../utils/retry.js';

export class AIRouterService {
  private ollama = createOllama({ baseURL: `${env.OLLAMA_HOST}/api` });
  private julesService = new JulesService();

  public async routeImprovement(repository: string, context: string): Promise<void> {
    logger.info('AIRouter', `Roteando melhoria para ${repository} via Ollama (${env.OLLAMA_MODEL})`);

    try {
      const result = await withTimeout(
        generateText({
          model: this.ollama(env.OLLAMA_MODEL) as Parameters<typeof generateText>[0]['model'],
          prompt: `Você é o coordenador técnico de um time de desenvolvimento autônomo.
Analise a necessidade abaixo e decida se ela deve virar uma sessão real do Jules da Google.

CONTEXTO: ${context}

Critérios:
- Chame o agente Jules quando houver incremento implementável no repositório.
- A instrução deve ser um plano de sessão completo: objetivo, motivo no roadmap, áreas prováveis, critérios de aceite e validação esperada.
- Priorize deixar o projeto funcional, eliminar débito técnico que bloqueia evolução e avançar o produto de forma coerente.
- Não chame o Jules para temas já cobertos por PRs pendentes ou para mudanças vagas sem critério de aceite.`,
          tools: {
            requestJulesAgent: tool({
              description: 'Instrui o Jules da Google a executar uma sessão autônoma de desenvolvimento em um repositório.',
              parameters: z.object({
                instruction: z.string().describe('Plano de sessão detalhado com objetivo, coerência de roadmap, arquivos/áreas, critérios de aceite e validação.')
              }),
              execute: async ({ instruction }: { instruction: string }) => {
                await this.julesService.invokeSession({
                  prompt: instruction,
                  repository: repository
                });
                return { message: 'Jules agent invocado com sucesso.' };
              }
            })
          },
          maxSteps: 3,
          abortSignal: AbortSignal.timeout(env.OLLAMA_TIMEOUT_MS),
          maxRetries: 2
        }),
        env.OLLAMA_TIMEOUT_MS,
        'AIRouter.routeImprovement'
      );

      logger.info('AIRouter', `Resultado: ${result.text}`);

      if (result.toolResults && result.toolResults.length > 0) {
        logger.info('AIRouter', `Executados ${result.toolResults.length} comandos automáticos.`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error('AIRouter', 'Falha ao gerar texto/chamar ferramentas.', error);
      throw new AIProviderError(`Ollama inference failed: ${message}`, { repository, model: env.OLLAMA_MODEL });
    }
  }
}