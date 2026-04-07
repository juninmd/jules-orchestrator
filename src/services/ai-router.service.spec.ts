import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AIRouterService } from './ai-router.service.js';
import * as aiModule from 'ai';

vi.mock('ai', () => ({
  generateText: vi.fn(),
  tool: vi.fn()
}));

vi.mock('ollama-ai-provider', () => ({
  createOllama: vi.fn().mockReturnValue(() => ({}))
}));

describe('AIRouterService', () => {
  let service: AIRouterService;

  beforeEach(() => {
    service = new AIRouterService();
    vi.clearAllMocks();
  });

  it('should call generateText and evaluate tools', async () => {
    (aiModule.generateText as any).mockResolvedValue({ text: 'mock text output', toolCalls: [] });

    await service.routeImprovement('Context here');

    expect(aiModule.generateText).toHaveBeenCalled();
  });
  
  it('should throw errors if generateText fails', async () => {
    (aiModule.generateText as any).mockRejectedValue(new Error('AI failed'));

    await expect(service.routeImprovement('Context here')).rejects.toThrowError('AI failed');
  });
});
