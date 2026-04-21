import fs from 'node:fs/promises';
import path from 'node:path';
import { env } from '../config/env.config.js';

export class StateStoreService {
  constructor(private readonly baseDir = env.ORCHESTRATOR_STATE_DIR) {}

  private resolvePath(fileName: string): string {
    return path.join(this.baseDir, fileName);
  }

  async ensureReady(): Promise<void> {
    await fs.mkdir(this.baseDir, { recursive: true });
  }

  async appendJsonLine<T extends object>(fileName: string, record: T): Promise<void> {
    await this.ensureReady();
    await fs.appendFile(this.resolvePath(fileName), `${JSON.stringify(record)}\n`, 'utf-8');
  }

  async readJsonLines<T>(fileName: string): Promise<T[]> {
    await this.ensureReady();
    const filePath = this.resolvePath(fileName);
    const content = await fs.readFile(filePath, 'utf-8').catch(error => {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return '';
      throw error;
    });

    return content
      .split('\n')
      .map(line => line.trim())
      .filter(Boolean)
      .map(line => JSON.parse(line) as T);
  }

  async writeText(fileName: string, content: string): Promise<string> {
    await this.ensureReady();
    const filePath = this.resolvePath(fileName);
    await fs.writeFile(filePath, content, 'utf-8');
    return filePath;
  }
}
