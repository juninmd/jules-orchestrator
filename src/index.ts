import { validateEnv } from './config/env.config.js';
import { runConfiguredJob } from './jobs/job-registry.js';

async function bootstrap() {
  try {
    validateEnv();
    await runConfiguredJob(process.env.JOB_NAME);
    process.exit(0);
  } catch (error) {
    console.error('❌ Falha fatal no Orquestrador:', error);
    process.exit(1);
  }
}

bootstrap();
