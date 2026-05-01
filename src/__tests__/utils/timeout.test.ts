import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createTimeoutSignal,
  fetchWithTimeout,
  timeoutPromise,
} from '../../services/utils/timeout';

describe('timeout utilities', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('resolves timeoutPromise when the wrapped promise finishes in time', async () => {
    const wrapped = timeoutPromise(Promise.resolve('done'), 1000);

    await expect(wrapped).resolves.toBe('done');
  });

  it('rejects timeoutPromise with the provided timeout message', async () => {
    const wrapped = timeoutPromise(new Promise(() => {}), 1000, 'Custom timeout');

    const pending = expect(wrapped).rejects.toThrow('Custom timeout');
    await vi.advanceTimersByTimeAsync(1000);
    await pending;
  });

  it('translates AbortError failures from fetchWithTimeout into readable timeout errors', async () => {
    global.fetch = vi.fn().mockRejectedValue({ name: 'AbortError' });

    await expect(fetchWithTimeout('https://example.com', {}, 2500)).rejects.toThrow(
      'Request timed out after 2.5s'
    );
  });

  it('passes an AbortSignal to fetchWithTimeout and clears the timer afterward', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    global.fetch = fetchMock;

    await fetchWithTimeout('https://example.com', { method: 'POST' }, 500);

    expect(fetchMock).toHaveBeenCalledWith(
      'https://example.com',
      expect.objectContaining({
        method: 'POST',
        signal: expect.any(AbortSignal),
      })
    );
  });

  it('aborts createTimeoutSignal when the timer elapses and cleanup prevents later aborts', async () => {
    const timed = createTimeoutSignal(1000);
    await vi.advanceTimersByTimeAsync(1000);
    expect(timed.signal.aborted).toBe(true);

    const cleaned = createTimeoutSignal(1000);
    cleaned.cleanup();
    await vi.advanceTimersByTimeAsync(1000);
    expect(cleaned.signal.aborted).toBe(false);
  });
});
