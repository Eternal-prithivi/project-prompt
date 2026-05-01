/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Delegation layer for geminiService
 * Routes all calls to the currently initialized provider
 */

import { ILLMProvider, ProviderConfig } from './types/ILLMProvider';
import { createProvider } from './providerFactory';
import { PromptComponents, PromptVariation, JudgeVerdict } from '../types';

let currentProvider: ILLMProvider | null = null;

/**
 * Initialize the LLM provider
 */
export function initializeProvider(config: ProviderConfig): void {
  try {
    currentProvider = createProvider(config);
  } catch (e: any) {
    currentProvider = null;
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

// Delegation functions - all route to current provider

export async function analyzePrompt(input: string): Promise<PromptComponents> {
  return getProvider().analyzePrompt(input);
}

export async function generateVariations(components: PromptComponents): Promise<PromptVariation[]> {
  return getProvider().generateVariations(components);
}

export async function magicRefine(components: PromptComponents): Promise<PromptComponents> {
  return getProvider().magicRefine(components);
}

export async function integrateAnswers(
  components: PromptComponents,
  qas: { q: string; a: string }[]
): Promise<PromptComponents> {
  return getProvider().integrateAnswers(components, qas);
}

export async function generateExamples(components: PromptComponents): Promise<string> {
  return getProvider().generateExamples(components);
}

export async function runPrompt(
  promptText: string,
  model?: string
): Promise<string> {
  return getProvider().runPrompt(promptText, model);
}

export async function compressPrompt(promptText: string): Promise<string> {
  return getProvider().compressPrompt(promptText);
}

export async function judgeArenaOutputs(
  components: PromptComponents,
  promptA: string,
  outA: string,
  promptB: string,
  outB: string
): Promise<JudgeVerdict> {
  return getProvider().judgeArenaOutputs(components, promptA, outA, promptB, outB);
}
