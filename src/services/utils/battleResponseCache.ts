import { PromptComponents, JudgeVerdict } from '../../types';

interface BattleResponseCacheKey {
  provider: string;
  model: string;
  promptA: string;
  promptB: string;
  components: PromptComponents;
}

export interface CachedBattleResponse extends BattleResponseCacheKey {
  outputA: string;
  outputB: string;
  verdict: JudgeVerdict;
  timestamp: number;
}

const CACHE_KEY = 'pa_battle_response_cache';
const CACHE_SIZE_LIMIT = 50;
const CACHE_TTL_MS = 60 * 60 * 1000;

function getStorage(): Storage | null {
  return typeof sessionStorage === 'undefined' ? null : sessionStorage;
}

function getCache(): Record<string, CachedBattleResponse> {
  try {
    const storage = getStorage();
    const cached = storage?.getItem(CACHE_KEY);
    return cached ? JSON.parse(cached) : {};
  } catch (e) {
    console.warn('Failed to read battle response cache:', e);
    return {};
  }
}

function saveCache(cache: Record<string, CachedBattleResponse>): void {
  try {
    getStorage()?.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch (e) {
    console.warn('Failed to save battle response cache:', e);
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

function createKey({ provider, model, promptA, promptB, components }: BattleResponseCacheKey): string {
  return hashKey(JSON.stringify({ provider, model, promptA, promptB, components }));
}

export function cacheBattleResponse(entry: Omit<CachedBattleResponse, 'timestamp'>): void {
  if (!entry.promptA.trim() || !entry.promptB.trim()) {
    return;
  }

  const cache = getCache();
  const keys = Object.keys(cache);

  if (keys.length >= CACHE_SIZE_LIMIT) {
    const oldest = keys.reduce((a, b) => {
      const aTime = cache[a].timestamp;
      const bTime = cache[b].timestamp;
      if (aTime === bTime) return a < b ? a : b;
      return aTime < bTime ? a : b;
    });
    delete cache[oldest];
  }

  cache[createKey(entry)] = {
    ...entry,
    timestamp: Date.now(),
  };

  saveCache(cache);
}

export function getCachedBattleResponse(
  key: BattleResponseCacheKey,
  maxAgeMs: number = CACHE_TTL_MS
): CachedBattleResponse | null {
  const cache = getCache();
  const cacheKey = createKey(key);
  const result = cache[cacheKey];

  if (!result) {
    return null;
  }

  if (Date.now() - result.timestamp >= maxAgeMs) {
    delete cache[cacheKey];
    saveCache(cache);
    return null;
  }

  return result;
}

export function clearBattleResponseCache(): void {
  try {
    getStorage()?.removeItem(CACHE_KEY);
  } catch (e) {
    console.warn('Failed to clear battle response cache:', e);
  }
}
