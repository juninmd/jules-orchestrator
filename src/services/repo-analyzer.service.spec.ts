import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockExecAsync, mockGetOpenPullRequests, mockGenerateText } = vi.hoisted(() => ({
  mockExecAsync: vi.fn(),
  mockGetOpenPullRequests: vi.fn().mockResolvedValue([]),
  mockGenerateText: vi.fn().mockResolvedValue({ text: 'NENHUMA AÇÃO NECESSÁRIA' })
}));

vi.mock('node:util', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:util')>();
  return { ...actual, promisify: () => mockExecAsync };
});

vi.mock('ai', () => ({ generateText: mockGenerateText }));

vi.mock('ollama-ai-provider', () => ({
  createOllama: () => () => 'mock-model'
}));

vi.mock('../services/github.service.js', () => {
  function GithubService(this: any) {
    this.getOpenPullRequests = mockGetOpenPullRequests;
  }
  return { GithubService };
});

vi.mock('node:fs/promises', () => ({
  default: {
    rm: vi.fn().mockResolvedValue(undefined),
    mkdir: vi.fn().mockResolvedValue(undefined),
    writeFile: vi.fn().mockResolvedValue(undefined),
    readdir: vi.fn().mockResolvedValue([]),
    readFile: vi.fn().mockResolvedValue('')
  }
}));

vi.mock('node:fs', () => ({
  default: {
    existsSync: vi.fn().mockReturnValue(false),
    mkdirSync: vi.fn()
  }
}));

vi.mock('../config/env.config.js', () => ({
  env: {
    GITHUB_TOKEN: 'fake-token',
    OLLAMA_HOST: 'http://ollama:11434',
    OLLAMA_MODEL: 'gemma2'
  }
}));

vi.mock('node:child_process', () => ({ exec: vi.fn() }));

import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import { RepoAnalyzerService } from './repo-analyzer.service.js';

describe('RepoAnalyzerService.analyzeRepoAndGeneratePrompt', () => {
  let service: RepoAnalyzerService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetOpenPullRequests.mockResolvedValue([]);
    mockExecAsync.mockResolvedValue({ stdout: '', stderr: '' });
    mockGenerateText.mockResolvedValue({ text: 'NENHUMA AÇÃO NECESSÁRIA' });
    service = new RepoAnalyzerService();
  });

  it('retorna null quando Ollama responde NENHUMA AÇÃO NECESSÁRIA', async () => {
    const result = await service.analyzeRepoAndGeneratePrompt('juninmd/some-repo');
    expect(result).toBeNull();
  });

  it('retorna o insight quando Ollama encontra oportunidade de refatoração', async () => {
    const insight = 'O arquivo src/service.ts viola SRP ao misturar lógica de negócio com persistência.';
    mockGenerateText.mockResolvedValue({ text: insight });

    const result = await service.analyzeRepoAndGeneratePrompt('juninmd/some-repo');

    expect(result).toBe(insight);
  });

  it('envia o código fonte coletado no prompt para o Ollama', async () => {
    await service.analyzeRepoAndGeneratePrompt('juninmd/some-repo');

    expect(mockGenerateText).toHaveBeenCalledWith(
      expect.objectContaining({ prompt: expect.stringContaining('CÓDIGO FONTE') })
    );
  });

  it('inclui títulos de PRs abertos no prompt (anti-spam)', async () => {
    mockGetOpenPullRequests.mockResolvedValue([
      { number: 42, title: 'refactor: extract auth logic', body: '' }
    ]);

    await service.analyzeRepoAndGeneratePrompt('juninmd/some-repo');

    const call = mockGenerateText.mock.calls[0][0];
    expect(call.prompt).toContain('refactor: extract auth logic');
    expect(call.prompt).toContain('ANTI SPAM');
  });

  it('faz cleanup do clone após análise bem-sucedida', async () => {
    await service.analyzeRepoAndGeneratePrompt('juninmd/some-repo');

    expect(fs.rm).toHaveBeenCalledWith(
      expect.stringContaining('some-repo'),
      expect.objectContaining({ recursive: true })
    );
  });

  it('retorna null e faz cleanup quando Ollama falha', async () => {
    (fsSync.existsSync as ReturnType<typeof vi.fn>).mockReturnValue(true);
    mockGenerateText.mockRejectedValue(new Error('connection refused'));

    const result = await service.analyzeRepoAndGeneratePrompt('juninmd/some-repo');

    expect(result).toBeNull();
    expect(fs.rm).toHaveBeenCalledWith(
      expect.stringContaining('some-repo'),
      expect.objectContaining({ recursive: true })
    );
  });
});
