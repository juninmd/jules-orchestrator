import { describe, expect, it } from 'vitest';
import { parseEnv } from './env.config.js';

describe('parseEnv', () => {
  it('uses safe defaults when Jules integration is not configured', () => {
    const parsed = parseEnv({
      GITHUB_TOKEN: 'gh-token'
    });

    expect(parsed.OLLAMA_HOST).toBe('http://localhost:11434');
    expect(parsed.OLLAMA_MODEL).toBe('gemma2');
    expect(parsed.OLLAMA_TIMEOUT_MS).toBe(300_000);
    expect(parsed.ORCHESTRATOR_STATE_DIR).toBe('.orchestrator-state');
    expect(parsed.JULES_API_URL).toBe('');
    expect(parsed.JULES_API_KEY).toBe('');
    expect(parsed.TARGET_REPOSITORIES).toEqual([]);
  });

  it('requires JULES_API_KEY when JULES_API_URL is configured', () => {
    expect(() =>
      parseEnv({
        GITHUB_TOKEN: 'gh-token',
        JULES_API_URL: 'https://jules.googleapis.com/v1alpha/sessions'
      })
    ).toThrow(/JULES_API_KEY/i);
  });

  it('parses and deduplicates target repositories from TARGET_REPO', () => {
    const parsed = parseEnv({
      GITHUB_TOKEN: 'gh-token',
      TARGET_REPO: 'juninmd/api, juninmd/web, juninmd/api ,, '
    });

    expect(parsed.TARGET_REPOSITORIES).toEqual([
      'juninmd/api',
      'juninmd/web'
    ]);
  });

  it('parses operational runtime knobs', () => {
    const parsed = parseEnv({
      GITHUB_TOKEN: 'gh-token',
      OLLAMA_TIMEOUT_MS: '120000',
      ORCHESTRATOR_STATE_DIR: 'data/orchestrator'
    });

    expect(parsed.OLLAMA_TIMEOUT_MS).toBe(120_000);
    expect(parsed.ORCHESTRATOR_STATE_DIR).toBe('data/orchestrator');
  });
});
