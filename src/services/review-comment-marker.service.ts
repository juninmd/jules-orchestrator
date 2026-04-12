import { createHash } from 'node:crypto';

export function createReviewMarker(diff: string): string {
  const fingerprint = createHash('sha256').update(diff).digest('hex').slice(0, 16);
  return `<!-- jules-orchestrator:review:${fingerprint} -->`;
}

export function appendReviewMarker(comment: string, diff: string): string {
  return `${createReviewMarker(diff)}\n${comment}`;
}
