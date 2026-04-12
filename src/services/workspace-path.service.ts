import os from 'node:os';
import path from 'node:path';

function sanitizeSegment(value: string): string {
  const sanitized = value.replace(/[^a-zA-Z0-9-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  return sanitized || 'workspace';
}

export function createWorkspacePath(prefix: string, suffix: string): string {
  const baseDirectory = path.join(os.tmpdir(), 'jules-orchestrator');
  return path.join(baseDirectory, `${sanitizeSegment(prefix)}-${sanitizeSegment(suffix)}`);
}
