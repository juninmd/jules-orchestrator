import * as fs from 'fs/promises';
import * as path from 'path';
import { RoadmapParserService } from '../services/roadmap-parser.service.js';
import { POService } from '../services/po.service.js';

export async function runProductOwnerJob() {
  console.log('🤖 Iniciando rotina: PRODUCT_OWNER');

  const roadmapPath = path.resolve(process.cwd(), 'ROADMAP.md');
  const parser = new RoadmapParserService();
  const poService = new POService();

  try {
    const tasks = await parser.parseRoadmap(roadmapPath);
    let roadmapContent = await fs.readFile(roadmapPath, 'utf-8');
    let modificationsMade = false;

    // Procura por tarefas concluídas que têm um gatilho para nova task
    for (const task of tasks) {
      if (task.completed && task.trigger) {
        // Verifica se a nova tarefa sugerida já existe no ROADMAP
        const taskAlreadyExists = roadmapContent.includes(`**Feature: ${task.trigger}**`);

        if (!taskAlreadyExists) {
          console.log(`\n========================================`);
          console.log(`🚀 Gatilho detectado: Tarefa '${task.title}' foi concluída!`);
          console.log(`📝 Criando nova tarefa: '${task.trigger}'`);

          try {
            const newFeatureMarkdown = await poService.generateNewFeature(
              task.title,
              task.description,
              task.trigger
            );

            // Adicionar a nova feature ao final do arquivo antes do footer (ou simplesmente append)
            // Uma boa heurística é colocar antes da seção "## 📝 Gestão do Documento e Próximos Passos"
            const injectionPoint = '## 📝 Gestão do Documento e Próximos Passos';

            if (roadmapContent.includes(injectionPoint)) {
               roadmapContent = roadmapContent.replace(
                 injectionPoint,
                 `${newFeatureMarkdown}\n\n${injectionPoint}`
               );
            } else {
               roadmapContent += `\n\n${newFeatureMarkdown}\n`;
            }

            modificationsMade = true;
            console.log(`✅ Nova tarefa gerada e injetada no ROADMAP!`);

          } catch (error) {
            console.error(`❌ Erro ao gerar nova tarefa via IA para o gatilho '${task.trigger}':`, error);
          }
        }
      }
    }

    if (modificationsMade) {
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
