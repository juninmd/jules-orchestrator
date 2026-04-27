import { describe, it, expect, vi } from 'vitest';

import { logger } from './logger.service.js';

describe('logger', () => {
  it('logger.info writes formatted message to console.log', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    logger.info('Test', 'Hello');
    expect(spy).toHaveBeenCalled();
    const loggedMessage = spy.mock.calls[0][0] as string;
    expect(loggedMessage).toContain('[INFO]');
    expect(loggedMessage).toContain('[Test]');
    expect(loggedMessage).toContain('Hello');
    spy.mockRestore();
  });

  it('logger.warn writes formatted message to console.warn', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    logger.warn('Test', 'Warning');
    expect(spy).toHaveBeenCalled();
    const loggedMessage = spy.mock.calls[0][0] as string;
    expect(loggedMessage).toContain('[WARN]');
    expect(loggedMessage).toContain('Warning');
    spy.mockRestore();
  });

  it('logger.error writes JSON structured error to console.error', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    logger.error('Test', 'Err', new Error('boom'));
    expect(spy).toHaveBeenCalled();
    const firstArg = spy.mock.calls[0][0] as string;
    const secondArg = spy.mock.calls[0][1] as string;
    expect(firstArg).toContain('[ERROR]');
    expect(secondArg).toContain('"message":"Err"');
    expect(secondArg).toContain('"error"');
    spy.mockRestore();
  });

  it('logger.timed measures elapsed time', async () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const result = await logger.timed('Scope', 'Op', async () => 42);
    expect(result).toBe(42);
    expect(spy).toHaveBeenCalled();
    const loggedMessage = spy.mock.calls[0][0] as string;
    expect(loggedMessage).toContain('completed in');
    spy.mockRestore();
  });

  it('logger.timed logs error on failure', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    await expect(logger.timed('Scope', 'Op', async () => { throw new Error('fail'); })).rejects.toThrow('fail');
    expect(spy).toHaveBeenCalled();
    const errorMessage = spy.mock.calls[0][1] as string;
    expect(errorMessage).toContain('"message":"fail"');
    spy.mockRestore();
  });

  it('logger.child creates scoped logger', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const child = logger.child('ChildScope');
    child.info('Hello child');
    expect(spy).toHaveBeenCalled();
    const loggedMessage = spy.mock.calls[0][0] as string;
    expect(loggedMessage).toContain('[ChildScope]');
    expect(loggedMessage).toContain('Hello child');
    spy.mockRestore();
  });
});