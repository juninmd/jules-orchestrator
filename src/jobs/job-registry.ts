import { runCreateSessionsJob } from './create-sessions.job.js';
import { runProductOwnerJob } from './product-owner.job.js';
import { runResolveQuestionsJob } from './resolve-questions.job.js';
import { runReviewPrsJob } from './review-prs.job.js';
import { runSelfHealingJob } from './self-healing.job.js';
import { runOpsReportJob } from './ops-report.job.js';
import { SUPPORTED_JOB_NAMES, SupportedJobName } from '../contracts/orchestration.js';
import { OrchestratorRuntimeService } from '../services/orchestrator-runtime.service.js';

const jobHandlers = {
  'create-sessions': runCreateSessionsJob,
  'product-owner': runProductOwnerJob,
  'resolve-questions': runResolveQuestionsJob,
  'review-prs': runReviewPrsJob,
  'self-healing': runSelfHealingJob,
  'ops-report': runOpsReportJob
} as const;

export async function runConfiguredJob(jobName: string | undefined): Promise<SupportedJobName> {
  const selectedJob = (jobName && SUPPORTED_JOB_NAMES.includes(jobName as SupportedJobName) ? jobName : 'review-prs') as SupportedJobName;

  if (!jobName || selectedJob !== jobName) {
    console.warn(`[AVISO] JOB_NAME inválido ou ausente. Executando ${selectedJob} por padrão.`);
  }

  await new OrchestratorRuntimeService().runJob(selectedJob, jobHandlers[selectedJob]);
  return selectedJob;
}
