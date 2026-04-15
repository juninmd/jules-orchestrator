import { describe, it, expect, vi } from 'vitest';

import { logger } from './logger.service.js';

describe('logger', () => {
  it('logger.info writes to console.log', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    logger.info('Test', 'Hello');
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('[INFO]'));
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('[Test]'));
    spy.mockRestore();
  });

  it('logger.warn writes to console.warn', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    logger.warn('Test', 'Warning');
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('[WARN]'));
    spy.mockRestore();
  });

  it('logger.error writes to console.error', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    logger.error('Test', 'Err', new Error('boom'));
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('[ERROR]'), expect.any(Error));
    spy.mockRestore();
  });

  it('logger.timed measures elapsed time', async () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const result = await logger.timed('Scope', 'Op', async () => 42);
    expect(result).toBe(42);
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('completed in'));
    spy.mockRestore();
  });

  it('logger.timed logs error on failure', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    await expect(logger.timed('Scope', 'Op', async () => { throw new Error('fail'); })).rejects.toThrow('fail');
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('failed after'), expect.any(Error));
    spy.mockRestore();
  });
});
