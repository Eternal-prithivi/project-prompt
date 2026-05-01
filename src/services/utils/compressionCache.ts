/**
 * Compression Cache Utility
 * Caches compression results in sessionStorage to avoid redundant API calls.
 * Cache is cleared when browser session ends.
 */

interface CachedCompression {
  compressed: string;
  mode: 'fast' | 'safe';
  quality: number;
  timestamp: number;
}

const CACHE_KEY = 'pa_compression_cache';
const CACHE_SIZE_LIMIT = 50; // Max number of cached compressions

/**
 * Get cache object from sessionStorage
 */
function getCache(): Record<string, CachedCompression> {
  try {
    const cached = sessionStorage.getItem(CACHE_KEY);
    return cached ? JSON.parse(cached) : {};
  } catch (e) {
    console.warn('Failed to read compression cache:', e);
    return {};
  }
}

/**
 * Save cache to sessionStorage
 */
function saveCache(cache: Record<string, CachedCompression>): void {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch (e) {
    console.warn('Failed to save compression cache:', e);
  }
}

/**
 * Hash a prompt string for cache key (simple hash)
 */
function hashPrompt(prompt: string): string {
  let hash = 0;
  for (let i = 0; i < prompt.length; i++) {
    const char = prompt.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return `${Math.abs(hash)}`;
}

function getCacheKey(original: string, mode: 'fast' | 'safe'): string {
  return `${mode}:${hashPrompt(original)}`;
}

/**
 * Cache a compression result
 */
export function cacheCompression(
  original: string,
  compressed: string,
  mode: 'fast' | 'safe',
  quality: number = 100
): void {
  try {
    const cache = getCache();
    const key = getCacheKey(original, mode);

    // Enforce size limit (FIFO)
    const keys = Object.keys(cache);
    if (keys.length >= CACHE_SIZE_LIMIT) {
      const oldest = keys.reduce((a, b) =>
        cache[a].timestamp < cache[b].timestamp ? a : b
      );
      delete cache[oldest];
    }

    cache[key] = {
      compressed,
      mode,
      quality,
      timestamp: Date.now(),
    };

    saveCache(cache);
  } catch (e) {
    console.warn('Failed to cache compression:', e);
  }
}

/**
 * Retrieve cached compression if available
 */
export function getCachedCompression(
  original: string,
  mode?: 'fast' | 'safe'
): CachedCompression | null {
  try {
    const cache = getCache();
    const result = mode
      ? cache[getCacheKey(original, mode)]
      : cache[getCacheKey(original, 'fast')] ?? cache[getCacheKey(original, 'safe')];

    if (!result) return null;

    return result;
  } catch (e) {
    console.warn('Failed to retrieve compression from cache:', e);
    return null;
  }
}

/**
 * Check if a prompt is cached
 */
export function isCached(original: string, mode?: 'fast' | 'safe'): boolean {
  try {
    return getCachedCompression(original, mode) !== null;
  } catch {
    return false;
  }
}

/**
 * Get cache hit rate (for metrics)
 */
export function getCacheStats(): { total: number; hitRate: number } {
  try {
    const cache = getCache();
    return {
      total: Object.keys(cache).length,
      hitRate: 0, // Would need to track hits separately
    };
  } catch {
    return { total: 0, hitRate: 0 };
  }
}

/**
 * Clear entire compression cache
 */
export function clearCompressionCache(): void {
  try {
    sessionStorage.removeItem(CACHE_KEY);
  } catch (e) {
    console.warn('Failed to clear compression cache:', e);
  }
}

/**
 * Clear cache on session end (called on unmount if needed)
 */
export function initCacheCleanup(): void {
  // Optional: Clear old entries on window unload
  if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', () => {
      // Cache is automatically cleared when session ends
      // This is just a safety measure if needed
    });
  }
}
