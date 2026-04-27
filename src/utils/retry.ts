import { isRetryable, AppError } from './errors.js';
import { logger } from '../services/logger.service.js';

export interface RetryOptions {
  maxAttempts?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  backoffMultiplier?: number;
  retryableErrors?: (new (...args: unknown[]) => Error)[];
}

export async function withRetry<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {},
  context?: string
): Promise<T> {
  const {
    maxAttempts = 3,
    initialDelayMs = 1000,
    maxDelayMs = 30000,
    backoffMultiplier = 2
  } = options;

  let lastError: unknown;
  let delay = initialDelayMs;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      if (attempt === maxAttempts) break;

      const shouldRetry = isRetryable(error);
      if (!shouldRetry) {
        logger.warn(context ?? 'Retry', `Erro não é retryable: ${error instanceof Error ? error.message : String(error)}`, { errorType: error?.constructor?.name });
        break;
      }

      logger.warn(
        context ?? 'Retry',
        `Attempt ${attempt}/${maxAttempts} failed. Retrying in ${delay}ms...`,
        { error: error instanceof Error ? error.message : String(error) }
      );

      await sleep(delay);
      delay = Math.min(delay * backoffMultiplier, maxDelayMs);
    }
  }

  throw lastError;
}

export async function withTimeout<T>(operation: Promise<T>, timeoutMs: number, operationName = 'Operation'): Promise<T> {
  let timeoutHandle: NodeJS.Timeout;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutHandle = setTimeout(() => {
      reject(new AppError(`${operationName} exceeded timeout of ${timeoutMs}ms`, 'TIMEOUT_ERROR', { timeoutMs }, true));
    }, timeoutMs);
  });

  try {
    return await Promise.race([operation, timeoutPromise]);
  } finally {
    clearTimeout(timeoutHandle!);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: 'closed' | 'open' | 'half-open' = 'closed';

  constructor(
    private readonly threshold = 5,
    private readonly resetTimeoutMs = 60000
  ) {}

  async execute<T>(operation: () => Promise<T>, context = 'CircuitBreaker'): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailureTime >= this.resetTimeoutMs) {
        this.state = 'half-open';
        logger.info(context, 'Circuit breaker half-open, attempting recovery...');
      } else {
        throw new AppError('Circuit breaker is OPEN', 'CIRCUIT_BREAKER_OPEN', undefined, false);
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failures = 0;
    if (this.state === 'half-open') {
      this.state = 'closed';
    }
  }

  private onFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();
    if (this.failures >= this.threshold) {
      this.state = 'open';
    }
  }

  getStatus(): { state: string; failures: number } {
    return { state: this.state, failures: this.failures };
  }
}