import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ILLMProvider, ProviderConfig } from '../../services/types/ILLMProvider';

type ProviderMock = ILLMProvider & {
  id: string;
  calls: Record<keyof ILLMProvider, ReturnType<typeof vi.fn>>;
};

const createProviderMock = (id: string): ProviderMock => {
  const calls = {
    analyzePrompt: vi.fn(async () => ({
      role: `${id}-role`,
      task: `${id}-task`,
      context: '',
      format: '',
      constraints: '',
    })),
    generateVariations: vi.fn(async () => []),
    magicRefine: vi.fn(async (components) => components),
    integrateAnswers: vi.fn(async (components) => components),
    generateExamples: vi.fn(async () => `${id}-examples`),
    runPrompt: vi.fn(async (_prompt: string, model = `${id}-default-model`) => `${id}:${model}`),
    compressPrompt: vi.fn(async () => `${id}-compressed`),
    judgeArenaOutputs: vi.fn(async () => ({ winner: 'A' as const, reasoning: `${id}-reasoning` })),
  };

  return {
    id,
    calls,
    analyzePrompt: calls.analyzePrompt,
    generateVariations: calls.generateVariations,
    magicRefine: calls.magicRefine,
    integrateAnswers: calls.integrateAnswers,
    generateExamples: calls.generateExamples,
    runPrompt: calls.runPrompt,
    compressPrompt: calls.compressPrompt,
    judgeArenaOutputs: calls.judgeArenaOutputs,
  };
};

describe('geminiService provider routing', () => {
  const providers = {
    gemini: createProviderMock('gemini'),
    chatgpt: createProviderMock('chatgpt'),
    local: createProviderMock('local'),
  };

  beforeEach(() => {
    vi.resetModules();
    Object.values(providers).forEach((provider) => {
      Object.values(provider.calls).forEach((mock) => mock.mockClear());
    });
  });

  it('routes all service calls to the selected provider only', async () => {
    vi.doMock('../../services/providerFactory', () => ({
      createProvider: vi.fn((config: ProviderConfig) => providers[config.engine as keyof typeof providers]),
    }));

    const service = await import('../../services/geminiService');
    service.initializeProvider({ engine: 'chatgpt', apiKey: 'chatgpt-key' });

    await service.analyzePrompt('analyze this');
    await service.generateVariations({ role: '', task: '', context: '', format: '', constraints: '' });
    await service.magicRefine({ role: '', task: '', context: '', format: '', constraints: '' });
    await service.integrateAnswers({ role: '', task: '', context: '', format: '', constraints: '' }, []);
    await service.generateExamples({ role: '', task: '', context: '', format: '', constraints: '' });
    await service.runPrompt('run this', 'gpt-4-turbo');
    await service.compressPrompt('compress this');
    await service.judgeArenaOutputs(
      { role: '', task: '', context: '', format: '', constraints: '' },
      'prompt a',
      'output a',
      'prompt b',
      'output b'
    );

    Object.values(providers.chatgpt.calls).forEach((mock) => {
      expect(mock).toHaveBeenCalledTimes(1);
    });
    Object.values(providers.gemini.calls).forEach((mock) => {
      expect(mock).not.toHaveBeenCalled();
    });
    Object.values(providers.local.calls).forEach((mock) => {
      expect(mock).not.toHaveBeenCalled();
    });
  });

  it('lets the selected provider choose its own default model when runPrompt gets no model', async () => {
    vi.doMock('../../services/providerFactory', () => ({
      createProvider: vi.fn((config: ProviderConfig) => providers[config.engine as keyof typeof providers]),
    }));

    const service = await import('../../services/geminiService');
    service.initializeProvider({ engine: 'chatgpt', apiKey: 'chatgpt-key' });

    await expect(service.runPrompt('run this')).resolves.toBe('chatgpt:chatgpt-default-model');
    expect(providers.chatgpt.runPrompt).toHaveBeenCalledWith('run this', undefined);
    expect(providers.gemini.runPrompt).not.toHaveBeenCalled();
  });

  it('switches subsequent calls to the newly selected provider after reinitialization', async () => {
    vi.doMock('../../services/providerFactory', () => ({
      createProvider: vi.fn((config: ProviderConfig) => providers[config.engine as keyof typeof providers]),
    }));

    const service = await import('../../services/geminiService');
    service.initializeProvider({ engine: 'gemini', apiKey: 'gemini-key' });
    await service.compressPrompt('first prompt');

    service.initializeProvider({
      engine: 'local',
      ollamaUrl: 'http://localhost:11434',
      selectedModel: 'llama3.1:8b',
    });
    await service.compressPrompt('second prompt');

    expect(providers.gemini.compressPrompt).toHaveBeenCalledTimes(1);
    expect(providers.gemini.compressPrompt).toHaveBeenCalledWith('first prompt');
    expect(providers.local.compressPrompt).toHaveBeenCalledTimes(1);
    expect(providers.local.compressPrompt).toHaveBeenCalledWith('second prompt');
    expect(providers.chatgpt.compressPrompt).not.toHaveBeenCalled();
  });
});
