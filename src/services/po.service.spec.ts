import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockGenerateText } = vi.hoisted(() => ({
  mockGenerateText: vi.fn().mockResolvedValue({ text: '## New Feature Markdown' })
}));

vi.mock('ai', () => ({ generateText: mockGenerateText }));
vi.mock('ollama-ai-provider', () => ({ createOllama: () => () => 'mock-model' }));
vi.mock('../config/env.config.js', () => ({
  env: { OLLAMA_HOST: 'http://localhost:11434', OLLAMA_MODEL: 'gemma2' }
}));

import { POService } from './po.service.js';

describe('POService', () => {
  let service: POService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new POService();
  });

  it('returns generated feature markdown trimmed', async () => {
    mockGenerateText.mockResolvedValue({ text: '  ## Feature  \n' });
    const result = await service.generateNewFeature('Task A', 'Context', 'Feature B');
    expect(result).toBe('## Feature');
  });

  it('includes task title and trigger in the prompt', async () => {
    await service.generateNewFeature('CI Setup', 'Pipeline ready', 'Auto deploy');
    const call = mockGenerateText.mock.calls[0][0];
    expect(call.prompt).toContain('CI Setup');
    expect(call.prompt).toContain('Auto deploy');
  });

  it('throws when generateText fails', async () => {
    mockGenerateText.mockRejectedValue(new Error('timeout'));
    await expect(service.generateNewFeature('A', 'B', 'C')).rejects.toThrow('timeout');
  });
});
