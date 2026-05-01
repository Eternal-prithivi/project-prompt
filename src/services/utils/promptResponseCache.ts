interface PromptResponseCacheKey {
  provider: string;
  model: string;
  prompt: string;
}

export interface CachedPromptResponse extends PromptResponseCacheKey {
  response: string;
  timestamp: number;
}

const CACHE_KEY = 'pa_prompt_response_cache';
const CACHE_SIZE_LIMIT = 50;
const CACHE_TTL_MS = 60 * 60 * 1000;

function getStorage(): Storage | null {
  return typeof sessionStorage === 'undefined' ? null : sessionStorage;
}

function getCache(): Record<string, CachedPromptResponse> {
  try {
    const storage = getStorage();
    const cached = storage?.getItem(CACHE_KEY);
    return cached ? JSON.parse(cached) : {};
  } catch (e) {
    console.warn('Failed to read prompt response cache:', e);
    return {};
  }
}

function saveCache(cache: Record<string, CachedPromptResponse>): void {
  try {
    getStorage()?.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch (e) {
    console.warn('Failed to save prompt response cache:', e);
  }
}

function hashKey(value: string): string {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return `${Math.abs(hash)}`;
}

function createKey({ provider, model, prompt }: PromptResponseCacheKey): string {
  return hashKey(JSON.stringify({ provider, model, prompt }));
}

export function cachePromptResponse(entry: Omit<CachedPromptResponse, 'timestamp'>): void {
  if (!entry.prompt.trim() || !entry.response.trim()) {
    return;
  }

  const cache = getCache();
  const keys = Object.keys(cache);

  if (keys.length >= CACHE_SIZE_LIMIT) {
    const oldest = keys.reduce((a, b) => (
      cache[a].timestamp < cache[b].timestamp ? a : b
    ));
    delete cache[oldest];
  }

  cache[createKey(entry)] = {
    ...entry,
    timestamp: Date.now(),
  };

  saveCache(cache);
}

export function getCachedPromptResponse(
  key: PromptResponseCacheKey,
  maxAgeMs: number = CACHE_TTL_MS
): CachedPromptResponse | null {
  const cache = getCache();
  const cacheKey = createKey(key);
  const result = cache[cacheKey];

  if (!result) {
    return null;
  }

  if (Date.now() - result.timestamp > maxAgeMs) {
    delete cache[cacheKey];
    saveCache(cache);
    return null;
  }

  return result;
}

export function clearPromptResponseCache(): void {
  try {
    getStorage()?.removeItem(CACHE_KEY);
  } catch (e) {
    console.warn('Failed to clear prompt response cache:', e);
  }
}
