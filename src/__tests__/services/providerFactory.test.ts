import { describe, expect, it } from 'vitest';
import { createProvider, getProviderInfo } from '../../services/providerFactory';
import { GeminiProvider } from '../../services/providers/geminiProvider';
import { ChatGPTProvider } from '../../services/providers/chatgptProvider';
import { OllamaProvider } from '../../services/providers/ollamaProvider';
import { PROVIDER_INFO } from '../../services/types/ILLMProvider';

describe('providerFactory', () => {
  it('creates concrete provider instances for supported engines', () => {
    expect(createProvider({ engine: 'gemini', apiKey: 'gemini-key' })).toBeInstanceOf(GeminiProvider);
    expect(createProvider({ engine: 'chatgpt', apiKey: 'chatgpt-key' })).toBeInstanceOf(ChatGPTProvider);
    expect(
      createProvider({ engine: 'local', ollamaUrl: 'http://localhost:11434', selectedModel: 'llama3.1:8b' })
    ).toBeInstanceOf(OllamaProvider);
  });

  it('passes timeout and local model settings through to the provider constructors', () => {
    const provider = createProvider({
      engine: 'local',
      ollamaUrl: 'http://custom-host:11434',
      selectedModel: 'custom-model',
      timeoutMs: 1234,
    }) as any;

    expect(provider.baseUrl).toBe('http://custom-host:11434');
    expect(provider.model).toBe('custom-model');
    expect(provider.timeoutMs).toBe(1234);
  });

  it('throws clear errors when required API keys are missing', () => {
    expect(() => createProvider({ engine: 'gemini' })).toThrow('Gemini API key required');
    expect(() => createProvider({ engine: 'chatgpt' })).toThrow('ChatGPT API key required');
  });

  it('throws on unknown engines', () => {
    expect(() => createProvider({ engine: 'mystery' as any })).toThrow('Unknown LLM engine: mystery');
  });

  it('returns provider info for supported engines and null for unknown ones', () => {
    expect(getProviderInfo('local')).toEqual({
      name: 'Local Ollama',
      description: '100% free, completely offline',
      requiresKey: false,
      free: true,
    });
    expect(getProviderInfo('missing')).toBeNull();
  });

  it('exports runtime provider metadata for the UI', () => {
    expect(PROVIDER_INFO.gemini.supportedModels).toContain('gemini-3.1-pro-preview');
    expect(PROVIDER_INFO.local.free).toBe(true);
    expect(PROVIDER_INFO.chatgpt.phase).toBe(2);
  });
});
