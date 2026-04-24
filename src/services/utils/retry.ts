export type RetryOptions = {
  /**
   * Total attempts including the first attempt.
   */
  maxAttempts?: number;
  /**
   * Base delay for exponential backoff in ms.
   */
  baseDelayMs?: number;
  /**
   * Upper bound for backoff delay in ms.
   */
  maxDelayMs?: number;
  /**
   * Randomize the delay to avoid stampedes.
   */
  jitter?: boolean;
  /**
   * Decide whether to retry based on the thrown error.
   */
  shouldRetry?: (error: unknown, attempt: number) => boolean;
};

export type HttpLikeError = {
  status?: number;
  code?: string | number;
  message?: string;
  name?: string;
};

export function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export function isRetryableStatus(status: number): boolean {
  return status === 408 || status === 409 || status === 425 || status === 429 || (status >= 500 && status <= 599);
}

export function getErrorStatus(err: unknown): number | undefined {
  if (!err || typeof err !== 'object') return undefined;
  const anyErr = err as any;
  const status = anyErr.status ?? anyErr.statusCode ?? anyErr.response?.status;
  return typeof status === 'number' ? status : undefined;
}

export function defaultShouldRetry(err: unknown): boolean {
  const status = getErrorStatus(err);
  if (typeof status === 'number') return isRetryableStatus(status);

  // Heuristic fallbacks for SDK/network errors.
  const msg = typeof (err as any)?.message === 'string' ? (err as any).message.toLowerCase() : '';
  if (!msg) return false;
  if (msg.includes('rate limit')) return true;
  if (msg.includes('too many requests')) return true;
  if (msg.includes('temporar')) return true; // temporary/temporarily
  if (msg.includes('econnreset')) return true;
  if (msg.includes('etimedout')) return true;
  if (msg.includes('timeout')) return true;
  if (msg.includes('network')) return true;
  return false;
}

function computeBackoffMs(attempt: number, baseDelayMs: number, maxDelayMs: number, jitter: boolean): number {
  const exp = Math.min(maxDelayMs, baseDelayMs * Math.pow(2, Math.max(0, attempt - 1)));
  if (!jitter) return exp;
  const rand = Math.random(); // 0..1
  // full jitter: random between 0 and exp
  return Math.floor(rand * exp);
}

/**
 * Retry an async function with exponential backoff.
 */
export async function retry<T>(fn: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
  const maxAttempts = options.maxAttempts ?? 3;
  const baseDelayMs = options.baseDelayMs ?? 500;
  const maxDelayMs = options.maxDelayMs ?? 8000;
  const jitter = options.jitter ?? true;
  const shouldRetry = options.shouldRetry ?? ((e) => defaultShouldRetry(e));

  let lastErr: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      const canRetry = attempt < maxAttempts && shouldRetry(e, attempt);
      if (!canRetry) throw e;
      const delay = computeBackoffMs(attempt, baseDelayMs, maxDelayMs, jitter);
      await sleep(delay);
    }
  }

  // Should never reach here
  throw lastErr instanceof Error ? lastErr : new Error('Retry failed');
}

