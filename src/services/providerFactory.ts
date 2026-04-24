/**
 * Factory for creating LLM providers based on configuration
 * Routes to correct provider implementation (Gemini, DeepSeek, Ollama, ChatGPT, Claude, Grok)
 */

import { ILLMProvider, ProviderConfig } from './types/ILLMProvider';
import { GeminiProvider } from './providers/geminiProvider';
import { DeepseekProvider } from './providers/deepseekProvider';
import { OllamaProvider } from './providers/ollamaProvider';
import { ChatGPTProvider } from './providers/chatgptProvider';
import { ClaudeProvider } from './providers/claudeProvider';
import { GrokProvider } from './providers/grokProvider';

export type LLMEngine = 'gemini' | 'deepseek' | 'local' | 'chatgpt' | 'claude' | 'grok';

/**
 * Create an LLM provider instance based on configuration
 * @throws Error if engine is unknown or required credentials missing
 */
export function createProvider(config: ProviderConfig): ILLMProvider {
  switch (config.engine) {
    case 'gemini':
      if (!config.apiKey) throw new Error('Gemini API key required');
      return new GeminiProvider(config.apiKey, { timeoutMs: config.timeoutMs });

    case 'deepseek':
      if (!config.apiKey) throw new Error('DeepSeek API key required');
      return new DeepseekProvider(config.apiKey, { timeoutMs: config.timeoutMs });

    case 'local':
      return new OllamaProvider(
        config.ollamaUrl || 'http://localhost:11434',
        config.selectedModel || 'deepseek-r1',
        { timeoutMs: config.timeoutMs }
      );

    case 'chatgpt':
      if (!config.apiKey) throw new Error('ChatGPT API key required');
      return new ChatGPTProvider(config.apiKey, { timeoutMs: config.timeoutMs });

    case 'claude':
      if (!config.apiKey) throw new Error('Claude API key required');
      return new ClaudeProvider(config.apiKey, { timeoutMs: config.timeoutMs });

    case 'grok':
      if (!config.apiKey) throw new Error('Grok API key required');
      return new GrokProvider(config.apiKey, { timeoutMs: config.timeoutMs });

    default:
      throw new Error(`Unknown LLM engine: ${config.engine}`);
  }
}

/**
 * Get provider info by engine type
 */
export function getProviderInfo(engine: string) {
  const providers: Record<string, any> = {
    gemini: {
      name: 'Google Gemini',
      description: 'Fast and powerful',
      requiresKey: true,
      free: false,
    },
    deepseek: {
      name: 'DeepSeek',
      description: 'Cheap and reliable',
      requiresKey: true,
      free: false,
    },
    local: {
      name: 'Local Ollama',
      description: '100% free, completely offline',
      requiresKey: false,
      free: true,
    },
    chatgpt: {
      name: 'ChatGPT / OpenAI',
      description: 'Powerful GPT models',
      requiresKey: true,
      free: false,
    },
    claude: {
      name: 'Claude / Anthropic',
      description: 'Advanced reasoning capabilities',
      requiresKey: true,
      free: false,
    },
    grok: {
      name: 'Grok / xAI',
      description: 'Next-gen reasoning model',
      requiresKey: true,
      free: false,
    },
  };

  return providers[engine] || null;
}
