import fsSync from 'node:fs';
import path from 'node:path';

export interface RoadmapTask {
  epic: string;
  title: string;
  description: string;
  completed: boolean;
  trigger?: string;
  rawText: string;
}

export class RoadmapParserService {
  private filepath: string;
  private statepath: string;

  constructor(customPath?: string, statePath?: string) {
    this.filepath = customPath || path.resolve(process.cwd(), 'ROADMAP.md');
    this.statepath = statePath || path.resolve(process.cwd(), '.roadmap-state.json');
  }

  public parse(): RoadmapTask[] {
    if (!fsSync.existsSync(this.filepath)) {
      console.warn(`[RoadmapParserService] Arquivo ${this.filepath} não encontrado.`);
      return [];
    }

    const content = fsSync.readFileSync(this.filepath, 'utf-8');
    const lines = content.split('\n');

    const tasks: RoadmapTask[] = [];
    let currentEpic = '';
    let currentTask: Partial<RoadmapTask> | null = null;
    let descriptionBuffer: string[] = [];

    // Expressões regulares para parsing
    const epicRegex = /^###\s+(ÉPICO\s+.*)/;
    const taskRegex = /^\s*-\s+\[(x| )\]\s+\*\*Feature:\s+(.*)\*\*/i;
    const triggerRegex = /^\s*-\s+\*\*Gatilho de Novas Tasks:\*\*\s+(.*)/i;
    const descItemRegex = /^\s*-\s+/;
    const checkItemRegex = /^\s*-\s+\[[x ]\]\s+/i;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      const epicMatch = line.match(epicRegex);
      if (epicMatch) {
        currentEpic = epicMatch[1].trim();
        continue;
      }

      const taskMatch = line.match(taskRegex);
      if (taskMatch) {
        // Se tinha uma task sendo lida, salvar
        if (currentTask) {
          currentTask.description = descriptionBuffer.join('\n').trim();
          tasks.push(currentTask as RoadmapTask);
        }

        const isCompleted = taskMatch[1].toLowerCase() === 'x';
        currentTask = {
          epic: currentEpic,
          title: taskMatch[2].trim(),
          completed: isCompleted,
          rawText: line,
          trigger: undefined
        };
        descriptionBuffer = [];
        continue;
      }

      if (currentTask) {
        // Identificar se a linha tem o gatilho
        const triggerMatch = line.match(triggerRegex);
        if (triggerMatch) {
          currentTask.trigger = triggerMatch[1].trim();
        } else if (line.trim() !== '' && !line.startsWith('###')) {
           descriptionBuffer.push(line);
        }
      }
    }

    // Fechamento da última task lida
    if (currentTask) {
      currentTask.description = descriptionBuffer.join('\n').trim();
      tasks.push(currentTask as RoadmapTask);
    }

    return tasks;
  }

  public getCompletedTasksWithTriggers(): RoadmapTask[] {
    const tasks = this.parse();
    return tasks.filter(t => t.completed && t.trigger);
  }

  public getProcessedTasks(): string[] {
    if (!fsSync.existsSync(this.statepath)) {
      return [];
    }
    try {
      const data = fsSync.readFileSync(this.statepath, 'utf-8');
      return JSON.parse(data);
    } catch {
      return [];
    }
  }

  public markTaskAsProcessed(taskTitle: string): void {
    const processed = this.getProcessedTasks();
    if (!processed.includes(taskTitle)) {
      processed.push(taskTitle);
      fsSync.writeFileSync(this.statepath, JSON.stringify(processed, null, 2));
    }
  }

  public getUnprocessedCompletedTriggers(): RoadmapTask[] {
    const completedTasks = this.getCompletedTasksWithTriggers();
    const processed = this.getProcessedTasks();
    return completedTasks.filter(t => !processed.includes(t.title));
  }
}
