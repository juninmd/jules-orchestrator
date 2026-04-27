import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../config/env.config.js', () => ({
  env: {
    JULES_API_URL: 'https://jules.api/v1/sessions',
    JULES_API_KEY: 'test-key'
  }
}));

vi.mock('../utils/retry.js', () => ({
  withRetry: async <T>(fn: () => Promise<T>) => fn()
}));

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

import { JulesService } from './jules.service.js';

describe('JulesService', () => {
  let service: JulesService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new JulesService();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('invokes Jules API with correct payload', async () => {
    mockFetch.mockResolvedValue({ ok: true } as Response);

    await service.invokeSession({
      repository: 'juninmd/api',
      prompt: 'Fix the bug'
    });

    expect(mockFetch).toHaveBeenCalledWith(
      'https://jules.api/v1/sessions',
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('juninmd/api')
      })
    );
  });

  it('wraps every session with autonomous development team contract', async () => {
    mockFetch.mockResolvedValue({ ok: true } as Response);

    await service.invokeSession({
      repository: 'juninmd/api',
      prompt: 'Fix the bug'
    });

    const body = JSON.parse((mockFetch.mock.calls[0][1] as RequestInit).body as string);
    expect(body.prompt).toContain('time de desenvolvimento autônomo');
    expect(body.prompt).toContain('roadmap');
    expect(body.prompt).toContain('Fix the bug');
    expect(body.title).toContain('Autonomous Development Session');
  });

  it('throws on non-ok response', async () => {
    mockFetch.mockResolvedValue({ ok: false, statusText: 'Bad Request', status: 400 } as Response);

    await expect(service.invokeSession({
      repository: 'juninmd/api',
      prompt: 'Test'
    })).rejects.toThrow('Jules API invocation failed');
  });

  it('includes API key header', async () => {
    mockFetch.mockResolvedValue({ ok: true } as Response);

    await service.invokeSession({ repository: 'juninmd/api', prompt: 'Test' });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({ 'X-Goog-Api-Key': 'test-key' })
      })
    );
  });
});