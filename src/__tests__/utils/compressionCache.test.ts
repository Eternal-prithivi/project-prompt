import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  cacheCompression,
  clearCompressionCache,
  getCachedCompression,
  getCacheStats,
  isCached,
} from '../../services/utils/compressionCache';

describe('compressionCache', () => {
  beforeEach(() => {
    clearCompressionCache();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it('stores fast and safe compressions separately for the same prompt', () => {
    cacheCompression('Prompt A', 'Fast result', 'fast', 81);
    cacheCompression('Prompt A', 'Safe result', 'safe', 97);

    expect(getCachedCompression('Prompt A', 'fast')).toMatchObject({
      compressed: 'Fast result',
      mode: 'fast',
      quality: 81,
    });
    expect(getCachedCompression('Prompt A', 'safe')).toMatchObject({
      compressed: 'Safe result',
      mode: 'safe',
      quality: 97,
    });
    expect(isCached('Prompt A', 'fast')).toBe(true);
    expect(isCached('Prompt A', 'safe')).toBe(true);
  });

  it('returns any cached result when mode is omitted', () => {
    cacheCompression('Prompt B', 'Safe only', 'safe', 95);

    expect(getCachedCompression('Prompt B')).toMatchObject({
      compressed: 'Safe only',
      mode: 'safe',
    });
    expect(isCached('Prompt B')).toBe(true);
  });

  it('evicts the oldest entry when the cache exceeds the size limit', () => {
    let now = 0;
    vi.spyOn(Date, 'now').mockImplementation(() => ++now);

    for (let index = 0; index <= 50; index += 1) {
      cacheCompression(`Prompt ${index}`, `Compressed ${index}`, 'fast', 90);
    }

    expect(getCachedCompression('Prompt 0', 'fast')).toBeNull();
    expect(getCachedCompression('Prompt 50', 'fast')).toMatchObject({
      compressed: 'Compressed 50',
    });
    expect(getCacheStats().total).toBe(50);
  });

  it('clears all cached entries and resets stats', () => {
    cacheCompression('Prompt C', 'Compressed C', 'fast', 88);
    cacheCompression('Prompt D', 'Compressed D', 'safe', 92);

    expect(getCacheStats().total).toBe(2);

    clearCompressionCache();

    expect(getCachedCompression('Prompt C', 'fast')).toBeNull();
    expect(getCachedCompression('Prompt D', 'safe')).toBeNull();
    expect(getCacheStats()).toEqual({ total: 0, hitRate: 0 });
  });
});
