import { describe, it, expect, vi, beforeEach } from 'vitest';
import { JulesService } from './jules.service.js';
import { env } from '../config/env.config.js';

describe('JulesService', () => {
  let service: JulesService;

  beforeEach(() => {
    service = new JulesService();
    global.fetch = vi.fn();
    env.JULES_API_URL = 'http://mock-jules/api';
    env.JULES_API_KEY = 'mock-key';
  });

  it('should call fetch to invoke the session', async () => {
    (global.fetch as any).mockResolvedValue({ ok: true });

    await service.invokeSession({ prompt: 'Test', repository: 'owner/repo' });

    expect(global.fetch).toHaveBeenCalledWith('http://mock-jules/api', expect.objectContaining({
      method: 'POST',
      headers: expect.objectContaining({
        'X-Goog-Api-Key': 'mock-key'
      })
    }));
  });

  it('should fallback gracefully if URL is not configured', async () => {
    env.JULES_API_URL = '';
    await service.invokeSession({ prompt: 'Test', repository: 'owner/repo' });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('should throw an error on bad response', async () => {
    (global.fetch as any).mockResolvedValue({ ok: false, statusText: 'Forbidden' });
    await expect(service.invokeSession({ prompt: 'Test', repository: 'repo' })).rejects.toThrowError('Retorno inválido da API do Jules');
  });
});
