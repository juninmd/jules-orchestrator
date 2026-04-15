import { RepoAnalyzerService } from '../services/repo-analyzer.service.js';
import { AIRouterService } from '../services/ai-router.service.js';
import { GithubService } from '../services/github.service.js';
import { TelegramService } from '../services/telegram.service.js';
import { logger } from '../services/logger.service.js';

export async function runCreateSessionsJob() {
  logger.info('CreateSessions', 'Iniciando rotina: CREATE_SESSIONS');

  const analyzer = new RepoAnalyzerService();
  const router = new AIRouterService();
  const githubService = new GithubService();
  const telegramService = new TelegramService();
  let sessionsCreated = 0;

  const repos = await githubService.getActiveRepositories(20);

  if (!repos.length) {
    logger.info('CreateSessions', 'Zero repositórios ativos encontrados.');
    return;
  }

  for (const repo of repos) {
    if (!repo) continue;

    logger.info(repo, 'Avaliando repositório...');

    try {
      const insight = await analyzer.analyzeRepoAndGeneratePrompt(repo);

      if (insight) {
        sessionsCreated++;
        await telegramService.sendMessage(`🤖 Jules Agent acionado!\n\n<b>Repositório:</b> ${repo}\n<b>Ação:</b> Débito técnico SOLID/KISS/DRY detectado.`);
        await router.routeImprovement(repo, insight);
      }
    } catch (error) {
      logger.error(repo, 'Erro processando repositório', error);
    }
  }

  logger.info('CreateSessions', `Job concluído. Sessões criadas: ${sessionsCreated}`);
}
