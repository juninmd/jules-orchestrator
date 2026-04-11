import fs from 'node:fs/promises';
import path from 'node:path';
import { RoadmapParserService, RoadmapTask } from '../services/roadmap-parser.service.js';
import { POService } from '../services/po.service.js';

async function processTaskAndInjectFeature(
  task: RoadmapTask,
  roadmapContent: string,
  poService: POService
): Promise<{ modifiedContent: string, modificationsMade: boolean }> {
  const taskAlreadyExists = roadmapContent.includes(`**Feature: ${task.trigger}**`);
  if (taskAlreadyExists) return { modifiedContent: roadmapContent, modificationsMade: false };

  console.log(`\n========================================`);
  console.log(`🚀 Gatilho detectado: Tarefa '${task.title}' foi concluída!`);
  console.log(`📝 Criando nova tarefa: '${task.trigger}'`);

  try {
    const newFeatureMarkdown = await poService.generateNewFeature(
      task.title,
      task.description,
      task.trigger!
    );

    let updatedContent = roadmapContent;
    const injectionPoint = '## 📝 Gestão do Documento e Próximos Passos';

    if (updatedContent.includes(injectionPoint)) {
        updatedContent = updatedContent.replace(
          injectionPoint,
          `${newFeatureMarkdown}\n\n${injectionPoint}`
        );
    } else {
        updatedContent += `\n\n${newFeatureMarkdown}\n`;
    }

    console.log(`✅ Nova tarefa gerada e injetada no ROADMAP!`);
    return { modifiedContent: updatedContent, modificationsMade: true };
  } catch (err) {
    console.error(`❌ Erro ao gerar nova tarefa via IA para o gatilho '${task.trigger}':`, err);
    return { modifiedContent: roadmapContent, modificationsMade: false };
  }
}

export async function runProductOwnerJob() {
  console.log('🤖 Iniciando rotina: PRODUCT_OWNER');

  const roadmapPath = path.resolve(process.cwd(), 'ROADMAP.md');
  const parser = new RoadmapParserService();
  const poService = new POService();

  try {
    const tasks = await parser.parseRoadmap(roadmapPath);
    let roadmapContent = await fs.readFile(roadmapPath, 'utf-8');
    let hasAnyModifications = false;

    // Procura por tarefas concluídas que têm um gatilho para nova task
    for (const task of tasks) {
      if (task.completed && task.trigger) {
        const { modifiedContent, modificationsMade } = await processTaskAndInjectFeature(
          task,
          roadmapContent,
          poService
        );
        roadmapContent = modifiedContent;
        if (modificationsMade) hasAnyModifications = true;
      }
    }

    if (hasAnyModifications) {
      await fs.writeFile(roadmapPath, roadmapContent, 'utf-8');
      console.log('💾 ROADMAP.md atualizado com novas tarefas geradas.');
    } else {
      console.log('Nenhuma nova task gerada neste ciclo.');
    }

  } catch (error) {
    console.error('❌ Falha na execução do job PRODUCT_OWNER:', error);
  }

  console.log('✅ PRODUCT_OWNER Job concluído.');
}
