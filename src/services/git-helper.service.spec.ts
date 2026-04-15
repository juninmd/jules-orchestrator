import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockExecAsync, mockWriteFileSync, mockExistsSync, mockUnlinkSync } = vi.hoisted(() => ({
  mockExecAsync: vi.fn().mockResolvedValue({ stdout: '', stderr: '' }),
  mockWriteFileSync: vi.fn(),
  mockExistsSync: vi.fn().mockReturnValue(true),
  mockUnlinkSync: vi.fn()
}));

vi.mock('node:child_process', () => ({ exec: vi.fn() }));
vi.mock('node:util', () => ({ promisify: () => mockExecAsync }));
vi.mock('node:fs', () => ({
  default: {
    writeFileSync: mockWriteFileSync,
    existsSync: mockExistsSync,
    unlinkSync: mockUnlinkSync
  }
}));

import { safeGitClone, gitFetchPr, detectPackageManager } from './git-helper.service.js';

describe('safeGitClone', () => {
  beforeEach(() => vi.clearAllMocks());

  it('creates askpass script and clones', async () => {
    await safeGitClone('juninmd/api', 'tok123', '/tmp/clone');
    expect(mockWriteFileSync).toHaveBeenCalledWith(
      expect.stringContaining('askpass'),
      expect.stringContaining('tok123'),
      expect.objectContaining({ mode: 0o700 })
    );
    expect(mockExecAsync).toHaveBeenCalledWith(
      expect.stringContaining('git clone'),
      expect.objectContaining({ env: expect.objectContaining({ GIT_TERMINAL_PROMPT: '0' }) })
    );
  });

  it('cleans up askpass script even on error', async () => {
    mockExecAsync.mockRejectedValueOnce(new Error('clone fail'));
    await expect(safeGitClone('juninmd/api', 'tok', '/tmp/clone')).rejects.toThrow('clone fail');
    expect(mockUnlinkSync).toHaveBeenCalled();
  });

  it('passes depth option when specified', async () => {
    await safeGitClone('juninmd/api', 'tok', '/tmp/clone', { depth: 1 });
    expect(mockExecAsync).toHaveBeenCalledWith(
      expect.stringContaining('--depth 1'),
      expect.any(Object)
    );
  });
});

describe('gitFetchPr', () => {
  beforeEach(() => vi.clearAllMocks());

  it('fetches and checks out the PR branch', async () => {
    await gitFetchPr('/tmp/clone', 42);
    expect(mockExecAsync).toHaveBeenCalledWith(
      expect.stringContaining('pull/42/head:pr-42')
    );
  });
});

describe('detectPackageManager', () => {
  beforeEach(() => vi.clearAllMocks());

  it('detects pnpm from lockfile', () => {
    mockExistsSync.mockImplementation((p: string) => p.includes('pnpm-lock'));
    const result = detectPackageManager('/repo');
    expect(result.name).toBe('pnpm');
  });

  it('falls back to npm when no lockfile found', () => {
    mockExistsSync.mockReturnValue(false);
    const result = detectPackageManager('/repo');
    expect(result.name).toBe('npm');
  });
});
