import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import path from 'node:path';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { generateText } from 'ai';
import { createOllama } from 'ollama-ai-provider';
import { env } from '../config/env.config.js';
import { GithubService } from './github.service.js';

const execAsync = promisify(exec);

const SOURCE_EXTENSIONS = new Set(['.ts', '.js', '.tsx', '.jsx', '.py', '.go', '.java', '.cs', '.rb', '.php']);
const IGNORE_DIRS = new Set(['node_modules', '.git', 'dist', 'build', '.next', 'vendor', '__pycache__', 'coverage']);

async function collectSourceFiles(dir: string, maxChars = 6000): Promise<string> {
  const chunks: string[] = [];
  let total = 0;

  async function walk(current: string) {
    if (total >= maxChars) return;
    const entries = await fs.readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      if (total >= maxChars) break;
      if (IGNORE_DIRS.has(entry.name)) continue;
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        await walk(full);
      } else if (SOURCE_EXTENSIONS.has(path.extname(entry.name))) {
        const content = await fs.readFile(full, 'utf-8').catch(() => '');
        const relative = path.relative(dir, full);
        const snippet = `\n--- ${relative} ---\n${content}`;
        chunks.push(snippet);
        total += snippet.length;
      }
    }
  }

  await walk(dir);
  return chunks.join('').slice(0, maxChars);
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

      console.log(`[RepoAnalyzer] 📂 Lendo arquivos fonte de ${repoName}...`);
      const sourceCode = await collectSourceFiles(clonePath);

      const prompt = `Você é um engenheiro sênior revisando o código abaixo em busca de oportunidades de refatoração.
${prMemoryContext}
--- CÓDIGO FONTE ---
${sourceCode}
--- FIM DO CÓDIGO ---

Retorne UNICAMENTE UM parágrafo descrevendo a principal refatoração de Clean Code (SOLID/DRY/KISS) a ser feita e em qual arquivo, que ainda não esteja coberta pelos PRs ignorados acima.
Se estiver tudo perfeito ou tudo já coberto pelos PRs, responda EXATAMENTE: 'NENHUMA AÇÃO NECESSÁRIA' e nada mais.`;

      console.log(`[RepoAnalyzer] 🤖 Analisando ${repoName} via Ollama...`);
      const ollama = createOllama({ baseURL: env.OLLAMA_HOST + '/api' });
      const { text } = await generateText({
        // @ts-ignore
        model: ollama(env.OLLAMA_MODEL),
        prompt,
        maxRetries: 0,
        abortSignal: AbortSignal.timeout(180_000)
      });

      await fs.rm(clonePath, { recursive: true, force: true });
      console.log(`[RepoAnalyzer] 🧹 Clone de ${repoName} removido do disco.`);

      const response = text.trim();

      if (response.includes('NENHUMA AÇÃO NECESSÁRIA')) {
        console.log(`[RepoAnalyzer] Nenhuma oportunidade identificada no momento para ${repoName}.`);
        return null;
      }

      console.log(`[RepoAnalyzer] 💡 Descoberta: ${response}`);
      return response;
    } catch (error) {
      console.error(`[RepoAnalyzer] ❌ Falha crítica ao processar ${repoName}:`, error);
      if (fsSync.existsSync(clonePath)) {
        await fs.rm(clonePath, { recursive: true, force: true }).catch(() => {});
      }
      return null;
    }
  }
}
