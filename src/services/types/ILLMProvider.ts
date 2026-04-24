/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Unified interface for all LLM providers.
 * Every provider (Gemini, DeepSeek, Ollama, ChatGPT, Claude, Grok) must implement these methods.
 */

import { PromptComponents, PromptVariation, JudgeVerdict } from '../../types';

/**
 * Unified interface for LLM providers.
 * Ensures all providers have consistent behavior and can be swapped at runtime.
 */
export interface ILLMProvider {
  /**
   * Analyze a basic prompt and extract/suggest RTC components
   * @param input - The basic prompt from user
   * @returns Extracted Role, Task, Context, Format, Constraints, with scoring
   */
  analyzePrompt(input: string): Promise<PromptComponents>;

  /**
   * Generate multiple variations of a prompt (Precisionist, Creative, Mastermind)
   * @param components - The RTC components to use
   * @returns Array of 3+ prompt variations with different approaches
   */
  generateVariations(components: PromptComponents): Promise<PromptVariation[]>;

  /**
   * Automatically refine and enhance prompt components
   * @param components - Current RTC components
   * @returns Enhanced components with better wording/structure
   */
  magicRefine(components: PromptComponents): Promise<PromptComponents>;

  /**
   * Integrate user answers from clarifying questions into components
   * @param components - Current RTC components
   * @param qas - Array of question-answer pairs from user interview
   * @returns Updated components incorporating the answers
   */
  integrateAnswers(
    components: PromptComponents,
    qas: { q: string; a: string }[]
  ): Promise<PromptComponents>;

  /**
   * Generate few-shot examples to add to the prompt format
   * @param components - Current RTC components
   * @returns Markdown formatted examples (Input/Output pairs)
   */
  generateExamples(components: PromptComponents): Promise<string>;

  /**
   * Run a prompt against the LLM and get response
   * @param promptText - The actual prompt text to send
   * @param model - Model name/version (provider-specific: "gemini-3.1-pro-preview" etc)
   * @returns Raw response from the LLM
   */
  runPrompt(promptText: string, model: string): Promise<string>;

  /**
   * Compress a prompt to minimize token usage without losing meaning
   * @param promptText - The prompt to compress
   * @returns Compressed version with fewer tokens
   */
  compressPrompt(promptText: string): Promise<string>;

  /**
   * Judge/compare two prompts by running them and evaluating outputs
   * @param components - Original task requirements
   * @param promptA - First prompt text
   * @param outA - Output from first prompt
   * @param promptB - Second prompt text
   * @param outB - Output from second prompt
   * @returns Verdict on which prompt performed better
   */
  judgeArenaOutputs(
    components: PromptComponents,
    promptA: string,
    outA: string,
    promptB: string,
    outB: string
  ): Promise<JudgeVerdict>;
}

/**
 * Configuration for creating a provider
 */
export interface ProviderConfig {
  engine: 'gemini' | 'deepseek' | 'local' | 'chatgpt' | 'claude' | 'grok';
  apiKey?: string; // For cloud providers (Gemini, DeepSeek, ChatGPT, Claude, Grok)
  ollamaUrl?: string; // For local Ollama (default: http://localhost:11434)
  selectedModel?: string; // Model selection for Ollama
  /**
   * Optional request timeout (ms) applied by providers.
   * Defaults to 30000 if not provided.
   */
  timeoutMs?: number;
}

/**
 * Provider information for UI display
 */
export interface ProviderInfo {
  id: string;
  name: string;
  description: string;
  type: 'cloud' | 'local';
  requiresApiKey: boolean;
  free: boolean;
  supportedModels: string[];
  logo?: string;
  phase: 1 | 2;
}

export const PROVIDER_INFO: Record<string, ProviderInfo> = {
  gemini: {
    id: 'gemini',
    name: 'Google Gemini',
    description: 'Fast, powerful, and natively supported',
    type: 'cloud',
    requiresApiKey: true,
    free: false,
    supportedModels: ['gemini-3.1-pro-preview', 'gemini-3-flash-preview'],
    phase: 1,
  },
  deepseek: {
    id: 'deepseek',
    name: 'DeepSeek',
    description: 'Extremely cheap, excellent performance',
    type: 'cloud',
    requiresApiKey: true,
    free: false,
    supportedModels: ['deepseek-chat', 'deepseek-coder'],
    phase: 1,
  },
  local: {
    id: 'local',
    name: 'Local Ollama',
    description: '100% free and completely offline',
    type: 'local',
    requiresApiKey: false,
    free: true,
    supportedModels: ['deepseek-r1', 'llama2', 'mistral', 'neural-chat'],
    phase: 1,
  },
  chatgpt: {
    id: 'chatgpt',
    name: 'ChatGPT / OpenAI',
    description: 'Powerful GPT models (Phase 2)',
    type: 'cloud',
    requiresApiKey: true,
    free: false,
    supportedModels: ['gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo'],
    phase: 2,
  },
  claude: {
    id: 'claude',
    name: 'Claude / Anthropic',
    description: 'Advanced reasoning capabilities (Phase 2)',
    type: 'cloud',
    requiresApiKey: true,
    free: false,
    supportedModels: ['claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku'],
    phase: 2,
  },
  grok: {
    id: 'grok',
    name: 'Grok / xAI',
    description: 'Next-gen reasoning model (Phase 2)',
    type: 'cloud',
    requiresApiKey: true,
    free: false,
    supportedModels: ['grok-1', 'grok-1-vision'],
    phase: 2,
  },
};
