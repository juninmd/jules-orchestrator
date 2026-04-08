import { env } from '../config/env.config.js';

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
      const url = `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: env.TELEGRAM_CHAT_ID,
          text: message,
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
