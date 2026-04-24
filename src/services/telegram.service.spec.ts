import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../config/env.config.js', () => ({
  env: { TELEGRAM_BOT_TOKEN: 'tok', TELEGRAM_CHAT_ID: '123' }
}));

import { TelegramService } from './telegram.service.js';

describe('TelegramService', () => {
  let service: TelegramService;
  const fetchSpy = vi.spyOn(globalThis, 'fetch');

  beforeEach(() => {
    vi.clearAllMocks();
    service = new TelegramService();
  });

  it('sends message via Telegram API', async () => {
    fetchSpy.mockResolvedValue({ ok: true } as Response);
    await service.sendMessage('Hello');
    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining('api.telegram.org/bottok/sendMessage'),
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('🤖 <b>JULES ORCHESTRATOR</b>')
      })
    );
  });

  it('does not duplicate report tag', async () => {
    fetchSpy.mockResolvedValue({ ok: true } as Response);
    await service.sendMessage('[jules-orchestrator]\nHello');
    const body = JSON.parse((fetchSpy.mock.calls[0][1] as RequestInit).body as string);
    expect(body.text.match(/JULES ORCHESTRATOR/g)).toHaveLength(1);
  });

  it('does not throw on fetch error', async () => {
    fetchSpy.mockRejectedValue(new Error('network'));
    await expect(service.sendMessage('Hi')).resolves.toBeUndefined();
  });

  it('does not throw on non-ok response', async () => {
    fetchSpy.mockResolvedValue({ ok: false, text: () => Promise.resolve('err') } as Response);
    await expect(service.sendMessage('Hi')).resolves.toBeUndefined();
  });
});
