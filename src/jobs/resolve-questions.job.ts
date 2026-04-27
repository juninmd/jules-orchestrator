import { generateText } from 'ai';
import { createOllama } from 'ollama-ai-provider';
import { GithubService } from '../services/github.service.js';
import { TelegramService } from '../services/telegram.service.js';
import { env } from '../config/env.config.js';
import { logger } from '../services/logger.service.js';
import { batchProcess } from '../utils/batch.js';

const BOT_MARKER = '<!-- jules-orchestrator:answer -->';
const LABEL_PENDING = 'pending-jules';
const LABEL_DONE = 'jules-responded';

export async function runResolveQuestionsJob() {
  logger.info('ResolveQuestions', 'Iniciando rotina: RESOLVE_QUESTIONS');

  const githubService = new GithubService();
  const telegramService = new TelegramService();
  const ollama = createOllama({ baseURL: env.OLLAMA_HOST + '/api' });
  const model = ollama(env.OLLAMA_MODEL);

  const repos = await githubService.getAllRepositories();

  if (!repos.length) {
    logger.info('ResolveQuestions', 'Zero repositórios encontrados.');
    return;
  }

  let totalAnswered = 0;

  for (const repo of repos) {
    const issues = await githubService.listIssuesByLabel(repo, LABEL_PENDING);
    if (!issues.length) continue;

    logger.info(repo, `Encontradas ${issues.length} issues pendentes.`);

    const { successes } = await batchProcess(
      issues,
      async (issue) => {
        const comments = await githubService.listIssueComments(repo, issue.number);
        if (comments.some(c => c.body.includes(BOT_MARKER))) {
          logger.info(repo, `Issue #${issue.number} já respondida. Pulando.`);
          return false;
        }

        const recentComments = comments.slice(-5).map(c => `[${c.user}]: ${c.body}`).join('\n');
        const context = `Título: ${issue.title}\n\nDescrição:\n${issue.body}\n\nComentários recentes:\n${recentComments}`;

        const { text } = await logger.timed(repo, `Respondendo issue #${issue.number}`, () =>
          generateText({
            model: model as Parameters<typeof generateText>[0]['model'],
            prompt: `Você é um engenheiro sênior respondendo uma dúvida técnica aberta como Issue no GitHub.
Responda de forma clara, objetiva e com exemplos de código quando aplicável.

${context}`,
            abortSignal: AbortSignal.timeout(180_000),
            maxRetries: 2
          })
        );

        const answer = `${BOT_MARKER}\n🤖 **Resposta Automática do Jules Orchestrator:**\n\n${text.trim()}`;
        await githubService.addPullRequestComment(repo, issue.number, answer);
        await githubService.removeLabelFromIssue(repo, issue.number, LABEL_PENDING);
        await githubService.addLabelToIssue(repo, issue.number, LABEL_DONE);

        logger.info(repo, `Issue #${issue.number} respondida com sucesso.`);
        return true;
      },
      { concurrency: 3 },
      'ResolveQuestions'
    );

    totalAnswered += successes.filter(Boolean).length;
  }

  if (totalAnswered > 0) {
    await telegramService.sendMessage(
      `🤖 <b>Resolve Questions:</b> ${totalAnswered} issue(s) respondida(s) automaticamente.`
    );
  }

  logger.info('ResolveQuestions', `Job concluído. Total respondidas: ${totalAnswered}`);
}