import { validateEnv } from './config/env.config.js';
import { runCreateSessionsJob } from './jobs/create-sessions.job.js';
import { runResolveQuestionsJob } from './jobs/resolve-questions.job.js';

async function bootstrap() {
  try {
    validateEnv();

    const jobName = process.env.JOB_NAME;

    switch (jobName) {
      case 'create-sessions':
        await runCreateSessionsJob();
        break;
      case 'resolve-questions':
        await runResolveQuestionsJob();
        break;
      default:
        console.warn(`[AVISO] Nenhum JOB_NAME especifico fornecido. Executando ambos em sequencia...`);
        await runCreateSessionsJob();
        await runResolveQuestionsJob();
        break;
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Falha fatal no Orquestrador:', error);
    process.exit(1);
  }
}

bootstrap();
