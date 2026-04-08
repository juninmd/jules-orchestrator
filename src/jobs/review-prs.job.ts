import { generateText } from 'ai';
import { createOllama } from 'ollama-ai-provider';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import fsSync from 'node:fs';
import { GithubService } from '../services/github.service.js';
import { TelegramService } from '../services/telegram.service.js';
import { env } from '../config/env.config.js';

const execAsync = promisify(exec);

export async function runReviewPrsJob() {
  console.log('🤖 Iniciando rotina: REVIEW_PRS (Autonomous Reviewer)');
  
  const githubService = new GithubService();
  const telegramService = new TelegramService();
  const ollama = createOllama({ baseURL: env.OLLAMA_HOST + '/api' });
  const model = ollama(env.OLLAMA_MODEL);

  const repos = await githubService.getActiveRepositories(5);

  if (!repos.length) {
    console.log('Zero repositórios ativos encontrados.');
    return;
  }

  for (const repo of repos) {
    console.log(`\n========================================`);
    console.log(`👁️ Revisando Pull Requests de: ${repo}`);
    
    try {
      const openPrs = await githubService.getOpenPullRequests(repo);
      
      if (openPrs.length === 0) {
        console.log(`Nenhum PR aberto para avaliar em ${repo}.`);
        continue;
      }

      for (const pr of openPrs) {
        console.log(`\n🔍 Analisando PR #${pr.number}: ${pr.title}`);
        
        // 1. Baixar o código modificado (DIFF) do PR
        const diff = await githubService.getPullRequestDiff(repo, pr.number);
        
        if (!diff || diff.length < 5) {
          console.log(`Diff ausente ou muito curto. Ignorando PR.`);
          continue;
        }

        // NOVIDADE: Auto-Build (Sistema Imumológico)
        const clonePath = `/tmp/.workspace-pr-${pr.number}`;
        if (fsSync.existsSync(clonePath)) fsSync.rmSync(clonePath, { recursive: true, force: true });

        try {
          console.log(`[ReviewPRS] Preparando ambiente isolado para o PR #${pr.number}...`);
          const gitUrl = `https://x-access-token:${env.GITHUB_TOKEN}@github.com/${repo}.git`;
          
          await execAsync(`git clone ${gitUrl} ${clonePath}`);
          await execAsync(`cd ${clonePath} && git fetch origin pull/${pr.number}/head:pr-${pr.number} && git checkout pr-${pr.number}`);
          
          console.log(`[ReviewPRS] Mão na massa! Rodando build pra checar se a app quebra...`);
          await execAsync(`cd ${clonePath} && pnpm install --ignore-scripts && pnpm run build`);
          console.log(`[ReviewPRS] 🟩 Build da Branch do PR Local finalizado com sucesso!`);
        } catch (buildError: any) {
          console.error(`❌ [ReviewPRS] PR #${pr.number} introduziu código que não compila!`);
          await githubService.addPullRequestComment(repo, pr.number, `🚨 **Falha de Compilação Detectada no Orquestrador**\n\nAviso automático: O orquestrador clonou seu código e tentou realizar um \`pnpm run build\` no escopo das suas mudanças, e aconteceu um Crash.\n\n<details><summary>Log da Compilação Local</summary>\n\n\`\`\`\n${buildError.message || buildError}\n\`\`\`\n\n</details>\n\n⛔ **Bloqueado**: Conserte este erro para habilitar a revisão da IA.`);
          await telegramService.sendMessage(`❌ <b>Bloqueio na Fonte</b>\nO PR #${pr.number} em ${repo} injetou código fatal e foi barrado no pnpm build!`);
          continue;
        } finally {
          if (fsSync.existsSync(clonePath)) fsSync.rmSync(clonePath, { recursive: true, force: true });
        }

        // 2. Chamar o Ollama para avaliar a qualidade e perfomance e SOLID do diff
        const reviewPrompt = `
Você é o CTO e Engenheiro de Software Chefe do projeto.
Forneça a sua revisão para o diff do Pull Request em formato de texto.

--- PR DIFF ---
${diff.substring(0, 3000)} // (Lendo os primeiros 3000 chars por segurança estrutural)
----------------

Regras para sua resposta:
- Se o código introduzir falhas brutais, acoplamento desnecessário, logs nojentos, ignorar princípios DRY/KISS, responda começando com a palavra "CRÍTICA:" seguido por um comentário amigável e explicativo de por que o PR não deve ser mergeado ainda.
- Se o código estiver enxuto, direto ao ponto e seguir engenharia boa, responda única e EXATAMENTE com a palavra: "APROVADO".
`;

        const { text } = await generateText({
          // @ts-ignore
          model,
          prompt: reviewPrompt
        });

        const evaluation = text.trim();

        // 3. Tomada de Decisão Autônoma
        if (evaluation === 'APROVADO' || evaluation.startsWith('APROVADO')) {
          console.log(`✅ O PR #${pr.number} tem a bênção do Revisor IA. Aplicando Squash Merge!`);
          
          await githubService.addPullRequestComment(repo, pr.number, "🤖 O código foi revisado por Inteligência Artificial e aprovado para entrar na base baseando-se no framework de qualidade da equipe. Fazendo auto-merge!");
          await githubService.mergePullRequest(repo, pr.number, "Merge via Automação Orquestrador IA.");
          
          await telegramService.sendMessage(`🎉 <b>Novo Squash Merge Automático!</b>\nO PR #${pr.number} de ${repo} foi aprovado com louvores peka IA e mesclado direto na master.`);
          console.log(`🎉 PR #${pr.number} mergeado com sucesso.`);
        } else {
          console.log(`⚠️ O PR #${pr.number} precisa de ajustes. Lançando comentários da revisão...`);
          
          // Tratando a mensagem (retira a tag inicial possivel caso vazada)
          const commentFormated = "🤖 **Análise de Revisão Automática do Código:**\n\n" + evaluation.replace(/^CR[IÍ]TICA:\s*/i, '');
          await githubService.addPullRequestComment(repo, pr.number, commentFormated);
          await telegramService.sendMessage(`⚠️ <b>Revisão Submetida:</b>\nO PR #${pr.number} em ${repo} tomou bloqueio na revisão estrita. O choro é livre no GitHub!`);
          console.log(`💬 Comentário formatado submetido ao Github.`);
        }
      }
    } catch (error) {
      console.error(`❌ Erro revisando PRs do repositório ${repo}:`, error);
    }
  }

  console.log('\n✅ REVIEW_PRS Job concluído.');
}
