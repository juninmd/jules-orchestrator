import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

// Garante que o .env seja carregado correntemente (mesmo a partir de outros lugares)
const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '../../.env') });

export const env = {
  OLLAMA_HOST: process.env.OLLAMA_HOST || 'http://localhost:11434',
  OLLAMA_MODEL: process.env.OLLAMA_MODEL || 'gemma2',
  GITHUB_TOKEN: process.env.GITHUB_TOKEN || '',
  TARGET_REPO: process.env.TARGET_REPO || '',
  JULES_API_URL: process.env.JULES_API_URL || 'https://jules.googleapis.com/v1alpha/sessions',
  JULES_API_KEY: process.env.JULES_API_KEY || '',
};

export const validateEnv = (): void => {
  if (!env.GITHUB_TOKEN) {
    throw new Error('GITHUB_TOKEN não configurado. Por favor, adicione ao seu .env.');
  }

  if (!env.TARGET_REPO) {
    throw new Error('TARGET_REPO não configurado. Por favor, adicione ao seu .env no formato owner/repo.');
  }
  
  if (!env.JULES_API_URL) {
    console.warn('[AVISO] JULES_API_URL não configurado. Usando fallback amigável ou vai falhar na chamada da API do Jules.');
  }
};
