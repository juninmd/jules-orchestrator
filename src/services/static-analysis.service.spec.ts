import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { StaticAnalysisService } from './static-analysis.service.js';

describe('StaticAnalysisService', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'jules-static-'));
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('ranks source hotspots with deterministic reasons', async () => {
    await fs.mkdir(path.join(tmpDir, 'src'));
    await fs.writeFile(
      path.join(tmpDir, 'src', 'large.ts'),
      [
        'export function a() {}',
        'export function b() {}',
        'export function c() {}',
        'export function d() {}',
        'export function e() {}',
        'export function f() {}',
        'export function g() {}',
        'export function h() {}',
        'export function i() {}',
        'export function j() {}',
        'export function k() {}',
        'export function l() {}',
        'export function m() {}',
        '// TODO: split this module'
      ].join('\n')
    );

    const report = await new StaticAnalysisService().analyzeRepository('owner/repo', tmpDir);

    expect(report.scannedFiles).toBe(1);
    expect(report.hotspots[0]?.filePath).toBe(path.join('src', 'large.ts'));
    expect(report.hotspots[0]?.reasons).toContain('muitas funções no mesmo módulo');
    expect(report.recommendations[0]).toContain('src');
  });

  it('formats a compact prompt context', async () => {
    const service = new StaticAnalysisService();
    const context = service.formatForPrompt({
      repository: 'owner/repo',
      generatedAt: '2026-04-20T00:00:00.000Z',
      scannedFiles: 0,
      sourceLines: 0,
      hotspots: [],
      recommendations: []
    });

    expect(context).toContain('sem hotspot relevante');
  });
});
