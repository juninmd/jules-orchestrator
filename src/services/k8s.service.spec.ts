import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockListPodForAllNamespaces, mockReadNamespacedPodLog } = vi.hoisted(() => ({
  mockListPodForAllNamespaces: vi.fn().mockResolvedValue({ items: [] }),
  mockReadNamespacedPodLog: vi.fn().mockResolvedValue('error log trace')
}));

vi.mock('@kubernetes/client-node', () => {
  class KubeConfig {
    loadFromCluster() { throw new Error('not in cluster'); }
    loadFromDefault() {}
    makeApiClient() {
      return {
        listPodForAllNamespaces: mockListPodForAllNamespaces,
        readNamespacedPodLog: mockReadNamespacedPodLog
      };
    }
  }
  return { KubeConfig, CoreV1Api: class {} };
});

import { K8sService } from './k8s.service.js';

describe('K8sService', () => {
  let service: K8sService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new K8sService();
  });

  it('returns empty when no pods are crashing', async () => {
    mockListPodForAllNamespaces.mockResolvedValue({ items: [] });
    const result = await service.getCrashingPods();
    expect(result).toEqual([]);
  });

  it('returns crashing pods with source-repo annotation', async () => {
    mockListPodForAllNamespaces.mockResolvedValue({
      items: [{
        metadata: { name: 'api-xyz', namespace: 'prod', annotations: { 'source-repo': 'juninmd/api' } },
        status: {
          containerStatuses: [{ state: { waiting: { reason: 'CrashLoopBackOff' } } }]
        }
      }]
    });

    const result = await service.getCrashingPods();
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(
      expect.objectContaining({ name: 'api-xyz', repo: 'juninmd/api', logTrace: 'error log trace' })
    );
  });

  it('skips crashing pods without source-repo annotation', async () => {
    mockListPodForAllNamespaces.mockResolvedValue({
      items: [{
        metadata: { name: 'orphan', namespace: 'ns', annotations: {} },
        status: {
          containerStatuses: [{ state: { waiting: { reason: 'CrashLoopBackOff' } } }]
        }
      }]
    });

    const result = await service.getCrashingPods();
    expect(result).toEqual([]);
  });

  it('returns empty on K8s API error', async () => {
    mockListPodForAllNamespaces.mockRejectedValue(new Error('forbidden'));
    const result = await service.getCrashingPods();
    expect(result).toEqual([]);
  });
});
