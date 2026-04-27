import { validateEnv } from './config/env.config.js';
import { runConfiguredJob } from './jobs/job-registry.js';
import { logger } from './services/logger.service.js';
import { AppError, formatError } from './utils/errors.js';

async function bootstrap() {
  try {
    validateEnv();
    await runConfiguredJob(process.env.JOB_NAME);
    process.exit(0);
  } catch (error) {
    const formatted = formatError(error);
    logger.error('Bootstrap', 'Falha fatal no Orquestrador', error, { code: formatted.code });
    const exitCode = error instanceof AppError && !error.isRetryable ? 1 : 1;
    process.exit(exitCode);
  }
}

bootstrap();
