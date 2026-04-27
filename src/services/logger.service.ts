import { formatError } from '../utils/errors.js';

const JOB_LABEL = process.env.JOB_NAME || 'unknown';

function timestamp(): string {
  return new Date().toISOString();
}

function formatMessage(level: string, scope: string, message: string): string {
  return `${timestamp()} [${level}] [${JOB_LABEL}][${scope}] ${message}`;
}

export interface LogEntry {
  timestamp: string;
  level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';
  scope: string;
  message: string;
  durationMs?: number;
  context?: Record<string, unknown>;
  error?: ReturnType<typeof formatError>;
}

export interface ChildLogger {
  info: (message: string, context?: Record<string, unknown>) => void;
  warn: (message: string, context?: Record<string, unknown>) => void;
  error: (message: string, err?: unknown, context?: Record<string, unknown>) => void;
  debug: (message: string, context?: Record<string, unknown>) => void;
}

export class LoggerImpl {
  info(scope: string, message: string, context?: Record<string, unknown>): void {
    console.log(formatMessage('INFO', scope, message), context ? JSON.stringify(context) : '');
  }

  warn(scope: string, message: string, context?: Record<string, unknown>): void {
    console.warn(formatMessage('WARN', scope, message), context ? JSON.stringify(context) : '');
  }

  error(scope: string, message: string, err?: unknown, context?: Record<string, unknown>): void {
    const formatted = formatError(err);
    const entry: LogEntry = {
      timestamp: timestamp(),
      level: 'ERROR',
      scope,
      message,
      error: formatted
    };
    if (context) entry.context = context;
    console.error(formatMessage('ERROR', scope, message), JSON.stringify(entry));
  }

  debug(scope: string, message: string, context?: Record<string, unknown>): void {
    if (process.env.LOG_LEVEL === 'debug') {
      console.debug(formatMessage('DEBUG', scope, message), context ? JSON.stringify(context) : '');
    }
  }

  async timed<T>(scope: string, label: string, fn: () => Promise<T>): Promise<T> {
    const start = performance.now();
    try {
      const result = await fn();
      const ms = Number((performance.now() - start).toFixed(0));
      console.log(formatMessage('INFO', scope, `${label} completed in ${ms}ms`));
      return result;
    } catch (err) {
      const ms = Number((performance.now() - start).toFixed(0));
      const formatted = formatError(err);
      console.error(formatMessage('ERROR', scope, `${label} failed after ${ms}ms`), JSON.stringify({ ...formatted, durationMs: ms }));
      throw err;
    }
  }

  child(scope: string): ChildLogger {
    return {
      info: (msg: string, ctx?: Record<string, unknown>) => this.info(scope, msg, ctx),
      warn: (msg: string, ctx?: Record<string, unknown>) => this.warn(scope, msg, ctx),
      error: (msg: string, err?: unknown, ctx?: Record<string, unknown>) => this.error(scope, msg, err, ctx),
      debug: (msg: string, ctx?: Record<string, unknown>) => this.debug(scope, msg, ctx)
    };
  }
}

export const logger = new LoggerImpl();