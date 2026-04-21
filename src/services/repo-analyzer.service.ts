import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import path from 'node:path';
import { generateText } from 'ai';
import { createOllama } from 'ollama-ai-provider';
import { env } from '../config/env.config.js';
import { GithubService } from './github.service.js';
import { createWorkspacePath } from './workspace-path.service.js';
import { safeGitClone } from './git-helper.service.js';
import { logger } from './logger.service.js';
import { StaticAnalysisService } from './static-analysis.service.js';

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
  private githubService: GithubService;
  private staticAnalysisService: StaticAnalysisService;

  constructor() {
    this.githubService = new GithubService();
    this.staticAnalysisService = new StaticAnalysisService();
  }

  async analyzeRepoAndGeneratePrompt(repository: string): Promise<string | null> {
    const repoName = repository.split('/')[1];
    logger.info(repoName, `Deep scan iniciado: ${repository}`);
    const clonePath = createWorkspacePath('repo-scan', repository);
    const workspaceBase = path.dirname(clonePath);

    try {
      if (!fsSync.existsSync(workspaceBase)) {
        fsSync.mkdirSync(workspaceBase, { recursive: true });
      }

      if (fsSync.existsSync(clonePath)) {
        await fs.rm(clonePath, { recursive: true, force: true });
      }

      logger.info(repoName, `Clonando repositório para ${clonePath}...`);
      await safeGitClone(repository, env.GITHUB_TOKEN, clonePath, { depth: 1 });

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

      logger.info(repoName, 'Lendo arquivos fonte...');
      const sourceCode = await collectSourceFiles(clonePath);
      const staticReport = await this.staticAnalysisService.analyzeRepository(repository, clonePath);
      const staticContext = this.staticAnalysisService.formatForPrompt(staticReport);

      const prompt = `Você é um engenheiro sênior revisando o código abaixo em busca de oportunidades de refatoração.
${prMemoryContext}
--- RELATÓRIO ESTÁTICO DETERMINÍSTICO ---
${staticContext}
--- FIM DO RELATÓRIO ---

--- CÓDIGO FONTE ---
${sourceCode}
--- FIM DO CÓDIGO ---

Retorne UNICAMENTE UM parágrafo descrevendo a principal refatoração de Clean Code (SOLID/DRY/KISS) a ser feita e em qual arquivo, que ainda não esteja coberta pelos PRs ignorados acima.
Se estiver tudo perfeito ou tudo já coberto pelos PRs, responda EXATAMENTE: 'NENHUMA AÇÃO NECESSÁRIA' e nada mais.`;

      logger.info(repoName, 'Analisando via Ollama...');
      const ollama = createOllama({ baseURL: env.OLLAMA_HOST + '/api' });
      const { text } = await generateText({
        model: ollama(env.OLLAMA_MODEL) as Parameters<typeof generateText>[0]['model'],
        prompt,
        maxRetries: 0,
        abortSignal: AbortSignal.timeout(env.OLLAMA_TIMEOUT_MS)
      });

      await fs.rm(clonePath, { recursive: true, force: true });
      logger.info(repoName, 'Clone removido do disco.');

      const response = text.trim();

      if (response.includes('NENHUMA AÇÃO NECESSÁRIA')) {
        logger.info(repoName, 'Nenhuma oportunidade identificada.');
        return null;
      }

      logger.info(repoName, `Descoberta: ${response}`);
      return response;
    } catch (error) {
      logger.error(repoName, 'Falha crítica ao processar repositório', error);
      if (fsSync.existsSync(clonePath)) {
        await fs.rm(clonePath, { recursive: true, force: true }).catch(() => {});
      }
      return null;
    }
  }
}
