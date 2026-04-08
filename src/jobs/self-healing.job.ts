import { K8sService } from '../services/k8s.service.js';
import { TelegramService } from '../services/telegram.service.js';
import { JulesService } from '../services/jules.service.js';

export async function runSelfHealingJob() {
  console.log('🚑 Iniciando rotina: SELF_HEALING (Paramedic Engine)');

  const k8sService = new K8sService();
  const telegramService = new TelegramService();
  const julesService = new JulesService();

  const victims = await k8sService.getCrashingPods();

  if (victims.length === 0) {
    console.log('✅ Nenhum Pod detectado em estado crítico.');
    console.log('Rotina concluída.');
    return;
  }

  for (const pod of victims) {
    console.log(`\n🚨 Atenção: Pod ${pod.name} (Namespace: ${pod.namespace}) encontrado em CRASH.`);
    console.log(`Repositório linkado: ${pod.repo}`);

    const alertMessage = `🚨 <b>NÓS TEMOS UM CRASH!</b> 🚨\n\n<b>Pod:</b> ${pod.name}\n<b>Namespace:</b> ${pod.namespace}\n<b>Aplicação:</b> ${pod.repo}\n\nO orquestrador capturou a falha na Matrix. Acionando a equipe tática de Agentes da Neves!`;
    await telegramService.sendMessage(alertMessage);

    const promptPayload = `
[CONTEXTO DE EMERGÊNCIA - CORREÇÃO DE PRODUÇÃO]
O servidor reportou que o contêiner correspondente a este repositório falhou com \`CrashLoopBackOff\` ou \`Error\`.
O stack trace abaixo contém a falha mortal interceptada no Kubernetes.
Descubra a origem do erro, aplique a correção imediatamente, e submeta o Pull Request da vida.

--- LOG DO CRASH ---
${pod.logTrace.substring(0, 4000) /* Limite seguro para o payload */}
--------------------
    `.trim();

    try {
      console.log(`[Self-Healing] Entregando tarefa de ressuscitação ao Jules...`);
      await julesService.invokeSession({
        repository: pod.repo,
        prompt: promptPayload
      });
      console.log(`[Self-Healing] Tarefa despachada.`);
    } catch (err) {
      console.error(`[Self-Healing] Falha ao despachar Jules para ${pod.repo}:`, err);
    }
  }

  console.log('\n✅ SELF_HEALING Job concluído.');
}
