import { env } from '../config/env.config.js';
import { generateText, tool, CoreTool } from 'ai';
import { createOllama } from 'ollama-ai-provider';
import { z } from 'zod';
import { GithubService } from './github.service.js';
import { JulesService } from './jules.service.js';

export class AIRouterService {
  private ollama = createOllama({ baseURL: `${env.OLLAMA_HOST}/api` });
  private githubService = new GithubService();
  private julesService = new JulesService();

  /**
   * Analisa a intenção e decide a ferramenta a ser utilizada.
   */
  public async routeImprovement(repository: string, context: string): Promise<void> {
    console.log(`[AIRouterService] Iniciando roteamento da melhoria para ${repository} via Ollama (${env.OLLAMA_MODEL})`);

    try {
      const result = await generateText({
        model: this.ollama(env.OLLAMA_MODEL),
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
             // @ts-ignore: fallback para inferencia do AI SDK
            execute: async ({ instruction }: { instruction: string }) => {
              await this.julesService.invokeSession({
                prompt: instruction,
                repository: repository
              });
              return { message: 'Jules agent invocado com sucesso na nuvem sem gerar issues rastreáveis localmente.' };
            }
          })
        },
        maxSteps: 3 // Permitir que o modelo chame tools, veja a resposta, e chame outra, até 3 vezes
      });

      console.log('[AIRouterService] Resultado final do roteamento:');
      console.log(result.text);

      if (result.toolCalls && result.toolCalls.length > 0) {
        console.log(`[AIRouterService] Foram executados ${result.toolCalls.length} comandos automáticos do Jules/Github!`);
      }
    } catch (error) {
      console.error('[AIRouterService] Falha crítica ao gerar texto/chamar ferramentas.', error);
      throw error;
    }
  }
}
