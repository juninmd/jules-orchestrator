import * as fs from 'fs/promises';

export interface RoadmapTask {
  title: string;
  description: string;
  completed: boolean;
  trigger?: string;
}

export class RoadmapParserService {
  /**
   * Lê o arquivo de roadmap e extrai as tarefas (features)
   */
  async parseRoadmap(filePath: string): Promise<RoadmapTask[]> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      return this.extractTasks(content);
    } catch (error) {
      console.error(`[RoadmapParserService] Erro ao ler o arquivo ${filePath}:`, error);
      return [];
    }
  }

  /**
   * Extrai as tasks e verifica seus status e gatilhos de forma programática.
   */
  extractTasks(markdown: string): RoadmapTask[] {
    const tasks: RoadmapTask[] = [];

    // Expressão regular para encontrar blocos de feature
    // Procura por "- [ ] **Feature:" ou "- [x] **Feature:"
    const featureRegex = /- \[(x| )\] \*\*Feature: (.*?)\*\*/gi;

    let match;
    while ((match = featureRegex.exec(markdown)) !== null) {
      const isCompleted = match[1].toLowerCase() === 'x';
      const title = match[2].trim();
      const startIndex = featureRegex.lastIndex;

      // Find the next feature block or end of string
      const nextFeatureIndex = markdown.substring(startIndex).search(/- \[(?:x| )\] \*\*Feature:/i);
      const endIndex = nextFeatureIndex !== -1 ? startIndex + nextFeatureIndex : markdown.length;

      const body = markdown.substring(startIndex, endIndex);

      // Busca pela descrição (até os critérios de aceite ou o próximo tópico)
      const descMatch = body.match(/- \*\*Descrição:\*\* (.*?)(?:\n|$)/);
      const description = descMatch ? descMatch[1].trim() : '';

      // Busca pelo gatilho, ex: "- **Gatilho de Novas Tasks:** A conclusão desta feature gerará a task \"Nome da Task\"."
      const triggerMatch = body.match(/- \*\*Gatilho de Novas Tasks:\*\*.*?["']([^"']+)["']/i);
      const trigger = triggerMatch ? triggerMatch[1].trim() : undefined;

      tasks.push({
        title,
        description: body.trim() || description,
        completed: isCompleted,
        trigger
      });
    }

    return tasks;
  }
}
