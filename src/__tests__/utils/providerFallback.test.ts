import { describe, it, expect } from 'vitest';
import {
  getNextProvider,
  getPrioritizedProviders,
  isLightweightProvider,
  isOfflineProvider,
} from '../../services/utils/providerFallback';

describe('providerFallback', () => {
  describe('getNextProvider', () => {
    it('should fallback from gemini to deepseek', () => {
      const next = getNextProvider('gemini', ['deepseek', 'chatgpt']);
      expect(next).toBe('deepseek');
    });

    it('should fallback from deepseek to chatgpt', () => {
      const next = getNextProvider('deepseek', ['chatgpt', 'claude']);
      expect(next).toBe('chatgpt');
    });

    it('should skip unavailable providers in chain', () => {
      const next = getNextProvider('gemini', ['claude', 'local']);
      expect(next).toBe('claude'); // skips deepseek, chatgpt
    });

    it('should fallback to local if no cloud providers available', () => {
      const next = getNextProvider('gemini', ['local']);
      expect(next).toBe('local');
    });

    it('should return first available if no chain match', () => {
      const next = getNextProvider('unknown', ['gemini', 'deepseek']);
      expect(next).toBe('gemini');
    });

    it('should return null if no providers available', () => {
      const next = getNextProvider('gemini', []);
      expect(next).toBeNull();
    });

    it('should handle local fallback chain', () => {
      const next = getNextProvider('local', ['gemini', 'deepseek']);
      expect(next).toBe('gemini');
    });
  });

  describe('getPrioritizedProviders', () => {
    it('should return providers in priority order', () => {
      const prioritized = getPrioritizedProviders(['local', 'deepseek', 'gemini']);
      expect(prioritized).toEqual(['gemini', 'deepseek', 'local']);
    });

    it('should filter out unavailable providers', () => {
      const prioritized = getPrioritizedProviders(['gemini', 'chatgpt']);
      expect(prioritized).toEqual(['gemini', 'chatgpt']);
      expect(prioritized).not.toContain('deepseek');
    });

    it('should handle empty input', () => {
      const prioritized = getPrioritizedProviders([]);
      expect(prioritized).toEqual([]);
    });
  });

  describe('isLightweightProvider', () => {
    it('should identify gemini as lightweight', () => {
      expect(isLightweightProvider('gemini')).toBe(true);
    });

    it('should identify deepseek as lightweight', () => {
      expect(isLightweightProvider('deepseek')).toBe(true);
    });

    it('should not identify claude as lightweight', () => {
      expect(isLightweightProvider('claude')).toBe(false);
    });

    it('should not identify local as lightweight', () => {
      expect(isLightweightProvider('local')).toBe(false);
    });
  });

  describe('isOfflineProvider', () => {
    it('should identify local as offline', () => {
      expect(isOfflineProvider('local')).toBe(true);
    });

    it('should not identify gemini as offline', () => {
      expect(isOfflineProvider('gemini')).toBe(false);
    });

    it('should not identify deepseek as offline', () => {
      expect(isOfflineProvider('deepseek')).toBe(false);
    });
  });
});
