import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OllamaService } from './ollama.service.js';

describe('OllamaService', () => {
  let service: OllamaService;

  beforeEach(() => {
    service = new OllamaService();
    // mock global fetch
    global.fetch = vi.fn();
  });

  it('should call fetch and return parsed response', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ response: 'Implementar circuit breaker.' }),
    });

    const result = await service.generateImprovementPrompt('refatoração resiliência');
    expect(result).toBe('Implementar circuit breaker.');
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('should throw an error if response is not ok', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: false,
      statusText: 'Internal Server Error',
    });

    await expect(service.generateImprovementPrompt('teste')).rejects.toThrowError('Ollama API error');
  });
});
