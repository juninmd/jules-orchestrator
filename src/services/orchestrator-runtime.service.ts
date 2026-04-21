import { AuditLogService } from './audit-log.service.js';
import { logger } from './logger.service.js';
import { SupportedJobName } from '../contracts/orchestration.js';

export class OrchestratorRuntimeService {
  constructor(private readonly auditLog = new AuditLogService()) {}

  async runJob(jobName: SupportedJobName, handler: () => Promise<void>): Promise<void> {
    const run = await this.auditLog.startRun(jobName);
    logger.info('Runtime', `Run ${run.runId} iniciado para ${jobName}`);

    try {
      await handler();
      await this.auditLog.finishRun(run, 'success');
      logger.info('Runtime', `Run ${run.runId} finalizado com sucesso`);
    } catch (error) {
      await this.auditLog.finishRun(run, 'failed', error);
      logger.error('Runtime', `Run ${run.runId} falhou`, error);
      throw error;
    }
  }
}
