import { beforeEach, describe, expect, it } from 'vitest';
import {
  cachePromptResponse,
  clearPromptResponseCache,
  getCachedPromptResponse,
} from '../../services/utils/promptResponseCache';

describe('promptResponseCache', () => {
  beforeEach(() => {
    sessionStorage.clear();
    clearPromptResponseCache();
  });

  it('caches and retrieves a prompt response for the same provider, model, and prompt', () => {
    cachePromptResponse({
      provider: 'gemini',
      model: 'gemini-3.1-pro-preview',
      prompt: 'Write a status update',
      response: 'Here is the status update.',
    });

    const cached = getCachedPromptResponse({
      provider: 'gemini',
      model: 'gemini-3.1-pro-preview',
      prompt: 'Write a status update',
    });

    expect(cached?.response).toBe('Here is the status update.');
    expect(cached?.provider).toBe('gemini');
    expect(cached?.model).toBe('gemini-3.1-pro-preview');
  });

  it('keeps providers and models isolated', () => {
    cachePromptResponse({
      provider: 'gemini',
      model: 'gemini-3.1-pro-preview',
      prompt: 'Same prompt',
      response: 'Gemini response',
    });

    expect(
      getCachedPromptResponse({
        provider: 'chatgpt',
        model: 'gpt-4-turbo',
        prompt: 'Same prompt',
      })
    ).toBeNull();

    expect(
      getCachedPromptResponse({
        provider: 'gemini',
        model: 'gemini-3-flash-preview',
        prompt: 'Same prompt',
      })
    ).toBeNull();
  });

  it('can be cleared for explicit refresh workflows', () => {
    cachePromptResponse({
      provider: 'gemini',
      model: 'gemini-3.1-pro-preview',
      prompt: 'Cached prompt',
      response: 'Cached response',
    });

    clearPromptResponseCache();

    expect(
      getCachedPromptResponse({
        provider: 'gemini',
        model: 'gemini-3.1-pro-preview',
        prompt: 'Cached prompt',
      })
    ).toBeNull();
  });
});
