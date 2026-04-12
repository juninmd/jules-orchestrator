import { z } from 'zod';
import dotenv from 'dotenv';
dotenv.config();

const envSchema = z.object({
  OLLAMA_HOST: z.string().url().optional(),
  OLLAMA_MODEL: z.string().optional(),
  GITHUB_TOKEN: z.string().optional(),
  JULES_API_URL: z.union([z.string().url(), z.literal('')]).optional(),
  JULES_API_KEY: z.string().optional(),
  TARGET_REPO: z.string().optional(),
  TELEGRAM_BOT_TOKEN: z.string().optional(),
  TELEGRAM_CHAT_ID: z.string().optional()
});

function parseTargetRepositories(targetRepo: string | undefined): string[] {
  return [...new Set((targetRepo ?? '').split(',').map(repo => repo.trim()).filter(Boolean))];
}

export interface RuntimeEnv {
  OLLAMA_HOST: string;
  OLLAMA_MODEL: string;
  GITHUB_TOKEN: string;
  JULES_API_URL: string;
  JULES_API_KEY: string;
  TARGET_REPO: string;
  TARGET_REPOSITORIES: string[];
  TELEGRAM_BOT_TOKEN: string;
  TELEGRAM_CHAT_ID: string;
}

function readEnv(source: NodeJS.ProcessEnv): RuntimeEnv {
  const parsed = envSchema.parse(source);

  return {
    OLLAMA_HOST: parsed.OLLAMA_HOST || 'http://localhost:11434',
    OLLAMA_MODEL: parsed.OLLAMA_MODEL || 'gemma2',
    GITHUB_TOKEN: parsed.GITHUB_TOKEN?.trim() || '',
    JULES_API_URL: parsed.JULES_API_URL?.trim() || '',
    JULES_API_KEY: parsed.JULES_API_KEY?.trim() || '',
    TARGET_REPO: parsed.TARGET_REPO?.trim() || '',
    TARGET_REPOSITORIES: parseTargetRepositories(parsed.TARGET_REPO),
    TELEGRAM_BOT_TOKEN: parsed.TELEGRAM_BOT_TOKEN?.trim() || '',
    TELEGRAM_CHAT_ID: parsed.TELEGRAM_CHAT_ID?.trim() || ''
  };
}

export function parseEnv(source: NodeJS.ProcessEnv): RuntimeEnv {
  const runtimeEnv = readEnv(source);

  if (!runtimeEnv.GITHUB_TOKEN) {
    throw new Error('GITHUB_TOKEN é obrigatório');
  }

  if (runtimeEnv.JULES_API_URL && !runtimeEnv.JULES_API_KEY) {
    throw new Error('JULES_API_KEY é obrigatório quando JULES_API_URL estiver configurado');
  }

  return runtimeEnv;
}

export const env = readEnv(process.env);

export const validateEnv = (): void => {
  parseEnv(process.env);

  if (!env.JULES_API_URL) {
    console.warn('[AVISO] JULES_API_URL não configurado. O orquestrador seguirá sem abrir sessões no Jules.');
  }
};
