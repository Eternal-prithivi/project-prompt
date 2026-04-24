/**
 * Timeout utilities for API requests
 * Prevents requests from hanging indefinitely
 */

/**
 * Wraps a promise to reject if it takes longer than the specified timeout
 * @param promise - The promise to wrap
 * @param ms - Timeout in milliseconds (default: 30000)
 * @param timeoutMessage - Custom timeout message
 * @returns Promise that rejects with timeout error
 */
export function timeoutPromise<T>(
  promise: Promise<T>,
  ms: number = 30000,
  timeoutMessage: string = `Request timed out after ${ms / 1000}s`
): Promise<T> {
  let timeoutId: NodeJS.Timeout;

  const timeoutPromiseReject = new Promise<T>((_, reject) =>
    (timeoutId = setTimeout(
      () => reject(new Error(timeoutMessage)),
      ms
    ))
  );

  return Promise.race([promise, timeoutPromiseReject]).finally(() =>
    clearTimeout(timeoutId)
  );
}

/**
 * Wraps a fetch call with timeout and AbortController
 * @param url - URL to fetch
 * @param options - Fetch options
 * @param timeoutMs - Timeout in milliseconds (default: 30000)
 * @returns Promise<Response>
 */
export async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs: number = 30000
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } catch (error: any) {
    if (error.name === 'AbortError') {
      throw new Error(`Request timed out after ${timeoutMs / 1000}s`);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Get AbortSignal with timeout
 * Useful for fetch calls that already accept AbortSignal
 * @param timeoutMs - Timeout in milliseconds (default: 30000)
 * @returns { signal, cleanup }
 */
export function createTimeoutSignal(timeoutMs: number = 30000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  return {
    signal: controller.signal,
    cleanup: () => clearTimeout(timeoutId),
  };
}
