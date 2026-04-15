import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import fs from 'node:fs';

const execAsync = promisify(exec);

/**
 * Clona um repositório usando GIT_ASKPASS para não vazar o token em logs/stderr.
 * O script de askpass é escrito em um arquivo temporário e removido após o clone.
 */
export async function safeGitClone(
  repository: string,
  token: string,
  destPath: string,
  options: { depth?: number } = {}
): Promise<void> {
  const askpassScript = path.join(destPath + '-askpass.sh');
  const depthArg = options.depth ? `--depth ${options.depth}` : '';
  const gitUrl = `https://x-access-token@github.com/${repository}.git`;

  try {
    fs.writeFileSync(askpassScript, `#!/bin/sh\necho "${token}"`, { mode: 0o700 });

    await execAsync(
      `git clone ${depthArg} "${gitUrl}" "${destPath}"`,
      {
        env: {
          ...process.env,
          GIT_ASKPASS: askpassScript,
          GIT_TERMINAL_PROMPT: '0'
        }
      }
    );
  } finally {
    if (fs.existsSync(askpassScript)) fs.unlinkSync(askpassScript);
  }
}

export async function gitFetchPr(clonePath: string, prNumber: number): Promise<void> {
  await execAsync(
    `cd "${clonePath}" && git fetch origin pull/${prNumber}/head:pr-${prNumber} && git checkout pr-${prNumber}`
  );
}

export function detectPackageManager(repoPath: string): { name: string; install: string; build: string } {
  if (fs.existsSync(path.join(repoPath, 'bun.lockb')) || fs.existsSync(path.join(repoPath, 'bun.lock'))) {
    return { name: 'bun', install: 'bun install', build: 'bun run build' };
  }
  if (fs.existsSync(path.join(repoPath, 'pnpm-lock.yaml'))) {
    return { name: 'pnpm', install: 'pnpm install --ignore-scripts', build: 'pnpm run build' };
  }
  if (fs.existsSync(path.join(repoPath, 'yarn.lock'))) {
    return { name: 'yarn', install: 'yarn install --frozen-lockfile', build: 'yarn build' };
  }
  return { name: 'npm', install: 'npm ci', build: 'npm run build' };
}
