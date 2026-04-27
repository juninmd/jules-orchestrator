import { env } from '../config/env.config.js';
import { logger } from './logger.service.js';
import { withRetry } from '../utils/retry.js';

const REPORT_TAG = '[jules-orchestrator]';

export class TelegramService {
  async sendMessage(message: string): Promise<void> {
    if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_CHAT_ID) {
      return;
    }

    try {
      await withRetry(
        () => this.sendMessageInternal(message),
        {
          maxAttempts: 3,
          initialDelayMs: 1000,
          maxDelayMs: 5000
        },
        'TelegramService.sendMessage'
      );
    } catch (error) {
      logger.warn('TelegramService', `Falha ao enviar mensagem após 3 tentativas`, { error: String(error) });
    }
  }

  private async sendMessageInternal(message: string): Promise<void> {
    const isTagged = message.includes(REPORT_TAG);
    const cleanMessage = isTagged ? message.replace(REPORT_TAG, '').trim() : message;

    const taggedMessage = [
      `🤖 <b>JULES ORCHESTRATOR</b>`,
      `──────────────────────`,
      cleanMessage
    ].join('\n');

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
      throw new Error(`Telegram API error: ${response.statusText}`);
    }
  }
}