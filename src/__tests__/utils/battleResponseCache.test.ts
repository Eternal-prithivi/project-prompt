import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  cacheBattleResponse,
  clearBattleResponseCache,
  getCachedBattleResponse,
} from '../../services/utils/battleResponseCache';

const sampleComponents = {
  role: 'Developer',
  task: 'Write code',
  context: 'A coding task',
  format: 'Markdown',
  constraints: 'Concise',
};

const sampleVerdict = {
  winner: 'A' as const,
  reasoning: 'Prompt A was clearer.',
};

describe('battleResponseCache', () => {
  beforeEach(() => {
    sessionStorage.clear();
    clearBattleResponseCache();
  });

  it('caches and retrieves a full battle result for the same provider, model, prompts, and components', () => {
    cacheBattleResponse({
      provider: 'gemini',
      model: 'gemini-3.1-pro-preview',
      promptA: 'Write a poem about stars',
      promptB: 'Compose a star poem',
      components: sampleComponents,
      outputA: 'Twinkle twinkle little star...',
      outputB: 'Oh stars above so bright...',
      verdict: sampleVerdict,
    });

    const cached = getCachedBattleResponse({
      provider: 'gemini',
      model: 'gemini-3.1-pro-preview',
      promptA: 'Write a poem about stars',
      promptB: 'Compose a star poem',
      components: sampleComponents,
    });

    expect(cached?.outputA).toBe('Twinkle twinkle little star...');
    expect(cached?.outputB).toBe('Oh stars above so bright...');
    expect(cached?.verdict).toEqual(sampleVerdict);
    expect(cached?.provider).toBe('gemini');
  });

  it('keeps providers and models isolated', () => {
    cacheBattleResponse({
      provider: 'gemini',
      model: 'gemini-3.1-pro-preview',
      promptA: 'Same prompt A',
      promptB: 'Same prompt B',
      components: sampleComponents,
      outputA: 'Gemini A',
      outputB: 'Gemini B',
      verdict: sampleVerdict,
    });

    expect(
      getCachedBattleResponse({
        provider: 'chatgpt',
        model: 'gpt-4-turbo',
        promptA: 'Same prompt A',
        promptB: 'Same prompt B',
        components: sampleComponents,
      })
    ).toBeNull();

    expect(
      getCachedBattleResponse({
        provider: 'gemini',
        model: 'gemini-3-flash-preview',
        promptA: 'Same prompt A',
        promptB: 'Same prompt B',
        components: sampleComponents,
      })
    ).toBeNull();
  });

  it('keeps different prompts isolated', () => {
    cacheBattleResponse({
      provider: 'gemini',
      model: 'gemini-3.1-pro-preview',
      promptA: 'Prompt A version 1',
      promptB: 'Prompt B version 1',
      components: sampleComponents,
      outputA: 'Out 1',
      outputB: 'Out 2',
      verdict: sampleVerdict,
    });

    expect(
      getCachedBattleResponse({
        provider: 'gemini',
        model: 'gemini-3.1-pro-preview',
        promptA: 'Prompt A version 2',
        promptB: 'Prompt B version 1',
        components: sampleComponents,
      })
    ).toBeNull();

    expect(
      getCachedBattleResponse({
        provider: 'gemini',
        model: 'gemini-3.1-pro-preview',
        promptA: 'Prompt A version 1',
        promptB: 'Prompt B version 2',
        components: sampleComponents,
      })
    ).toBeNull();
  });

  it('keeps different components isolated', () => {
    cacheBattleResponse({
      provider: 'gemini',
      model: 'gemini-3.1-pro-preview',
      promptA: 'Same prompt A',
      promptB: 'Same prompt B',
      components: { ...sampleComponents, role: 'Manager' },
      outputA: 'Out 1',
      outputB: 'Out 2',
      verdict: sampleVerdict,
    });

    expect(
      getCachedBattleResponse({
        provider: 'gemini',
        model: 'gemini-3.1-pro-preview',
        promptA: 'Same prompt A',
        promptB: 'Same prompt B',
        components: { ...sampleComponents, role: 'Developer' },
      })
    ).toBeNull();
  });

  it('expires entries older than the TTL', () => {
    cacheBattleResponse({
      provider: 'gemini',
      model: 'gemini-3.1-pro-preview',
      promptA: 'Write a poem',
      promptB: 'Compose a poem',
      components: sampleComponents,
      outputA: 'Old output A',
      outputB: 'Old output B',
      verdict: sampleVerdict,
    });

    expect(
      getCachedBattleResponse(
        {
          provider: 'gemini',
          model: 'gemini-3.1-pro-preview',
          promptA: 'Write a poem',
          promptB: 'Compose a poem',
          components: sampleComponents,
        },
        0
      )
    ).toBeNull();
  });

  it('can be cleared for explicit refresh workflows', () => {
    cacheBattleResponse({
      provider: 'gemini',
      model: 'gemini-3.1-pro-preview',
      promptA: 'Cached A',
      promptB: 'Cached B',
      components: sampleComponents,
      outputA: 'Cached output A',
      outputB: 'Cached output B',
      verdict: sampleVerdict,
    });

    clearBattleResponseCache();

    expect(
      getCachedBattleResponse({
        provider: 'gemini',
        model: 'gemini-3.1-pro-preview',
        promptA: 'Cached A',
        promptB: 'Cached B',
        components: sampleComponents,
      })
    ).toBeNull();
  });

  it('evicts oldest entry when cache exceeds size limit', () => {
    let now = 0;
    vi.spyOn(Date, 'now').mockImplementation(() => now++);
    const limit = 50;
    for (let i = 0; i < limit + 1; i++) {
      cacheBattleResponse({
        provider: 'gemini',
        model: 'gemini-3.1-pro-preview',
        promptA: `Prompt A ${i}`,
        promptB: `Prompt B ${i}`,
        components: sampleComponents,
        outputA: `Out A ${i}`,
        outputB: `Out B ${i}`,
        verdict: { winner: 'A' as const, reasoning: `Reason ${i}` },
      });
    }

    expect(
      getCachedBattleResponse({
        provider: 'gemini',
        model: 'gemini-3.1-pro-preview',
        promptA: 'Prompt A 0',
        promptB: 'Prompt B 0',
        components: sampleComponents,
      })
    ).toBeNull();

    expect(
      getCachedBattleResponse({
        provider: 'gemini',
        model: 'gemini-3.1-pro-preview',
        promptA: `Prompt A ${limit}`,
        promptB: `Prompt B ${limit}`,
        components: sampleComponents,
      })
    ).not.toBeNull();
    vi.restoreAllMocks();
  });

  it('skips caching when promptA, promptB, or verdict is empty', () => {
    cacheBattleResponse({
      provider: 'gemini',
      model: 'gemini-3.1-pro-preview',
      promptA: '',
      promptB: 'Valid prompt B',
      components: sampleComponents,
      outputA: 'Out A',
      outputB: 'Out B',
      verdict: sampleVerdict,
    });

    expect(
      getCachedBattleResponse({
        provider: 'gemini',
        model: 'gemini-3.1-pro-preview',
        promptA: '',
        promptB: 'Valid prompt B',
        components: sampleComponents,
      })
    ).toBeNull();

    cacheBattleResponse({
      provider: 'gemini',
      model: 'gemini-3.1-pro-preview',
      promptA: 'Valid prompt A',
      promptB: 'Valid prompt B',
      components: sampleComponents,
      outputA: 'Out A',
      outputB: 'Out B',
      verdict: { winner: 'TIE' as const, reasoning: '' },
    });

    expect(
      getCachedBattleResponse({
        provider: 'gemini',
        model: 'gemini-3.1-pro-preview',
        promptA: 'Valid prompt A',
        promptB: 'Valid prompt B',
        components: sampleComponents,
      })
    ).not.toBeNull();
  });
});
