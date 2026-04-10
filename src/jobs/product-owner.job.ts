import { env } from '../config/env.config.js';
import { RoadmapParserService } from '../services/roadmap-parser.service.js';
import { GithubService } from '../services/github.service.js';
import { TelegramService } from '../services/telegram.service.js';
import { generateText } from 'ai';
import { createOllama } from 'ollama-ai-provider';
import fsSync from 'node:fs';
import path from 'node:path';

export async function runProductOwnerJob() {
  console.log('🤖 Iniciando rotina: PRODUCT_OWNER (P.O. Autônomo)');

  const parser = new RoadmapParserService();
  const githubService = new GithubService();
  const telegramService = new TelegramService();
  const ollama = createOllama({ baseURL: `${env.OLLAMA_HOST}/api` });
  const model = ollama(env.OLLAMA_MODEL);

  const unprocessedTriggers = parser.getUnprocessedCompletedTriggers();

  if (unprocessedTriggers.length === 0) {
    console.log('Nenhuma nova task finalizada com gatilho detectada no ROADMAP.md.');
    return;
  }

  // Pegamos apenas a primeira tarefa da fila para processar uma por vez
  const taskToProcess = unprocessedTriggers[0];
  console.log(`\n📋 Processando Gatilho da Task Concluída: "${taskToProcess.title}"`);
  console.log(`🎯 Gatilho alvo: "${taskToProcess.trigger}"`);

  try {
    const prompt = `Você é Jules, o Product Owner Autônomo e Líder Técnico deste projeto.
Nós acabamos de concluir a seguinte tarefa no projeto:
TÍTULO: ${taskToProcess.title}
DESCRIÇÃO:
${taskToProcess.description}

Essa tarefa possuía o seguinte GATILHO lógico que deve ser transformado em uma NOVA tarefa:
GATILHO: ${taskToProcess.trigger}

Sua missão é gerar o conteúdo em Markdown puro de UMA NOVA FEATURE que será adicionada ao ROADMAP.md.

Formato OBRIGATÓRIO de saída (não adicione saudações ou explicações fora do formato):
- [ ] **Feature: [Nome curto e descritivo]**
  - **Descrição:** [Descrição detalhada da necessidade arquitetural e da regra de negócio da nova feature]
  - **Critérios de Aceite:**
    - [ ] [Critério 1]
    - [ ] [Critério 2]
    - [ ] [Critério 3]
  - **Gatilho de Novas Tasks:** A conclusão desta feature gerará a task "[Ideia gerada por você para um passo futuro]".`;

    console.log(`🧠 Acionando LLM para gerar a nova feature baseada no gatilho...`);
    const { text: newFeatureMarkdown } = await generateText({
      // @ts-ignore
      model,
      prompt
    });

    const newContent = newFeatureMarkdown.trim();
    console.log(`\n✨ Nova Feature Gerada pelo P.O.:\n${newContent}\n`);

    // Injetando no arquivo ROADMAP.md
    const roadmapPath = path.resolve(process.cwd(), 'ROADMAP.md');
    const currentRoadmap = fsSync.readFileSync(roadmapPath, 'utf-8');

    // Escapa caracteres especiais de regex no nome do epic (ex: parênteses)
    const escapeRegExp = (string: string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const escapedEpic = escapeRegExp(taskToProcess.epic);

    // Injeta logo após o epic a qual a tarefa original pertencia (ou final do arquivo como fallback)
    const epicRegex = new RegExp(`(###\\s+${escapedEpic}[\\s\\S]*?)(?=\\n###|$)`, 'i');
    let updatedRoadmap = currentRoadmap;

    if (epicRegex.test(currentRoadmap)) {
      updatedRoadmap = currentRoadmap.replace(epicRegex, `$1\n\n${newContent}\n`);
    } else {
      updatedRoadmap += `\n\n${newContent}\n`;
    }

    fsSync.writeFileSync(roadmapPath, updatedRoadmap, 'utf-8');
    console.log('📝 ROADMAP.md atualizado localmente.');

    // Preparando issue no github (assumimos repositório de trabalho no primeiro ativo, ou pegamos a env default se existir)
    // Para simplificar no MVP, tentamos enviar no primeiro repositório ativo encontrado.
    const repos = await githubService.getActiveRepositories(1);
    if (repos.length > 0) {
      const targetRepo = repos[0];
      console.log(`🚀 Abrindo Issue no repositório ${targetRepo}...`);

      const issueBody = `🤖 **Feature Gerada Autonomamente pelo P.O. Jules**\n\nCom base na conclusão de: *${taskToProcess.title}*, foi gerada a seguinte necessidade técnica:\n\n${newContent}`;

      const issueUrl = await githubService.createIssue(
        targetRepo,
        `[Auto-PO] ${taskToProcess.trigger}`,
        issueBody
      );

      await telegramService.sendMessage(`🤖 <b>Product Owner Autônomo</b>\nAcabei de gerar uma nova feature baseada na conclusão de "${taskToProcess.title}"!\n\n📌 <b>Nova Issue:</b> <a href="${issueUrl}">${taskToProcess.trigger}</a>`);
    }

    // Marcando como processada apenas ao final de tudo
    parser.markTaskAsProcessed(taskToProcess.title);
    console.log(`✅ Gatilho processado com sucesso. Task marcada no estado.`);

  } catch (error) {
    console.error('❌ Erro no processamento do P.O. Job:', error);
  }
}
