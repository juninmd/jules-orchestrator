import * as k8s from '@kubernetes/client-node';

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
      // Tenta carregar as credenciais embutidas dentro do proprio container (ServiceAccount local)
      kc.loadFromCluster();
      console.log('[K8sService] Conectado na API via Cluster ServiceAccount.');
    } catch {
      // Fallback para desenvolvimento local ou config ~/.kube/config
      kc.loadFromDefault();
      console.log('[K8sService] Conectado na API via config Kubeconfig local.');
    }
    this.coreApi = kc.makeApiClient(k8s.CoreV1Api);
  }

  /**
   * Busca por Pods com status indicando falhas graves no cluster inteiro.
   */
  async getCrashingPods(): Promise<CrashingPod[]> {
    const crashingPods: CrashingPod[] = [];
    
    try {
      const res = await this.coreApi.listPodForAllNamespaces();
      const pods = res.body.items;

      for (const pod of pods) {
        if (!pod.status || !pod.metadata) continue;

        // Verifica o estado de loop de crash ou morte nos containers
        const containerStatuses = pod.status.containerStatuses || [];
        const isCrashing = containerStatuses.some((status: any) => {
          const stateWait = status.state?.waiting;
          const stateTerm = status.state?.terminated;
          if (stateWait && stateWait.reason === 'CrashLoopBackOff') return true;
          if (stateTerm && stateTerm.reason === 'Error') return true;
          return false;
        });

        if (isCrashing) {
          const repoAnnotation = pod.metadata.annotations?.['jules.ai/source-repo'];
          
          if (repoAnnotation) {
            // Buscando as ultimas 100 linhas pro stack trace  
            const logRes = await this.coreApi.readNamespacedPodLog(
                pod.metadata.name!, 
                pod.metadata.namespace!,
                undefined,
                undefined,
                undefined,
                undefined,
                undefined,
                undefined,
                100
             );
            
            crashingPods.push({
              name: pod.metadata.name!,
              namespace: pod.metadata.namespace!,
              repo: repoAnnotation,
              logTrace: logRes.body
            });
          } else {
             console.log(`[K8sService] Pod ${pod.metadata.name} sofrendo crash mas sem label 'jules.ai/source-repo'. Ignorando auto-cura.`);
          }
        }
      }
    } catch (err) {
      console.error('[K8sService] Erro consultando a API do Kubernetes:', err);
    }

    return crashingPods;
  }
}
