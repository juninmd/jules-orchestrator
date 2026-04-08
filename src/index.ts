import { validateEnv } from './config/env.config.js';
import { runCreateSessionsJob } from './jobs/create-sessions.job.js';
import { runReviewPrsJob } from './jobs/review-prs.job.js';

async function bootstrap() {
  try {
    validateEnv();

    const jobName = process.env.JOB_NAME;

    switch (jobName) {
      case 'create-sessions':
        await runCreateSessionsJob();
        break;
      case 'review-prs':
        await runReviewPrsJob();
        break;
      default:
        console.warn(`[AVISO] Nenhum JOB_NAME especifico fornecido. Executando revisor por padrão...`);
        await runReviewPrsJob();
        break;
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Falha fatal no Orquestrador:', error);
    process.exit(1);
  }
}

bootstrap();
