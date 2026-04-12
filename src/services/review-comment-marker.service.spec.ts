import { describe, expect, it } from 'vitest';
import { appendReviewMarker, createReviewMarker } from './review-comment-marker.service.js';

describe('createReviewMarker', () => {
  it('creates the same marker for the same diff', () => {
    const first = createReviewMarker('diff-content');
    const second = createReviewMarker('diff-content');

    expect(first).toBe(second);
    expect(first).toContain('jules-orchestrator:review:');
  });
});

describe('appendReviewMarker', () => {
  it('prefixes the rendered comment with the review marker', () => {
    const comment = appendReviewMarker('Review body', 'diff-content');

    expect(comment).toContain('Review body');
    expect(comment.split('\n')[0]).toBe(createReviewMarker('diff-content'));
  });
});
