import * as k8s from '@kubernetes/client-node';
import { logger } from './logger.service.js';
import { withRetry } from '../utils/retry.js';

export interface CrashingPod {
  name: string;
  namespace: string;
  repo: string;
  logTrace: string;
}

export class K8sService {
  private coreApi: k8s.CoreV1Api;

  constructor() {
    const kc = new k8s.KubeConfig();
    try {
      kc.loadFromCluster();
      logger.info('K8s', 'Conectado na API via Cluster ServiceAccount.');
    } catch {
      kc.loadFromDefault();
      logger.info('K8s', 'Conectado na API via Kubeconfig local.');
    }
    this.coreApi = kc.makeApiClient(k8s.CoreV1Api);
  }

  async getCrashingPods(): Promise<CrashingPod[]> {
    try {
      return await withRetry(
        () => this.doGetCrashingPods(),
        { maxAttempts: 3, initialDelayMs: 1000, maxDelayMs: 10000 },
        'K8sService.getCrashingPods'
      );
    } catch (error) {
      logger.error('K8s', 'Erro ao buscar pods em crash após retries', error);
      return [];
    }
  }

  private async doGetCrashingPods(): Promise<CrashingPod[]> {
    const crashingPods: CrashingPod[] = [];
    const res = await this.coreApi.listPodForAllNamespaces();
    const pods = res.items ?? [];

    for (const pod of pods) {
      if (!pod.status || !pod.metadata) continue;

      const containerStatuses = pod.status.containerStatuses ?? [];
      const isCrashing = containerStatuses.some((status) => {
        const stateWait = status.state?.waiting;
        const stateTerm = status.state?.terminated;
        if (stateWait?.reason === 'CrashLoopBackOff') return true;
        if (stateTerm?.reason === 'Error') return true;
        return false;
      });

      if (isCrashing) {
        const repoAnnotation = pod.metadata.annotations?.['source-repo'];

        if (repoAnnotation) {
          const logTrace = await this.coreApi.readNamespacedPodLog({
            name: pod.metadata.name!,
            namespace: pod.metadata.namespace!,
            tailLines: 100
          });

          crashingPods.push({
            name: pod.metadata.name!,
            namespace: pod.metadata.namespace!,
            repo: repoAnnotation,
            logTrace: typeof logTrace === 'string' ? logTrace : ''
          });
        } else {
          logger.warn('K8s', `Pod ${pod.metadata.name} em crash mas sem annotation 'source-repo'. Ignorando.`);
        }
      }
    }

    return crashingPods;
  }
}