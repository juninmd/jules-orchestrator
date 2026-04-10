import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { env } from '../config/env.config.js';
import { GithubService } from './github.service.js';

const execAsync = promisify(exec);

const OPENCODE_CONFIG_DIR = path.join(os.homedir(), '.config', 'opencode');
const OPENCODE_CONFIG_FILE = path.join(OPENCODE_CONFIG_DIR, 'opencode.json');

export async function writeOpencodeConfig(): Promise<void> {
  const config = {
    $schema: 'https://opencode.ai/config.json',
    provider: {
      ollama: {
        name: 'Ollama',
        api: `${env.OLLAMA_HOST}/v1`,
        models: {
          [env.OLLAMA_MODEL]: {}
        }
      }
    }
  };
  await fs.mkdir(OPENCODE_CONFIG_DIR, { recursive: true });
  await fs.writeFile(OPENCODE_CONFIG_FILE, JSON.stringify(config, null, 2));
}

export class RepoAnalyzerService {
  private workspaceBase: string = '/tmp/.workspace';
  private githubService: GithubService;

  constructor() {
    this.githubService = new GithubService();
    if (!fsSync.existsSync(this.workspaceBase)) {
      fsSync.mkdirSync(this.workspaceBase, { recursive: true });
    }
  }

  async analyzeRepoAndGeneratePrompt(repository: string): Promise<string | null> {
    console.log(`\n============== DEEP SCAN: ${repository} ==============`);

    const repoName = repository.split('/')[1];
    const clonePath = path.join(this.workspaceBase, repoName);
    const gitUrl = `https://x-access-token:${env.GITHUB_TOKEN}@github.com/${repository}.git`;

    try {
      if (fsSync.existsSync(clonePath)) {
        await fs.rm(clonePath, { recursive: true, force: true });
      }

      console.log(`[RepoAnalyzer] 📥 Clonando repositório para ${clonePath}...`);
      await execAsync(`git clone --depth 1 ${gitUrl} ${clonePath}`);

      // Sistema Anti-Spam: PRs pendentes como inibidor dinâmico
      const activePRs = await this.githubService.getOpenPullRequests(repository);
      let prMemoryContext = '';
      if (activePRs.length > 0) {
        const prTitles = activePRs.map(pr => `- PR #${pr.number}: ${pr.title}`).join('\n');
        prMemoryContext = `
[MEMÓRIA DE SISTEMA - ANTI SPAM]
O sistema já está trabalhando nos seguintes tópicos (Pull Requests pendentes):
${prTitles}
>>> IGNORAR COMPLETAMENTE E NÃO REPORTAR mudanças envolvendo estes assuntos <<<
`;
      }

      const aiPrompt = `Examine o código fonte atual. ${prMemoryContext}
Retorne UNICA E EXCLUSIVAMENTE UM paragrafo dizendo qual a principal refatoração de Clean Code (SOLID/DRY) a ser feita e em qual arquivo que ainda não foi listada nos ignorados. Se estiver tudo perfeito ou tudo o que achou já está sendo arrumado nos PRs existentes, responda EXATAMENTE: 'NENHUMA AÇÃO NECESSÁRIA' e nada mais.`;

      // Garantir que a config do Ollama está escrita antes de chamar o opencode
      await writeOpencodeConfig();

      const opencodeCmd = `opencode -p "${aiPrompt.replace(/"/g, '\\"').replace(/\n/g, ' ')}" --model ollama/${env.OLLAMA_MODEL}`;

      console.log(`[RepoAnalyzer] 🤖 Executando OpenCode via Ollama em ${repoName}...`);
      const { stdout } = await execAsync(opencodeCmd, { cwd: clonePath });

      await fs.rm(clonePath, { recursive: true, force: true });
      console.log(`[RepoAnalyzer] 🧹 Clone de ${repoName} removido do disco.`);

      const response = stdout.trim();

      if (response.includes('NENHUMA AÇÃO NECESSÁRIA')) {
        console.log(`[RepoAnalyzer] Nenhuma oportunidade identificada no momento para ${repoName}.`);
        return null;
      }

      console.log(`[RepoAnalyzer] 💡 Descoberta do OpenCode: ${response}`);
      return response;
    } catch (error) {
      console.error(`[RepoAnalyzer] ❌ Falha crítica ao processar RAG em ${repoName}:`, error);
      if (fsSync.existsSync(clonePath)) {
        await fs.rm(clonePath, { recursive: true, force: true }).catch(() => {});
      }
      return null;
    }
  }
}
