import { generateText } from 'ai';
import { createOllama } from 'ollama-ai-provider';
import { env } from '../config/env.config.js';
import { GithubService } from './github.service.js';

export class RepoAnalyzerService {
  private ollama: any;
  private githubService: GithubService;

  constructor() {
    this.ollama = createOllama({
      baseURL: env.OLLAMA_HOST + '/api'
    });
    this.githubService = new GithubService();
  }

  /**
   * Analisa um repositório, extrai o contexto base e determina a melhoria necessária.
   */
  async analyzeRepoAndGeneratePrompt(repository: string): Promise<string | null> {
    console.log(`[RepoAnalyzer] Analisando necessidades de: ${repository}...`);
    
    // Obter o conteúdo do README e arquivos básicos do GitHub
    const readMe = await this.githubService.getRepoReadme(repository);
    const recentIssues = await this.githubService.getRecentIssues(repository);

    // Prompt engenhoso para descobrir problemas ou melhorias para o agente Jules
    const contextPrompt = `
      Você é um arquiteto de software assistindo um engenheiro de IA (Agente Jules).
      Analise o seguinte repositório (${repository}) baseado nesta pesquisa rápida:
      
      --- README ---
      ${readMe ? readMe.substring(0, 1500) : 'Sem README.'}
      
      --- RECENT ISSUES ---
      ${recentIssues.length > 0 ? recentIssues.map((i: any) => i.title).join('\n') : 'Nenhuma issue recente.'}
      
      Dada as regras SOLID, KISS e DRY, e considerando este contexto, descreva UMA melhoria clara e focada
      em arquitetura, limpeza de código, observabilidade ou segurança para o agente Jules executar via GitOps/código.
      Responda APENAS com a instrução direta que será passada para o agente, sem enrolação. Se não houver nada urgente, responda "NENHUMA AÇÃO NECESSÁRIA".
    `;

    try {
      const { text } = await generateText({
        model: this.ollama(env.OLLAMA_MODEL),
        prompt: contextPrompt
      });

      const response = text.trim();
      if (response.includes('NENHUMA AÇÃO NECESSÁRIA')) {
        console.log(`[RepoAnalyzer] Nenhuma oportunidade identificada no momento para ${repository}.`);
        return null; // Nenhuma novidade no momento
      }

      console.log(`[RepoAnalyzer] Oportunidade descoberta para ${repository}: ${response}`);
      return response;
    } catch (error) {
      console.error(`[RepoAnalyzer] Erro ao tentar analisar repo pelo Ollama: ${error}`);
      return null;
    }
  }
}
