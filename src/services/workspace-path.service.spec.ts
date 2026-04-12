import { describe, expect, it, vi } from 'vitest';

const { mockTmpdir } = vi.hoisted(() => ({
  mockTmpdir: vi.fn()
}));

vi.mock('node:os', () => ({
  default: { tmpdir: mockTmpdir },
  tmpdir: mockTmpdir
}));

import { createWorkspacePath } from './workspace-path.service.js';

describe('createWorkspacePath', () => {
  it('uses the operating system temp directory as its base', () => {
    mockTmpdir.mockReturnValue('C:\\Temp');

    const workspacePath = createWorkspacePath('review-pr', '42');

    expect(workspacePath).toBe('C:\\Temp\\jules-orchestrator\\review-pr-42');
  });

  it('sanitizes repository names before building the workspace path', () => {
    mockTmpdir.mockReturnValue('C:\\Temp');

    const workspacePath = createWorkspacePath('repo-scan', 'juninmd/api-service');

    expect(workspacePath).toBe(
      'C:\\Temp\\jules-orchestrator\\repo-scan-juninmd-api-service'
    );
  });
});
