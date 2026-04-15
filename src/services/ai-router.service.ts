import { env } from '../config/env.config.js';
import { generateText, tool } from 'ai';
import { createOllama } from 'ollama-ai-provider';
import { z } from 'zod';
import { JulesService } from './jules.service.js';
import { logger } from './logger.service.js';

export class AIRouterService {
  private ollama = createOllama({ baseURL: `${env.OLLAMA_HOST}/api` });
  private julesService = new JulesService();

  public async routeImprovement(repository: string, context: string): Promise<void> {
    logger.info('AIRouter', `Roteando melhoria para ${repository} via Ollama (${env.OLLAMA_MODEL})`);

    try {
      const result = await generateText({
        model: this.ollama(env.OLLAMA_MODEL) as Parameters<typeof generateText>[0]['model'],
        prompt: `Analise as necessidades de melhoria do projeto e execute os comandos mais eficientes.
CONTEXTO: ${context}
Se precisar de código no github, crie uma issue.
Se precisar acordar o agente Jules para já resolver, chame o agente.`,
        tools: {
          requestJulesAgent: tool({
            description: 'Instrui a inteligência artificial corporativa (Agente Jules da Google) a implementar uma refatoração em um repositório.',
            parameters: z.object({
              instruction: z.string().describe('Instrução extremamente detalhada focada no problema com regras SOLID e Arquiteturais.')
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
        abortSignal: AbortSignal.timeout(180_000),
        maxRetries: 2
      });

      logger.info('AIRouter', `Resultado: ${result.text}`);

      if (result.toolResults && result.toolResults.length > 0) {
        logger.info('AIRouter', `Executados ${result.toolResults.length} comandos automáticos.`);
      }
    } catch (error) {
      logger.error('AIRouter', 'Falha crítica ao gerar texto/chamar ferramentas.', error);
      throw error;
    }
  }
}
