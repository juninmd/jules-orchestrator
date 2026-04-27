import { logger } from '../services/logger.service.js';

export interface BatchOptions {
  concurrency?: number;
  stopOnError?: boolean;
}

export interface BatchResult<T> {
  successes: T[];
  failures: Array<{ item: unknown; error: unknown }>;
}

export async function batchProcess<T, R>(
  items: T[],
  processor: (item: T, index: number) => Promise<R>,
  options: BatchOptions = {},
  context = 'BatchProcess'
): Promise<BatchResult<R>> {
  const { concurrency = 5, stopOnError = false } = options;
  const successes: R[] = [];
  const failures: Array<{ item: unknown; error: unknown }> = [];

  for (let i = 0; i < items.length; i += concurrency) {
    const chunk = items.slice(i, i + concurrency);

    const results = await Promise.allSettled(
      chunk.map((item, idx) => processor(item, i + idx))
    );

    for (let j = 0; j < results.length; j++) {
      const result = results[j];
      if (result.status === 'fulfilled') {
        successes.push(result.value);
      } else {
        failures.push({ item: chunk[j], error: result.reason });
        if (stopOnError) {
          logger.error(context, `Stopping due to error: ${result.reason}`);
          break;
        }
      }
    }
  }

  return { successes, failures };
}