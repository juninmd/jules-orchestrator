import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import path from 'node:path';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { env } from '../config/env.config.js';
import { GithubService } from './github.service.js';

const execAsync = promisify(exec);

export class RepoAnalyzerService {
  private workspaceBase: string = '/tmp/.workspace';
  private githubService: GithubService;

  constructor() {
    this.githubService = new GithubService();
    // Garantir que a workspace existirá
    if (!fsSync.existsSync(this.workspaceBase)) {
      fsSync.mkdirSync(this.workspaceBase, { recursive: true });
    }
  }

  /**
   * Clona um repositório, roda o OpenCode para analisá-lo e deleta a pasta na sequência.
   */
  async analyzeRepoAndGeneratePrompt(repository: string): Promise<string | null> {
    console.log(`\n============== DEEP SCAN: ${repository} ==============`);
    
    // repository vem no formato owner/repo
    const repoName = repository.split('/')[1];
    const clonePath = path.join(this.workspaceBase, repoName);
    const gitUrl = `https://x-access-token:${env.GITHUB_TOKEN}@github.com/${repository}.git`;

    try {
      // 1. Limpar execução anterior se existir
      if (fsSync.existsSync(clonePath)) {
        await fs.rm(clonePath, { recursive: true, force: true });
      }

      // 2. Clonar Repo
      console.log(`[RepoAnalyzer] 📥 Clonando repositório para ${clonePath}...`);
      await execAsync(`git clone --depth 1 ${gitUrl} ${clonePath}`);

      // 3. Sistema Anti-Spam: Buscar Pull Requests pendentes para servir como inibidor dinâmico
      const activePRs = await this.githubService.getOpenPullRequests(repository);
      let prMemoryContext = '';

      if (activePRs.length > 0) {
        const prTitles = activePRs.map(pr => `- PR #${pr.number}: ${pr.title}`).join('\n');
        prMemoryContext = `
[MEMÓRIA DE SISTEMA - ANTI SPAM]
O sistema já está trabalhando ou revisando no momento os seguintes tópicos pendentes mapeados por Pull Requests:
${prTitles}
>>> IGNORAR COMPLETAMENTE E NÃO REPORTAR OU SUGERIR MUDANÇAS ENVOLVENDO ESTES ASSUNTOS ACIMA <<<.
`;
      }

      // 4. Informar o prompt e forçar stdout
      // O opencode-ai tem um comportamento CLI. Dependendo da api real usaremos echo ou args padrão.
      const aiPrompt = `Examine o código fonte atual. ${prMemoryContext} 
Retorne UNICA E EXCLUSIVAMENTE UM paragrafo dizendo qual a principal refatoração de Clean Code (SOLID/DRY) a ser feita e em qual arquivo que ainda não foi listada nos ignorados. Se estiver tudo perfeito ou tudo o que achou já está sendo arrumado nos PRs existentes, responda EXATAMENTE: 'NENHUMA AÇÃO NECESSÁRIA' e nada mais.`;
      
      const opencodeCmd = `opencode-ai --non-interactive --message "${aiPrompt}"`;
      
      console.log(`[RepoAnalyzer] 🤖 Executando OpenCode via Ollama em ${repoName}...`);
      
      // Assumindo que opencode usará as configs/modelos previamente associadas na maquina/imagem
      const { stdout } = await execAsync(opencodeCmd, { cwd: clonePath });

      const response = stdout.trim();

      // 4. Faxina: Remover clone (não guardar lixo de RAG local)
      await fs.rm(clonePath, { recursive: true, force: true });
      console.log(`[RepoAnalyzer] 🧹 Clone de ${repoName} removido do disco.`);

      if (response.includes('NENHUMA AÇÃO NECESSÁRIA')) {
        console.log(`[RepoAnalyzer] Nenhuma oportunidade identificada no momento para ${repoName}.`);
        return null;
      }

      console.log(`[RepoAnalyzer] 💡 Descoberta do OpenCode: ${response}`);
      return response;
    } catch (error) {
      console.error(`[RepoAnalyzer] ❌ Falha crítica ao processar RAG em ${repoName}:`, error);
      
      // Cleanup de segurança caso falhe no meio da execução
      if (fsSync.existsSync(clonePath)) {
        await fs.rm(clonePath, { recursive: true, force: true }).catch(() => {});
      }
      return null;
    }
  }
}
