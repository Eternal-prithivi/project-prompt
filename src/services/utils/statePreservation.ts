/**
 * State preservation utility for error recovery flows.
 * Preserves transient state in sessionStorage so users don't lose progress when errors occur.
 *
 * State is preserved on error and restored on recovery.
 * State is cleared when workflow completes or user explicitly resets.
 */

import { PromptComponents, PromptVariation, WizardStep } from '../../types';

interface PreservedState {
  initialInput: string;
  components: PromptComponents;
  interviewAnswers: Record<number, string>;
  results: PromptVariation[];
  arenaSelections: string[];
  selectedEngine: 'gemini' | 'deepseek' | 'local' | 'chatgpt' | 'claude' | 'grok';
  step: WizardStep;
  timestamp: number; // when state was saved
}

const STORAGE_KEY = 'pa_preserved_state';
const MAX_AGE_MS = 60 * 60 * 1000; // 1 hour

/**
 * Save transient state for recovery after errors
 */
export const savePreservedState = (state: Partial<PreservedState>): void => {
  try {
    const existing = getPreservedState();
    const merged: PreservedState = {
      initialInput: state.initialInput ?? existing?.initialInput ?? '',
      components: state.components ?? existing?.components ?? { role: '', task: '', context: '', format: '', constraints: '', customPersona: '' },
      interviewAnswers: state.interviewAnswers ?? existing?.interviewAnswers ?? {},
      results: state.results ?? existing?.results ?? [],
      arenaSelections: state.arenaSelections ?? existing?.arenaSelections ?? [],
      selectedEngine: state.selectedEngine ?? existing?.selectedEngine ?? 'gemini',
      step: state.step ?? existing?.step ?? 'initial',
      timestamp: Date.now(),
    };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
  } catch (e) {
    console.warn('Failed to save preserved state:', e);
  }
};

/**
 * Retrieve preserved state if it exists and is not stale
 */
export const getPreservedState = (): PreservedState | null => {
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (!stored) return null;

    const state: PreservedState = JSON.parse(stored);

    // Check if state is stale (older than MAX_AGE_MS)
    if (Date.now() - state.timestamp > MAX_AGE_MS) {
      clearPreservedState();
      return null;
    }

    return state;
  } catch (e) {
    console.warn('Failed to retrieve preserved state:', e);
    return null;
  }
};

/**
 * Clear preserved state (called after successful completion or user reset)
 */
export const clearPreservedState = (): void => {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.warn('Failed to clear preserved state:', e);
  }
};

/**
 * Check if there is valid preserved state available
 */
export const hasPreservedState = (): boolean => {
  return getPreservedState() !== null;
};

/**
 * Restore specific state properties from preserved state
 * Only restores if they are defined in the preserved state
 */
export const restorePreservedState = (state: PreservedState): Partial<PreservedState> => {
  return {
    initialInput: state.initialInput || undefined,
    components: state.components && Object.values(state.components).some(v => v) ? state.components : undefined,
    interviewAnswers: Object.keys(state.interviewAnswers).length > 0 ? state.interviewAnswers : undefined,
    results: state.results && state.results.length > 0 ? state.results : undefined,
    arenaSelections: state.arenaSelections && state.arenaSelections.length > 0 ? state.arenaSelections : undefined,
    selectedEngine: state.selectedEngine || undefined,
    step: state.step || undefined,
  };
};
