import { RoadmapParserService, RoadmapTask } from '../services/roadmap-parser.service.js';
import { POService } from '../services/po.service.js';
import { GithubService } from '../services/github.service.js';
import { TelegramService } from '../services/telegram.service.js';
import { env } from '../config/env.config.js';
import { logger } from '../services/logger.service.js';
import { RoadmapFeatureIssue } from '../contracts/orchestration.js';

const ROADMAP_FILE = 'ROADMAP.md';
const ROADMAP_ISSUE_LABELS = ['enhancement', 'AI-generated', 'autocreated'];

function toRoadmapFeatureIssue(task: RoadmapTask, generatedFeatureMarkdown: string): RoadmapFeatureIssue {
  return {
    title: `Feature: ${task.trigger}`,
    body: [
      'Feature gerada automaticamente pelo P.O. autônomo a partir de um gatilho concluído no ROADMAP.',
      '',
      `Tarefa concluída: ${task.title}`,
      '',
      generatedFeatureMarkdown
    ].join('\n'),
    labels: ROADMAP_ISSUE_LABELS
  };
}

async function processTaskAndInjectFeature(
  task: RoadmapTask,
  roadmapContent: string,
  poService: POService,
  githubService: GithubService,
  repository: string
): Promise<{ modifiedContent: string; modificationsMade: boolean }> {
  const taskAlreadyExists = roadmapContent.includes(`**Feature: ${task.trigger}**`);
  if (taskAlreadyExists) return { modifiedContent: roadmapContent, modificationsMade: false };

  logger.info('PO', `Gatilho detectado: '${task.title}' concluída → criando '${task.trigger}'`);

  try {
    const newFeatureMarkdown = await poService.generateNewFeature(
      task.title,
      task.description,
      task.trigger!
    );
    const issue = await githubService.createIssueFromFeature(
      repository,
      toRoadmapFeatureIssue(task, newFeatureMarkdown)
    );
    logger.info('PO', `Issue #${issue.number} ${issue.created ? 'criada' : 'reutilizada'} para '${task.trigger}'`);

    let updatedContent = roadmapContent;
    const injectionPoint = '## 📝 Gestão do Documento e Próximos Passos';

    if (updatedContent.includes(injectionPoint)) {
      updatedContent = updatedContent.replace(injectionPoint, `${newFeatureMarkdown}\n\n${injectionPoint}`);
    } else {
      updatedContent += `\n\n${newFeatureMarkdown}\n`;
    }

    return { modifiedContent: updatedContent, modificationsMade: true };
  } catch (err) {
    logger.error('PO', `Erro ao gerar feature para gatilho '${task.trigger}'`, err);
    return { modifiedContent: roadmapContent, modificationsMade: false };
  }
}

export async function runProductOwnerJob() {
  logger.info('PO', 'Iniciando rotina: PRODUCT_OWNER');

  const githubService = new GithubService();
  const telegramService = new TelegramService();
  const parser = new RoadmapParserService();
  const poService = new POService();

  const repos = env.TARGET_REPOSITORIES.length > 0
    ? env.TARGET_REPOSITORIES
    : await githubService.getActiveRepositories(5);

  for (const repo of repos) {
    try {
      let fileData: { content: string; sha: string };
      try {
        fileData = await githubService.getFileContents(repo, ROADMAP_FILE);
      } catch {
        logger.info(repo, 'ROADMAP.md não encontrado. Pulando.');
        continue;
      }

      const tasks = parser.extractTasks(fileData.content);
      let roadmapContent = fileData.content;
      let hasModifications = false;

      for (const task of tasks) {
        if (task.completed && task.trigger) {
          const { modifiedContent, modificationsMade } = await processTaskAndInjectFeature(
            task,
            roadmapContent,
            poService,
            githubService,
            repo
          );
          roadmapContent = modifiedContent;
          if (modificationsMade) hasModifications = true;
        }
      }

      if (!hasModifications) {
        logger.info(repo, 'Nenhuma nova task gerada neste ciclo.');
        continue;
      }

      const branchName = `feat/roadmap-${Date.now()}`;
      await githubService.createBranch(repo, branchName);
      await githubService.createOrUpdateFile(
        repo, ROADMAP_FILE, roadmapContent,
        'chore: auto-generate new features from roadmap triggers',
        branchName, fileData.sha
      );
      const prNumber = await githubService.createPullRequest(
        repo,
        '🤖 Roadmap: Novas features geradas automaticamente',
        'Features geradas pelo P.O. autônomo baseadas em gatilhos de tasks concluídas.',
        branchName
      );

      await telegramService.sendMessage(
        `📝 <b>P.O. Autônomo:</b> PR #${prNumber} criado em ${repo} com novas features no ROADMAP.`
      );
      logger.info(repo, `PR #${prNumber} criado com novas features do ROADMAP.`);
    } catch (error) {
      logger.error(repo, 'Falha no job PRODUCT_OWNER', error);
    }
  }

  logger.info('PO', 'Job concluído.');
}
