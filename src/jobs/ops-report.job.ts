import { OpsReportService } from '../services/ops-report.service.js';
import { logger } from '../services/logger.service.js';

export async function runOpsReportJob(): Promise<void> {
  logger.info('OpsReport', 'Gerando relatório operacional local');
  const result = await new OpsReportService().generate();
  logger.info('OpsReport', `HTML: ${result.htmlPath}`);
  logger.info('OpsReport', `JSON: ${result.jsonPath}`);
  logger.info('OpsReport', `Runs=${result.runs} Eventos=${result.events}`);
}
