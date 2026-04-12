import { runCreateSessionsJob } from './create-sessions.job.js';
import { runProductOwnerJob } from './product-owner.job.js';
import { runResolveQuestionsJob } from './resolve-questions.job.js';
import { runReviewPrsJob } from './review-prs.job.js';
import { runSelfHealingJob } from './self-healing.job.js';

const jobHandlers = {
  'create-sessions': runCreateSessionsJob,
  'product-owner': runProductOwnerJob,
  'resolve-questions': runResolveQuestionsJob,
  'review-prs': runReviewPrsJob,
  'self-healing': runSelfHealingJob
} as const;

type SupportedJobName = keyof typeof jobHandlers;

export async function runConfiguredJob(jobName: string | undefined): Promise<SupportedJobName> {
  const selectedJob = (jobName && jobName in jobHandlers ? jobName : 'review-prs') as SupportedJobName;

  if (!jobName || selectedJob !== jobName) {
    console.warn(`[AVISO] JOB_NAME inválido ou ausente. Executando ${selectedJob} por padrão.`);
  }

  await jobHandlers[selectedJob]();
  return selectedJob;
}
