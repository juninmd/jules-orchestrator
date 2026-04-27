export class AppError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly context?: Record<string, unknown>,
    public readonly isRetryable = false
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class ExternalServiceError extends AppError {
  constructor(message: string, service: string, context?: Record<string, unknown>) {
    super(message, `EXTERNAL_SERVICE_${service.toUpperCase()}`, context, true);
    this.name = 'ExternalServiceError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'VALIDATION_ERROR', context, false);
    this.name = 'ValidationError';
  }
}

export class GitOperationError extends AppError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'GIT_OPERATION_ERROR', context, true);
    this.name = 'GitOperationError';
  }
}

export class AIProviderError extends AppError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'AI_PROVIDER_ERROR', context, true);
    this.name = 'AIProviderError';
  }
}

export function isRetryable(error: unknown): boolean {
  if (error instanceof AppError) return error.isRetryable;
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return message.includes('timeout') ||
           message.includes('econnrefused') ||
           message.includes('rate limit') ||
           message.includes('503') ||
           message.includes('429');
  }
  return false;
}

export function formatError(error: unknown): { message: string; code?: string; stack?: string } {
  if (error instanceof AppError) {
    return {
      message: error.message,
      code: error.code,
      stack: error.stack
    };
  }
  if (error instanceof Error) {
    return {
      message: error.message,
      stack: error.stack
    };
  }
  return { message: String(error) };
}