import { SupportedJobName } from '../contracts/orchestration.js';
import { OrchestratorRuntimeService } from '../services/orchestrator-runtime.service.js';
import { TelegramService } from '../services/telegram.service.js';
import { logger } from '../services/logger.service.js';
import { runCreateSessionsJob } from './create-sessions.job.js';
import { runOpsReportJob } from './ops-report.job.js';
import { runProductOwnerJob } from './product-owner.job.js';
import { runResolveQuestionsJob } from './resolve-questions.job.js';
import { runReviewPrsJob } from './review-prs.job.js';
import { runSelfHealingJob } from './self-healing.job.js';

type AutopilotStageName = Exclude<SupportedJobName, 'autopilot'>;

interface AutopilotStage {
  name: AutopilotStageName;
  description: string;
  handler: () => Promise<void>;
}

const AUTOPILOT_STAGES: AutopilotStage[] = [
  {
    name: 'self-healing',
    description: 'corrigir incidentes de producao antes de evoluir produto',
    handler: runSelfHealingJob
  },
  {
    name: 'review-prs',
    description: 'revisar, validar e integrar PRs abertos',
    handler: runReviewPrsJob
  },
  {
    name: 'resolve-questions',
    description: 'desbloquear duvidas pendentes para manter o fluxo andando',
    handler: runResolveQuestionsJob
  },
  {
    name: 'product-owner',
    description: 'manter roadmap e issues coerentes com entregas concluidas',
    handler: runProductOwnerJob
  },
  {
    name: 'create-sessions',
    description: 'abrir novas sessoes Jules para evolucao e divida tecnica',
    handler: runCreateSessionsJob
  },
  {
    name: 'ops-report',
    description: 'registrar um fechamento operacional do ciclo autonomo',
    handler: runOpsReportJob
  }
];

function formatAutopilotSummary(results: Array<{ stage: AutopilotStage; ok: boolean; error?: unknown }>): string {
  const lines = results.map(({ stage, ok, error }) => {
    const status = ok ? 'OK' : 'FALHOU';
    const reason = error instanceof Error ? ` - ${error.message}` : error ? ` - ${String(error)}` : '';
    return `- ${stage.name}: ${status}${reason}`;
  });

  return [
    '🧭 <b>Autopilot Jules:</b> ciclo autonomo finalizado.',
    '',
    ...lines
  ].join('\n');
}

export async function runAutopilotJob(): Promise<void> {
  logger.info('Autopilot', 'Iniciando ciclo autonomo completo do Jules Orchestrator.');

  const runtime = new OrchestratorRuntimeService();
  const telegramService = new TelegramService();
  const results: Array<{ stage: AutopilotStage; ok: boolean; error?: unknown }> = [];

  for (const stage of AUTOPILOT_STAGES) {
    logger.info('Autopilot', `Executando ${stage.name}: ${stage.description}.`);

    try {
      await runtime.runJob(stage.name, stage.handler);
      results.push({ stage, ok: true });
    } catch (error) {
      results.push({ stage, ok: false, error });
      logger.error('Autopilot', `Etapa ${stage.name} falhou; continuando o ciclo.`, error);
    }
  }

  await telegramService.sendMessage(formatAutopilotSummary(results));

  const failed = results.filter(result => !result.ok);
  if (failed.length > 0) {
    throw new Error(`Autopilot finalizou com ${failed.length} etapa(s) em falha: ${failed.map(result => result.stage.name).join(', ')}`);
  }

  logger.info('Autopilot', 'Ciclo autonomo finalizado com sucesso.');
}
