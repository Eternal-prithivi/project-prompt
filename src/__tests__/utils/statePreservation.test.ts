import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { savePreservedState, getPreservedState, clearPreservedState, hasPreservedState, restorePreservedState } from '../../services/utils/statePreservation';

describe('statePreservation', () => {
  beforeEach(() => {
    // Clear sessionStorage before each test
    sessionStorage.clear();
  });

  afterEach(() => {
    // Clean up after each test
    sessionStorage.clear();
  });

  describe('savePreservedState', () => {
    it('should save state to sessionStorage', () => {
      const state = {
        initialInput: 'test prompt',
        selectedEngine: 'gemini' as const,
      };
      savePreservedState(state);
      const retrieved = getPreservedState();
      expect(retrieved?.initialInput).toBe('test prompt');
      expect(retrieved?.selectedEngine).toBe('gemini');
    });

    it('should merge with existing state', () => {
      savePreservedState({ initialInput: 'first' });
      savePreservedState({ selectedEngine: 'deepseek' });
      const retrieved = getPreservedState();
      expect(retrieved?.initialInput).toBe('first');
      expect(retrieved?.selectedEngine).toBe('deepseek');
    });

    it('should handle empty state gracefully', () => {
      savePreservedState({});
      const retrieved = getPreservedState();
      expect(retrieved).not.toBeNull();
      expect(retrieved?.initialInput).toBe('');
    });

    it('should update timestamp on each save', () => {
      savePreservedState({ initialInput: 'test' });
      const first = getPreservedState();
      const firstTime = first?.timestamp;

      // Wait a tiny bit and save again
      setTimeout(() => {
        savePreservedState({ initialInput: 'test2' });
        const second = getPreservedState();
        expect(second?.timestamp).toBeGreaterThanOrEqual(firstTime!);
      }, 10);
    });
  });

  describe('getPreservedState', () => {
    it('should return null when no state exists', () => {
      expect(getPreservedState()).toBeNull();
    });

    it('should return state when it exists', () => {
      savePreservedState({ initialInput: 'test' });
      const state = getPreservedState();
      expect(state).not.toBeNull();
      expect(state?.initialInput).toBe('test');
    });

    it('should return null when state is stale (over 1 hour old)', () => {
      const oldState = {
        initialInput: 'old',
        components: { role: '', task: '', context: '', format: '', constraints: '', customPersona: '' },
        interviewAnswers: {},
        results: [],
        arenaSelections: [],
        selectedEngine: 'gemini' as const,
        step: 'initial' as const,
        timestamp: Date.now() - 61 * 60 * 1000, // 61 minutes ago
      };
      sessionStorage.setItem('pa_preserved_state', JSON.stringify(oldState));
      const state = getPreservedState();
      expect(state).toBeNull();
    });

    it('should not return null for state less than 1 hour old', () => {
      savePreservedState({ initialInput: 'fresh' });
      const state = getPreservedState();
      expect(state).not.toBeNull();
    });
  });

  describe('clearPreservedState', () => {
    it('should remove state from sessionStorage', () => {
      savePreservedState({ initialInput: 'test' });
      expect(getPreservedState()).not.toBeNull();
      clearPreservedState();
      expect(getPreservedState()).toBeNull();
    });

    it('should handle clearing when nothing exists', () => {
      expect(() => clearPreservedState()).not.toThrow();
    });
  });

  describe('hasPreservedState', () => {
    it('should return false when no state exists', () => {
      expect(hasPreservedState()).toBe(false);
    });

    it('should return true when state exists', () => {
      savePreservedState({ initialInput: 'test' });
      expect(hasPreservedState()).toBe(true);
    });

    it('should return false when state is stale', () => {
      const oldState = {
        initialInput: 'old',
        components: { role: '', task: '', context: '', format: '', constraints: '', customPersona: '' },
        interviewAnswers: {},
        results: [],
        arenaSelections: [],
        selectedEngine: 'gemini' as const,
        step: 'initial' as const,
        timestamp: Date.now() - 61 * 60 * 1000,
      };
      sessionStorage.setItem('pa_preserved_state', JSON.stringify(oldState));
      expect(hasPreservedState()).toBe(false);
    });
  });

  describe('restorePreservedState', () => {
    it('should return defined fields from preserved state', () => {
      const state = {
        initialInput: 'test',
        components: { role: 'expert', task: 'analyze', context: '', format: '', constraints: '', customPersona: '' },
        interviewAnswers: { 0: 'answer1' },
        results: [],
        arenaSelections: [],
        selectedEngine: 'gemini' as const,
        step: 'refining' as const,
        timestamp: Date.now(),
      };
      const restored = restorePreservedState(state);
      expect(restored.initialInput).toBe('test');
      expect(restored.components?.role).toBe('expert');
      expect(restored.interviewAnswers).toBeDefined();
      expect(restored.step).toBe('refining');
    });

    it('should return undefined for empty collections', () => {
      const state = {
        initialInput: '',
        components: { role: '', task: '', context: '', format: '', constraints: '', customPersona: '' },
        interviewAnswers: {},
        results: [],
        arenaSelections: [],
        selectedEngine: 'gemini' as const,
        step: 'initial' as const,
        timestamp: Date.now(),
      };
      const restored = restorePreservedState(state);
      expect(restored.initialInput).toBeUndefined();
      expect(restored.components).toBeUndefined();
      expect(restored.interviewAnswers).toBeUndefined();
      expect(restored.results).toBeUndefined();
      expect(restored.arenaSelections).toBeUndefined();
    });
  });
});
