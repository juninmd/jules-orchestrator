import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockFetch = vi.spyOn(globalThis, 'fetch');

vi.mock('../config/env.config.js', () => ({
  env: {
    JULES_API_URL: 'https://jules.api/v1/sessions',
    JULES_API_KEY: 'test-key'
  }
}));

import { JulesService } from './jules.service.js';

describe('JulesService', () => {
  let service: JulesService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new JulesService();
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

  it('throws on non-ok response', async () => {
    mockFetch.mockResolvedValue({ ok: false, statusText: 'Bad Request' } as Response);

    await expect(service.invokeSession({
      repository: 'juninmd/api',
      prompt: 'Test'
    })).rejects.toThrow('Retorno inválido');
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
