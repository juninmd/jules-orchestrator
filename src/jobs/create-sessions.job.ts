import { RepoAnalyzerService } from '../services/repo-analyzer.service.js';
import { AIRouterService } from '../services/ai-router.service.js';
import { GithubService } from '../services/github.service.js';
import { TelegramService } from '../services/telegram.service.js';
import { logger } from '../services/logger.service.js';
import { batchProcess } from '../utils/batch.js';

export async function runCreateSessionsJob() {
  logger.info('CreateSessions', 'Iniciando rotina: CREATE_SESSIONS');

  const analyzer = new RepoAnalyzerService();
  const router = new AIRouterService();
  const githubService = new GithubService();
  const telegramService = new TelegramService();

  const repos = await githubService.getActiveRepositories(20);

  if (!repos.length) {
    logger.info('CreateSessions', 'Zero repositórios ativos encontrados.');
    return;
  }

  logger.info('CreateSessions', `Avaliando ${repos.length} repositórios...`);

  const { successes, failures } = await batchProcess(
    repos,
    async (repo) => {
      const insight = await analyzer.analyzeRepoAndGeneratePrompt(repo);
      if (insight) {
        await telegramService.sendMessage(
          `🤖 Jules Agent acionado!\n\n<b>Repositório:</b> ${repo}\n<b>Ação:</b> Débito técnico SOLID/KISS/DRY detectado.`
        );
        await router.routeImprovement(repo, insight);
        return true;
      }
      return false;
    },
    { concurrency: 3 },
    'CreateSessions'
  );

  const sessionsCreated = successes.filter(Boolean).length;

  if (failures.length > 0) {
    logger.warn('CreateSessions', `${failures.length} repositórios falharam no processamento.`);
  }

  if (sessionsCreated > 0) {
    await telegramService.sendMessage(
      `🤖 <b>Create Sessions:</b> ${sessionsCreated} sessão(ões) criadas para análise de débito técnico.`
    );
  }

  logger.info('CreateSessions', `Job concluído. Sessões criadas: ${sessionsCreated}`);
}