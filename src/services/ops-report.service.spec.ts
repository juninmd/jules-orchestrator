import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AuditLogService } from './audit-log.service.js';
import { OpsReportService } from './ops-report.service.js';
import { StateStoreService } from './state-store.service.js';

describe('OpsReportService', () => {
  let tmpDir: string;
  let store: StateStoreService;
  let audit: AuditLogService;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'jules-ops-'));
    store = new StateStoreService(tmpDir);
    audit = new AuditLogService(store);
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('generates json and html reports from audit data', async () => {
    const run = await audit.startRun('ops-report');
    await audit.finishRun(run, 'success');
    await audit.recordEvent({
      runId: run.runId,
      jobName: 'ops-report',
      scope: 'test',
      action: 'render',
      status: 'success',
      message: 'ok'
    });

    const result = await new OpsReportService(audit, store).generate();

    await expect(fs.readFile(result.htmlPath, 'utf-8')).resolves.toContain('Jules Orchestrator');
    await expect(fs.readFile(result.jsonPath, 'utf-8')).resolves.toContain('"events"');
    expect(result.runs).toBe(2);
    expect(result.events).toBe(1);
  });
});
