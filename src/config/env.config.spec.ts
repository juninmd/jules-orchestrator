import test from 'node:test';
import { env, validateEnv } from './env.config.js';
import { describe, it, expect, vi } from 'vitest';

describe('Env Config', () => {
  it('should load default values if not provided', () => {
    // These tests will run against existing .env or fallbacks
    expect(env.OLLAMA_HOST).toBeDefined();
    expect(env.OLLAMA_MODEL).toBeDefined();
  });

});
