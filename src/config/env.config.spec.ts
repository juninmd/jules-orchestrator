import test from 'node:test';
import { env, validateEnv } from './env.config.js';
import { describe, it, expect, vi } from 'vitest';

describe('Env Config', () => {
  it('should load default values if not provided', () => {
    // These tests will run against existing .env or fallbacks
    expect(env.OLLAMA_HOST).toBeDefined();
    expect(env.OLLAMA_MODEL).toBeDefined();
  });

  it('should throw an error if GITHUB_TOKEN is empty during validation', () => {
    const originalToken = env.GITHUB_TOKEN;
    env.GITHUB_TOKEN = '';
    
    expect(() => validateEnv()).toThrowError('GITHUB_TOKEN não configurado');
    
    env.GITHUB_TOKEN = originalToken; // restore
  });
  
  it('should throw an error if TARGET_REPO is empty during validation', () => {
    const originalToken = env.GITHUB_TOKEN;
    const originalRepo = env.TARGET_REPO;
    env.GITHUB_TOKEN = 'mock';
    env.TARGET_REPO = '';
    
    expect(() => validateEnv()).toThrowError('TARGET_REPO não configurado');
    
    env.GITHUB_TOKEN = originalToken;
    env.TARGET_REPO = originalRepo;
  });
});
