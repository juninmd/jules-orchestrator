const JOB_LABEL = process.env.JOB_NAME || 'unknown';

function timestamp(): string {
  return new Date().toISOString();
}

function format(level: string, scope: string, message: string): string {
  return `${timestamp()} [${level}] [${JOB_LABEL}][${scope}] ${message}`;
}

export const logger = {
  info(scope: string, message: string): void {
    console.log(format('INFO', scope, message));
  },

  warn(scope: string, message: string): void {
    console.warn(format('WARN', scope, message));
  },

  error(scope: string, message: string, err?: unknown): void {
    console.error(format('ERROR', scope, message), err ?? '');
  },

  /** Measures elapsed time and logs it. Returns the result of the fn. */
  async timed<T>(scope: string, label: string, fn: () => Promise<T>): Promise<T> {
    const start = performance.now();
    try {
      const result = await fn();
      const ms = (performance.now() - start).toFixed(0);
      console.log(format('INFO', scope, `${label} completed in ${ms}ms`));
      return result;
    } catch (err) {
      const ms = (performance.now() - start).toFixed(0);
      console.error(format('ERROR', scope, `${label} failed after ${ms}ms`), err);
      throw err;
    }
  }
};
