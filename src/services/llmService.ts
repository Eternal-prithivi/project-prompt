/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Delegation layer for llmService
 * Routes all calls to the currently initialized provider
 */

import { ILLMProvider, ProviderConfig } from './types/ILLMProvider';
import { createProvider } from './providerFactory';
import { PromptComponents, PromptVariation, JudgeVerdict } from '../types';
import { recordPromptRun, recordCompression } from './utils/telemetryService';

let currentProvider: ILLMProvider | null = null;
let currentConfig: ProviderConfig | null = null;

/**
 * Initialize the LLM provider
 */
export function initializeProvider(config: ProviderConfig): void {
  try {
    currentProvider = createProvider(config);
    currentConfig = config;
  } catch (e: any) {
    currentProvider = null;
    currentConfig = null;
    throw e instanceof Error ? e : new Error(e?.message || 'Failed to initialize provider');
  }
}

/**
 * Get the current provider, throw if not initialized
 */
function getProvider(): ILLMProvider {
  if (!currentProvider) {
    throw new Error(
      'Provider not initialized. Please configure in Settings and call initializeProvider().'
    );
  }
  return currentProvider;
}

function checkOffline(): void {
  if (currentConfig?.engine !== 'local' && typeof navigator !== 'undefined' && navigator.onLine === false) {
    throw new Error('You are currently offline. Cloud providers require an internet connection.');
  }
}

// Delegation functions - all route to current provider

export async function analyzePrompt(input: string): Promise<PromptComponents> {
  checkOffline();
  return getProvider().analyzePrompt(input);
}

export async function generateVariations(components: PromptComponents): Promise<PromptVariation[]> {
  checkOffline();
  return getProvider().generateVariations(components);
}

export async function magicRefine(components: PromptComponents): Promise<PromptComponents> {
  checkOffline();
  return getProvider().magicRefine(components);
}

export async function integrateAnswers(
  components: PromptComponents,
  qas: { q: string; a: string }[]
): Promise<PromptComponents> {
  checkOffline();
  return getProvider().integrateAnswers(components, qas);
}

export async function generateExamples(components: PromptComponents): Promise<string> {
  checkOffline();
  return getProvider().generateExamples(components);
}

export async function runPrompt(
  promptText: string,
  model?: string
): Promise<string> {
  checkOffline();
  recordPromptRun(currentConfig?.engine || 'unknown');
  return getProvider().runPrompt(promptText, model);
}

export async function compressPrompt(promptText: string): Promise<string> {
  checkOffline();
  const result = await getProvider().compressPrompt(promptText);
  
  // Estimate tokens (4 chars = 1 token roughly)
  const originalTokens = Math.ceil(promptText.length / 4);
  const newTokens = Math.ceil(result.length / 4);
  const savedTokens = Math.max(0, originalTokens - newTokens);
  
  if (savedTokens > 0) {
    // Estimate cost: ~$0.005 per 1k tokens
    const savedCost = (savedTokens / 1000) * 0.005;
    recordCompression(savedTokens, savedCost);
  }
  
  return result;
}

export async function judgeArenaOutputs(
  components: PromptComponents,
  promptA: string,
  outA: string,
  promptB: string,
  outB: string
): Promise<JudgeVerdict> {
  checkOffline();
  return getProvider().judgeArenaOutputs(components, promptA, outA, promptB, outB);
}
