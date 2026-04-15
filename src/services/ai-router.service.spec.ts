import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockGenerateText, mockInvokeSession } = vi.hoisted(() => ({
  mockGenerateText: vi.fn().mockResolvedValue({ text: 'Done', toolResults: [] }),
  mockInvokeSession: vi.fn()
}));

vi.mock('ai', () => ({
  generateText: mockGenerateText,
  tool: (config: any) => config
}));
vi.mock('ollama-ai-provider', () => ({ createOllama: () => () => 'mock-model' }));
vi.mock('../config/env.config.js', () => ({
  env: { OLLAMA_HOST: 'http://localhost:11434', OLLAMA_MODEL: 'gemma2' }
}));
vi.mock('./jules.service.js', () => {
  function JulesService(this: any) {
    this.invokeSession = mockInvokeSession;
  }
  return { JulesService };
});

import { AIRouterService } from './ai-router.service.js';

describe('AIRouterService', () => {
  let service: AIRouterService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new AIRouterService();
  });

  it('calls generateText with prompt containing the context', async () => {
    await service.routeImprovement('juninmd/api', 'SRP violation');
    expect(mockGenerateText).toHaveBeenCalledWith(
      expect.objectContaining({ prompt: expect.stringContaining('SRP violation') })
    );
  });

  it('throws when generateText fails', async () => {
    mockGenerateText.mockRejectedValue(new Error('connection refused'));
    await expect(service.routeImprovement('juninmd/api', 'ctx')).rejects.toThrow('connection refused');
  });

  it('logs tool results when tools are executed', async () => {
    mockGenerateText.mockResolvedValue({ text: 'ok', toolResults: [{ result: 'done' }] });
    await service.routeImprovement('juninmd/api', 'ctx');
    expect(mockGenerateText).toHaveBeenCalledTimes(1);
  });
});
