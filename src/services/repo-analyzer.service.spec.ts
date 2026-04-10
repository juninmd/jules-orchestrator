import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockExecAsync, mockGetOpenPullRequests } = vi.hoisted(() => ({
  mockExecAsync: vi.fn(),
  mockGetOpenPullRequests: vi.fn().mockResolvedValue([])
}));

// Intercepta promisify(exec) para retornar mockExecAsync que resolve { stdout, stderr }
vi.mock('node:util', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:util')>();
  return {
    ...actual,
    promisify: (fn: unknown) => {
      // Qualquer chamada a promisify dentro do serviço retorna nosso mock
      void fn;
      return mockExecAsync;
    }
  };
});

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
    writeFile: vi.fn().mockResolvedValue(undefined)
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
import { RepoAnalyzerService, writeOpencodeConfig } from './repo-analyzer.service.js';

function setupExec(stdout: string) {
  mockExecAsync.mockResolvedValue({ stdout, stderr: '' });
}

describe('writeOpencodeConfig', () => {
  beforeEach(() => vi.clearAllMocks());

  it('cria o diretório e escreve o arquivo com host e model corretos', async () => {
    await writeOpencodeConfig();

    expect(fs.mkdir).toHaveBeenCalledWith(
      expect.stringContaining('opencode'),
      { recursive: true }
    );
    const writeCall = (fs.writeFile as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(writeCall[0]).toContain('opencode.json');
    const written = JSON.parse(writeCall[1]);
    expect(written.provider.ollama.api).toBe('http://ollama:11434/v1');
    expect(written.provider.ollama.models).toHaveProperty('gemma2');
  });
});

describe('RepoAnalyzerService.analyzeRepoAndGeneratePrompt', () => {
  let service: RepoAnalyzerService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetOpenPullRequests.mockResolvedValue([]);
    service = new RepoAnalyzerService();
  });

  it('retorna null quando opencode responde NENHUMA AÇÃO NECESSÁRIA', async () => {
    setupExec('NENHUMA AÇÃO NECESSÁRIA');

    const result = await service.analyzeRepoAndGeneratePrompt('juninmd/some-repo');

    expect(result).toBeNull();
  });

  it('retorna o insight quando opencode encontra oportunidade', async () => {
    const insight = 'O arquivo src/service.ts viola SRP ao misturar lógica de negócio com persistência.';
    setupExec(insight);

    const result = await service.analyzeRepoAndGeneratePrompt('juninmd/some-repo');

    expect(result).toBe(insight);
  });

  it('usa --model ollama/<model> no comando opencode', async () => {
    setupExec('NENHUMA AÇÃO NECESSÁRIA');

    await service.analyzeRepoAndGeneratePrompt('juninmd/some-repo');

    const cmds = mockExecAsync.mock.calls.map(c => c[0] as string);
    const opencodeCall = cmds.find((cmd: string) => cmd.startsWith('opencode'));
    expect(opencodeCall).toBeDefined();
    expect(opencodeCall).toContain('--model ollama/gemma2');
  });

  it('inclui títulos de PRs abertos no prompt (anti-spam)', async () => {
    mockGetOpenPullRequests.mockResolvedValue([
      { number: 42, title: 'refactor: extract auth logic', body: '' }
    ]);
    setupExec('NENHUMA AÇÃO NECESSÁRIA');

    await service.analyzeRepoAndGeneratePrompt('juninmd/some-repo');

    const cmds = mockExecAsync.mock.calls.map(c => c[0] as string);
    const opencodeCall = cmds.find((cmd: string) => cmd.startsWith('opencode'));
    expect(opencodeCall).toContain('refactor: extract auth logic');
  });

  it('retorna null e faz cleanup quando opencode falha', async () => {
    (fsSync.existsSync as ReturnType<typeof vi.fn>).mockReturnValue(true);
    mockExecAsync
      .mockResolvedValueOnce({ stdout: '', stderr: '' })           // git clone
      .mockRejectedValueOnce(new Error('opencode: not found'));    // opencode

    const result = await service.analyzeRepoAndGeneratePrompt('juninmd/some-repo');

    expect(result).toBeNull();
    expect(fs.rm).toHaveBeenCalledWith(
      expect.stringContaining('some-repo'),
      expect.objectContaining({ recursive: true })
    );
  });
});
