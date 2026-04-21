import fs from 'node:fs/promises';
import path from 'node:path';
import { CodeHotspot, RepositoryHealthReport } from '../contracts/orchestration.js';

const SOURCE_EXTENSIONS = new Set(['.ts', '.js', '.tsx', '.jsx', '.py', '.go', '.java', '.cs', '.rb', '.php']);
const IGNORE_DIRS = new Set(['node_modules', '.git', 'dist', 'build', '.next', 'vendor', '__pycache__', 'coverage']);
const SECRET_PATTERNS = [/api[_-]?key\s*=/i, /secret\s*=/i, /token\s*=/i, /password\s*=/i];

function languageFromExtension(filePath: string): string {
  const ext = path.extname(filePath).slice(1);
  return ext || 'text';
}

function scoreFile(relativePath: string, content: string): CodeHotspot {
  const lines = content.split(/\r?\n/);
  const functionCount = (content.match(/\b(function|async function|def)\b|=>/g) ?? []).length;
  const classCount = (content.match(/\bclass\s+[A-Z]/g) ?? []).length;
  const exportedSymbols = (content.match(/\bexport\s+(class|function|const|let|interface|type)\b/g) ?? []).length;
  const todoCount = (content.match(/\b(TODO|FIXME|HACK)\b/gi) ?? []).length;
  const hasSecrets = SECRET_PATTERNS.some(pattern => pattern.test(content));
  const reasons: string[] = [];

  if (lines.length > 250) reasons.push('arquivo grande demais para revisão local rápida');
  if (functionCount > 12) reasons.push('muitas funções no mesmo módulo');
  if (classCount > 2) reasons.push('múltiplas classes no mesmo arquivo');
  if (exportedSymbols > 10) reasons.push('superfície pública extensa');
  if (todoCount > 0) reasons.push('marcadores TODO/FIXME/HACK pendentes');
  if (hasSecrets) reasons.push('possível segredo ou credencial em texto');

  const riskScore =
    Math.min(30, Math.floor(lines.length / 20)) +
    functionCount * 3 +
    classCount * 5 +
    exportedSymbols * 2 +
    todoCount * 8 +
    (hasSecrets ? 40 : 0);

  return {
    filePath: relativePath,
    language: languageFromExtension(relativePath),
    lines: lines.length,
    exportedSymbols,
    functionCount,
    classCount,
    todoCount,
    riskScore,
    reasons
  };
}

export class StaticAnalysisService {
  async analyzeRepository(repository: string, rootDir: string): Promise<RepositoryHealthReport> {
    const hotspots: CodeHotspot[] = [];
    let scannedFiles = 0;
    let sourceLines = 0;

    async function walk(current: string): Promise<void> {
      const entries = await fs.readdir(current, { withFileTypes: true });
      for (const entry of entries) {
        if (IGNORE_DIRS.has(entry.name)) continue;
        const full = path.join(current, entry.name);
        if (entry.isDirectory()) {
          await walk(full);
          continue;
        }
        if (!SOURCE_EXTENSIONS.has(path.extname(entry.name))) continue;

        const content = await fs.readFile(full, 'utf-8').catch(() => '');
        const relative = path.relative(rootDir, full);
        const hotspot = scoreFile(relative, content);
        scannedFiles++;
        sourceLines += hotspot.lines;
        if (hotspot.riskScore >= 24 || hotspot.reasons.length > 0) hotspots.push(hotspot);
      }
    }

    await walk(rootDir);

    const rankedHotspots = hotspots
      .sort((a, b) => b.riskScore - a.riskScore)
      .slice(0, 12);

    return {
      repository,
      generatedAt: new Date().toISOString(),
      scannedFiles,
      sourceLines,
      hotspots: rankedHotspots,
      recommendations: rankedHotspots.slice(0, 5).map(hotspot =>
        `${hotspot.filePath}: ${hotspot.reasons.join('; ') || 'alto score composto'}`
      )
    };
  }

  formatForPrompt(report: RepositoryHealthReport): string {
    if (!report.hotspots.length) {
      return `Análise estática: ${report.scannedFiles} arquivos e ${report.sourceLines} linhas sem hotspot relevante.`;
    }

    const rows = report.hotspots.map(hotspot =>
      `- ${hotspot.filePath} | score=${hotspot.riskScore} | linhas=${hotspot.lines} | motivos=${hotspot.reasons.join('; ') || 'score composto'}`
    );

    return [
      `Análise estática: ${report.scannedFiles} arquivos, ${report.sourceLines} linhas.`,
      'Hotspots priorizados:',
      ...rows
    ].join('\n');
  }
}
