import { generateText } from 'ai';
import { createOllama } from 'ollama-ai-provider';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import fsSync from 'node:fs';
import { GithubService } from '../services/github.service.js';
import { appendReviewMarker, createReviewMarker } from '../services/review-comment-marker.service.js';
import { TelegramService } from '../services/telegram.service.js';
import { env } from '../config/env.config.js';
import { createWorkspacePath } from '../services/workspace-path.service.js';
import { safeGitClone, gitFetchPr, detectPackageManager } from '../services/git-helper.service.js';
import { logger } from '../services/logger.service.js';
import { AppError } from '../utils/errors.js';
import { batchProcess } from '../utils/batch.js';

const execAsync = promisify(exec);
const DIFF_LIMIT = 8000;
const LLM_DELAY_MS = 2000;
const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

export async function runReviewPrsJob() {
  logger.info('ReviewPRS', 'Iniciando rotina: REVIEW_PRS (Autonomous Reviewer)');

  const githubService = new GithubService();
  const telegramService = new TelegramService();
  const ollama = createOllama({ baseURL: env.OLLAMA_HOST + '/api' });
  const model = ollama(env.OLLAMA_MODEL);

  const repos = await githubService.getAllRepositories();

  if (!repos.length) {
    logger.info('ReviewPRS', 'Zero repositórios ativos encontrados.');
    return;
  }

  for (const repo of repos) {
    logger.info('ReviewPRS', `Revisando Pull Requests de: ${repo}`);

    try {
      const openPrs = await githubService.getOpenPullRequests(repo);

      if (!openPrs.length) {
        logger.info(repo, 'Nenhum PR aberto para avaliar.');
        continue;
      }

      logger.info(repo, `Encontrados ${openPrs.length} PRs abertos.`);

      const { successes, failures } = await batchProcess(
        openPrs,
        async (pr) => {
          return logger.timed(repo, `Revisar PR #${pr.number}`, async () => {
            const diff = await githubService.getPullRequestDiff(repo, pr.number);

            if (!diff || diff.length < 5) {
              logger.warn(repo, `Diff ausente ou muito curto. Ignorando PR #${pr.number}.`);
              return { skipped: true };
            }

            const reviewMarker = createReviewMarker(diff);
            const existingComments = await githubService.listPullRequestComments(repo, pr.number);

            if (existingComments.some(comment => comment.includes(reviewMarker))) {
              logger.info(repo, `PR #${pr.number} já recebeu feedback para este diff. Pulando.`);
              return { skipped: true };
            }

            const clonePath = createWorkspacePath('review-pr', String(pr.number));
            if (fsSync.existsSync(clonePath)) {
              fsSync.rmSync(clonePath, { recursive: true, force: true });
            }

            try {
              logger.info(repo, `Preparando ambiente isolado para o PR #${pr.number}...`);

              await safeGitClone(repo, env.GITHUB_TOKEN, clonePath);
              await gitFetchPr(clonePath, pr.number);

              const pm = detectPackageManager(clonePath);
              logger.info(repo, `Package manager detectado: ${pm.name}`);
              await execAsync(`cd "${clonePath}" && ${pm.install} && ${pm.build}`);
              logger.info(repo, `Build do PR #${pr.number} finalizado com sucesso!`);
            } catch (buildError: unknown) {
              const errMsg = buildError instanceof Error ? buildError.message : String(buildError);
              logger.error(repo, `PR #${pr.number} introduziu código que não compila!`);

              await githubService.addPullRequestComment(
                repo,
                pr.number,
                appendReviewMarker(
                  `🚨 **Falha de Compilação Detectada no Orquestrador**\n\nAviso automático: O orquestrador clonou seu código e tentou realizar um build no escopo das suas mudanças, e aconteceu um Crash.\n\n<details><summary>Log da Compilação Local</summary>\n\n\`\`\`\n${errMsg}\n\`\`\`\n\n</details>\n\n⛔ **Bloqueado**: Conserte este erro para habilitar a revisão da IA.`,
                  diff
                )
              );

              await telegramService.sendMessage(
                `❌ <b>Bloqueio na Fonte</b>\nO PR #${pr.number} em ${repo} injetou código fatal e foi barrado no build!`
              );

              return { buildFailed: true };
            } finally {
              if (fsSync.existsSync(clonePath)) {
                fsSync.rmSync(clonePath, { recursive: true, force: true });
              }
            }

            const reviewPrompt = `
Você é o CTO e Engenheiro de Software Chefe do projeto.
Forneça a sua revisão para o diff do Pull Request em formato de texto.

--- PR DIFF ---
${diff.substring(0, DIFF_LIMIT)}
----------------

Regras para sua resposta:
- Se o código introduzir falhas brutais, acoplamento desnecessário, logs nojentos, ignorar princípios DRY/KISS, responda começando com a palavra "CRÍTICA:" seguido por um comentário amigável e explicativo de por que o PR não deve ser mergeado ainda.
- Se o código estiver enxuto, direto ao ponto e seguir engenharia boa, responda única e EXATAMENTE com a palavra: "APROVADO".
`.trim();

            const { text } = await generateText({
              model: model as Parameters<typeof generateText>[0]['model'],
              prompt: reviewPrompt,
              abortSignal: AbortSignal.timeout(180_000),
              maxRetries: 2
            });

            const evaluation = text.trim();

            if (evaluation === 'APROVADO' || evaluation.startsWith('APROVADO')) {
              logger.info(repo, `PR #${pr.number} aprovado pela IA. Aplicando Squash Merge!`);

              await githubService.addPullRequestComment(
                repo,
                pr.number,
                "🤖 O código foi revisado por Inteligência Artificial e aprovado para entrar na base baseando-se no framework de qualidade da equipe. Fazendo auto-merge!"
              );
              await githubService.mergePullRequest(repo, pr.number, "Merge via Automação Orquestrador IA.");

              await telegramService.sendMessage(
                `🎉 <b>Novo Squash Merge Automático!</b>\nO PR #${pr.number} de ${repo} foi aprovado com louvores pela IA e mesclado direto na master.`
              );
            } else {
              logger.info(repo, `PR #${pr.number} precisa de ajustes. Lançando comentários da revisão...`);

              const commentFormated = "🤖 **Análise de Revisão Automática do Código:**\n\n" +
                evaluation.replace(/^CR[IÍ]TICA:\s*/i, '');

              await githubService.addPullRequestComment(
                repo,
                pr.number,
                appendReviewMarker(commentFormated, diff)
              );
              await telegramService.sendMessage(
                `⚠️ <b>Revisão Submetida:</b>\nO PR #${pr.number} em ${repo} tomou bloqueio na revisão estrita.`
              );
            }

            await delay(LLM_DELAY_MS);
            return { approved: evaluation === 'APROVADO' || evaluation.startsWith('APROVADO') };
          });
        },
        { concurrency: 2 },
        'ReviewPRS'
      );

      if (failures.length > 0) {
        logger.warn('ReviewPRS', `${failures.length} PRs falharam no processamento.`);
      }
    } catch (error) {
      logger.error(repo, 'Erro revisando PRs', error);
    }
  }

  logger.info('ReviewPRS', `Job concluído.`);
}