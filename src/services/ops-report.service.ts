import { AuditLogService } from './audit-log.service.js';
import { StateStoreService } from './state-store.service.js';
import { AuditEvent, JobRunRecord } from '../contracts/orchestration.js';

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function latestCompletedRuns(runs: JobRunRecord[]): JobRunRecord[] {
  return runs
    .filter(run => run.status !== 'running')
    .sort((a, b) => Date.parse(b.finishedAt ?? b.startedAt) - Date.parse(a.finishedAt ?? a.startedAt))
    .slice(0, 20);
}

function renderHtml(runs: JobRunRecord[], events: AuditEvent[]): string {
  const runRows = latestCompletedRuns(runs).map(run => `
    <tr>
      <td>${escapeHtml(run.jobName)}</td>
      <td><span class="status ${run.status}">${escapeHtml(run.status)}</span></td>
      <td>${escapeHtml(run.startedAt)}</td>
      <td>${run.durationMs ?? 0}ms</td>
      <td>${escapeHtml(run.errorMessage ?? '')}</td>
    </tr>
  `).join('');

  const eventRows = events.slice(-30).reverse().map(event => `
    <tr>
      <td>${escapeHtml(event.createdAt)}</td>
      <td>${escapeHtml(event.scope)}</td>
      <td>${escapeHtml(event.action)}</td>
      <td>${escapeHtml(event.message)}</td>
    </tr>
  `).join('');

  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Jules Orchestrator Ops Report</title>
  <style>
    body { margin: 0; font-family: Inter, Segoe UI, sans-serif; background: #0f172a; color: #e2e8f0; }
    main { max-width: 1180px; margin: 0 auto; padding: 32px; }
    h1 { margin: 0 0 8px; font-size: 34px; }
    h2 { margin-top: 32px; }
    .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; margin-top: 20px; }
    .metric { background: #111827; border: 1px solid #334155; border-radius: 8px; padding: 16px; }
    .metric strong { display: block; font-size: 28px; color: #f8fafc; }
    table { width: 100%; border-collapse: collapse; background: #111827; border: 1px solid #334155; border-radius: 8px; overflow: hidden; }
    th, td { padding: 12px; border-bottom: 1px solid #334155; text-align: left; vertical-align: top; }
    th { color: #93c5fd; font-size: 13px; text-transform: uppercase; }
    .status { border-radius: 999px; padding: 3px 8px; font-weight: 700; }
    .success { background: #064e3b; color: #bbf7d0; }
    .failed { background: #7f1d1d; color: #fecaca; }
  </style>
</head>
<body>
  <main>
    <h1>Jules Orchestrator</h1>
    <p>Relatório operacional gerado em ${escapeHtml(new Date().toISOString())}</p>
    <section class="summary">
      <div class="metric"><span>Runs registrados</span><strong>${runs.length}</strong></div>
      <div class="metric"><span>Eventos auditados</span><strong>${events.length}</strong></div>
      <div class="metric"><span>Falhas recentes</span><strong>${latestCompletedRuns(runs).filter(run => run.status === 'failed').length}</strong></div>
    </section>
    <h2>Runs recentes</h2>
    <table><thead><tr><th>Job</th><th>Status</th><th>Início</th><th>Duração</th><th>Erro</th></tr></thead><tbody>${runRows}</tbody></table>
    <h2>Eventos recentes</h2>
    <table><thead><tr><th>Quando</th><th>Escopo</th><th>Ação</th><th>Mensagem</th></tr></thead><tbody>${eventRows}</tbody></table>
  </main>
</body>
</html>`;
}

export class OpsReportService {
  constructor(
    private readonly auditLog = new AuditLogService(),
    private readonly store = new StateStoreService()
  ) {}

  async generate(): Promise<{ htmlPath: string; jsonPath: string; runs: number; events: number }> {
    const runs = await this.auditLog.listRuns();
    const events = await this.auditLog.listEvents();
    const payload = {
      generatedAt: new Date().toISOString(),
      runs: latestCompletedRuns(runs),
      events: events.slice(-100)
    };

    const jsonPath = await this.store.writeText('ops-report.json', `${JSON.stringify(payload, null, 2)}\n`);
    const htmlPath = await this.store.writeText('ops-report.html', renderHtml(runs, events));

    return { htmlPath, jsonPath, runs: runs.length, events: events.length };
  }
}
