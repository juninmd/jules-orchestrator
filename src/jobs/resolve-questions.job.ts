import { generateText } from 'ai';
import { createOllama } from 'ollama-ai-provider';
import { GithubService } from '../services/github.service.js';
import { TelegramService } from '../services/telegram.service.js';
import { env } from '../config/env.config.js';
import { logger } from '../services/logger.service.js';

const BOT_MARKER = '<!-- jules-orchestrator:answer -->';
const LABEL_PENDING = 'pending-jules';
const LABEL_DONE = 'jules-responded';

export async function runResolveQuestionsJob() {
  logger.info('ResolveQuestions', 'Iniciando rotina: RESOLVE_QUESTIONS');

  const githubService = new GithubService();
  const telegramService = new TelegramService();
  const ollama = createOllama({ baseURL: env.OLLAMA_HOST + '/api' });
  let answered = 0;

  const repos = await githubService.getAllRepositories();

  for (const repo of repos) {
    const issues = await githubService.listIssuesByLabel(repo, LABEL_PENDING);
    if (!issues.length) continue;

    for (const issue of issues) {
      logger.info(repo, `Respondendo issue #${issue.number}: ${issue.title}`);

      try {
        const comments = await githubService.listIssueComments(repo, issue.number);
        if (comments.some(c => c.body.includes(BOT_MARKER))) {
          logger.info(repo, `Issue #${issue.number} já respondida. Pulando.`);
          continue;
        }

        const recentComments = comments.slice(-5).map(c => `[${c.user}]: ${c.body}`).join('\n');
        const context = `Título: ${issue.title}\n\nDescrição:\n${issue.body}\n\nComentários recentes:\n${recentComments}`;

        const { text } = await generateText({
          model: ollama(env.OLLAMA_MODEL) as Parameters<typeof generateText>[0]['model'],
          prompt: `Você é um engenheiro sênior respondendo uma dúvida técnica aberta como Issue no GitHub.
Responda de forma clara, objetiva e com exemplos de código quando aplicável.

${context}`,
          abortSignal: AbortSignal.timeout(180_000),
          maxRetries: 2
        });

        const answer = `${BOT_MARKER}\n🤖 **Resposta Automática do Jules Orchestrator:**\n\n${text.trim()}`;
        await githubService.addPullRequestComment(repo, issue.number, answer);
        await githubService.removeLabelFromIssue(repo, issue.number, LABEL_PENDING);
        await githubService.addLabelToIssue(repo, issue.number, LABEL_DONE);
        answered++;

        logger.info(repo, `Issue #${issue.number} respondida com sucesso.`);
      } catch (error) {
        logger.error(repo, `Erro respondendo issue #${issue.number}`, error);
      }
    }
  }

  if (answered > 0) {
    await telegramService.sendMessage(`🤖 <b>Resolve Questions:</b> ${answered} issue(s) respondida(s) automaticamente.`);
  }

  logger.info('ResolveQuestions', `Job concluído. Total respondidas: ${answered}`);
}
