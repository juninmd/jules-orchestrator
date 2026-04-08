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
          createGithubIssue: tool({
            description: 'Cria uma issue no Repositório do GitHub contendo uma proposta de refatoração ou melhoria técnica.',
            parameters: z.object({
              title: z.string().describe('Título curto e limpo da melhoria.'),
              description: z.string().describe('Descrição clara dos problemas atuais e o que precisa ser feito.')
            }),
            // @ts-ignore: a inferência interna do Zod às vezes falha na tipagem do execute do ai sdk
            execute: async ({ title, description }: { title: string, description: string }) => {
              const url = await this.githubService.createImprovementIssue(repository, title, description);
              return { url, message: 'Issue criada com sucesso no Github.' };
            }
          }),
          triggerJulesAgent: tool({
            description: 'Chama a API do Jules Orchestrator passando as instruções para o robô atuar sobre um Repositório (ou issue).',
            parameters: z.object({
              instruction: z.string().describe('A instrução clara e o prompt de melhoria para o Agente.'),
              githubIssueUrl: z.string().optional().describe('URL da issue do GitHub associada à tarefa (se você já criou uma).')
            }),
            // @ts-ignore: fallback para o mesmo problema
            execute: async ({ instruction, githubIssueUrl }: { instruction: string, githubIssueUrl?: string }) => {
              await this.julesService.invokeSession({
                prompt: instruction,
                repository: repository,
                issueUrl: githubIssueUrl
              });
              return { message: 'Jules agent invocado com sucesso.' };
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
