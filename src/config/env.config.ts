import { z } from 'zod';
import dotenv from 'dotenv';
dotenv.config();

const envSchema = z.object({
  OLLAMA_HOST: z.string().url().optional(),
  OLLAMA_MODEL: z.string().optional(),
  GITHUB_TOKEN: z.string().min(1, 'Token do GitHub é obrigatório'),
  JULES_API_URL: z.string().url().optional(),
  JULES_API_KEY: z.string().min(1, 'Chave da API do Jules é obrigatória'),
  TARGET_REPO: z.string().optional(),
  TELEGRAM_BOT_TOKEN: z.string().optional(),
  TELEGRAM_CHAT_ID: z.string().optional()
});

// Validação deferida
const _env = envSchema.safeParse(process.env);

export const env = {
  OLLAMA_HOST: process.env.OLLAMA_HOST || 'http://localhost:11434',
  OLLAMA_MODEL: process.env.OLLAMA_MODEL || 'gemma2',
  GITHUB_TOKEN: process.env.GITHUB_TOKEN || '',
  JULES_API_URL: process.env.JULES_API_URL || 'https://jules.googleapis.com/v1alpha/sessions',
  JULES_API_KEY: process.env.JULES_API_KEY || '',
  TARGET_REPO: process.env.TARGET_REPO || '',
  TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN || '',
  TELEGRAM_CHAT_ID: process.env.TELEGRAM_CHAT_ID || ''
};

export const validateEnv = (): void => {
  if (!_env.success) {
    console.error('❌ Variáveis de ambiente inválidas:', _env.error.format());
    process.exit(1);
  }

  if (!env.JULES_API_URL) {
    console.warn('[AVISO] JULES_API_URL não configurado. Usando fallback amigável ou vai falhar na chamada da API do Jules.');
  }
};
