import { randomUUID } from 'node:crypto';
import { AuditEvent, JobRunRecord, RunStatus, SupportedJobName } from '../contracts/orchestration.js';
import { StateStoreService } from './state-store.service.js';

const RUNS_FILE = 'runs.jsonl';
const EVENTS_FILE = 'events.jsonl';

function now(): string {
  return new Date().toISOString();
}

export class AuditLogService {
  constructor(private readonly store = new StateStoreService()) {}

  async startRun(jobName: SupportedJobName): Promise<JobRunRecord> {
    const run: JobRunRecord = {
      runId: randomUUID(),
      jobName,
      status: 'running',
      startedAt: now()
    };
    await this.store.appendJsonLine(RUNS_FILE, run);
    return run;
  }

  async finishRun(run: JobRunRecord, status: Exclude<RunStatus, 'running'>, error?: unknown): Promise<JobRunRecord> {
    const finishedAt = now();
    const durationMs = Date.parse(finishedAt) - Date.parse(run.startedAt);
    const completed: JobRunRecord = {
      ...run,
      status,
      finishedAt,
      durationMs
    };

    const message = error instanceof Error ? error.message : error ? String(error) : undefined;
    if (message) completed.errorMessage = message;

    await this.store.appendJsonLine(RUNS_FILE, completed);
    return completed;
  }

  async recordEvent(event: Omit<AuditEvent, 'id' | 'createdAt'>): Promise<AuditEvent> {
    const record: AuditEvent = {
      id: randomUUID(),
      createdAt: now(),
      ...event
    };
    await this.store.appendJsonLine(EVENTS_FILE, record);
    return record;
  }

  async listRuns(): Promise<JobRunRecord[]> {
    return this.store.readJsonLines<JobRunRecord>(RUNS_FILE);
  }

  async listEvents(): Promise<AuditEvent[]> {
    return this.store.readJsonLines<AuditEvent>(EVENTS_FILE);
  }
}
