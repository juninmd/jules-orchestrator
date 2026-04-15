import * as k8s from '@kubernetes/client-node';
import { logger } from './logger.service.js';

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
    const crashingPods: CrashingPod[] = [];

    try {
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
    } catch (err) {
      logger.error('K8s', 'Erro consultando a API do Kubernetes', err);
    }

    return crashingPods;
  }
}
