import { K8sService } from '../services/k8s.service.js';
import { TelegramService } from '../services/telegram.service.js';
import { JulesService } from '../services/jules.service.js';
import { logger } from '../services/logger.service.js';

export async function runSelfHealingJob() {
  logger.info('SelfHealing', 'Iniciando rotina: SELF_HEALING (Paramedic Engine)');

  const k8sService = new K8sService();
  const telegramService = new TelegramService();
  const julesService = new JulesService();

  const victims = await k8sService.getCrashingPods();

  if (victims.length === 0) {
    logger.info('SelfHealing', 'Nenhum Pod em estado crítico.');
    return;
  }

  for (const pod of victims) {
    logger.info('SelfHealing', `Pod ${pod.name} (${pod.namespace}) em CRASH. Repo: ${pod.repo}`);

    await telegramService.sendMessage(
      `🚨 <b>CRASH detectado!</b>\n<b>Pod:</b> ${pod.name}\n<b>Namespace:</b> ${pod.namespace}\n<b>App:</b> ${pod.repo}`
    );

    const promptPayload = `
[CONTEXTO DE EMERGÊNCIA - CORREÇÃO DE PRODUÇÃO]
O contêiner correspondente a este repositório falhou com CrashLoopBackOff ou Error.
Descubra a origem do erro, aplique a correção e submeta o Pull Request.

--- LOG DO CRASH ---
${pod.logTrace.substring(0, 4000)}
--------------------`.trim();

    try {
      await julesService.invokeSession({ repository: pod.repo, prompt: promptPayload });
      logger.info('SelfHealing', `Tarefa despachada para Jules: ${pod.repo}`);
    } catch (err) {
      logger.error('SelfHealing', `Falha ao despachar Jules para ${pod.repo}`, err);
    }
  }

  logger.info('SelfHealing', `Job concluído. Pods tratados: ${victims.length}`);
}
