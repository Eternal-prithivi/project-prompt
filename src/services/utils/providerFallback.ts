/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Provider Fallback Utility
 * Helps select alternate providers when one fails
 */

export type ProviderType = 'gemini' | 'deepseek' | 'chatgpt' | 'claude' | 'local' | 'grok';

/**
 * Get the next provider to try when current one fails
 * Prefers cloud providers first, then local
 */
export function getNextProvider(
  currentProvider: string,
  availableProviders: ProviderType[]
): ProviderType | null {
  // Fallback chain: if one fails, try next
  const fallbackChain: Record<string, ProviderType[]> = {
    'gemini': ['deepseek', 'chatgpt', 'claude', 'local'],
    'deepseek': ['chatgpt', 'claude', 'gemini', 'local'],
    'chatgpt': ['claude', 'gemini', 'deepseek', 'local'],
    'claude': ['gemini', 'deepseek', 'chatgpt', 'local'],
    'grok': ['gemini', 'deepseek', 'chatgpt', 'local'],
    'local': ['gemini', 'deepseek', 'chatgpt', 'claude'],
  };

  const fallbacks = fallbackChain[currentProvider] || [];

  // Find first available fallback
  for (const fallback of fallbacks) {
    if (availableProviders.includes(fallback)) {
      return fallback;
    }
  }

  // If no fallback in chain, just return first available
  return availableProviders.length > 0 ? availableProviders[0] : null;
}

/**
 * Get priority-ordered list of available providers
 * Useful for UI dropdowns showing best options first
 */
export function getPrioritizedProviders(available: ProviderType[]): ProviderType[] {
  const priority: ProviderType[] = ['gemini', 'claude', 'chatgpt', 'deepseek', 'grok', 'local'];
  return priority.filter((p) => available.includes(p));
}

/**
 * Check if a provider is considered "lightweight" (fast, good for retries)
 */
export function isLightweightProvider(provider: string): boolean {
  return ['gemini', 'deepseek'].includes(provider);
}

/**
 * Check if a provider is available offline (no API key needed)
 */
export function isOfflineProvider(provider: string): boolean {
  return provider === 'local';
}
