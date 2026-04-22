import { env } from '../config/env.config.js';

const REPORT_TAG = '[jules-orchestrator]';

export class TelegramService {
  /**
   * Envia uma mensagem para o Telegram do usuário usando a API nativa.
   * Não falha o programa caso não existam chaves (funciona quietamente).
   */
  async sendMessage(message: string): Promise<void> {
    if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_CHAT_ID) {
      return;
    }

    try {
      const taggedMessage = message.includes(REPORT_TAG)
        ? message
        : `${REPORT_TAG}\n${message}`;
      const url = `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: env.TELEGRAM_CHAT_ID,
          text: taggedMessage,
          parse_mode: 'HTML'
        })
      });

      if (!response.ok) {
        console.warn('[Telegram] Falha ao enviar notificação:', await response.text());
      }
    } catch (error) {
      console.warn('[Telegram] Erro de rede ao tentar notificar:', error);
    }
  }
}
