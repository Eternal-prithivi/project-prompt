import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ChatGPTProvider } from '../../services/providers/chatgptProvider';

const completion = (content: string) => ({
  choices: [{ message: { content } }],
});

describe('ChatGPTProvider', () => {
  let provider: ChatGPTProvider;
  let create: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    create = vi.fn();
    provider = new ChatGPTProvider('sk-test-key');
    (provider as any).client = {
      chat: {
        completions: {
          create,
        },
      },
    };
  });

  it('rejects missing API keys at construction time', () => {
    expect(() => new ChatGPTProvider('')).toThrow('ChatGPT API key is required');
    expect(() => new ChatGPTProvider('undefined')).toThrow('ChatGPT API key is required');
  });

  it('parses JSON analysis responses and adds an empty custom persona', async () => {
    create.mockResolvedValueOnce(
      completion('```json\n{"role":"Editor","task":"Refine copy","context":"Marketing","format":"JSON","constraints":"None"}\n```')
    );

    await expect(provider.analyzePrompt('Improve this prompt')).resolves.toEqual({
      role: 'Editor',
      task: 'Refine copy',
      context: 'Marketing',
      format: 'JSON',
      constraints: 'None',
      customPersona: '',
    });
  });

  it('reindexes generated variations and keeps the custom persona instruction', async () => {
    create.mockResolvedValueOnce(
      completion(
        JSON.stringify([
          { id: 'abc', type: 'precisionist', title: 'A', description: 'desc', content: 'content A' },
          { id: 'def', type: 'creative', title: 'B', description: 'desc', content: 'content B' },
        ])
      )
    );

    const variations = await provider.generateVariations({
      role: 'Writer',
      task: 'Draft',
      context: 'Email',
      format: 'Markdown',
      constraints: 'Concise',
      customPersona: 'Pirate',
    });

    expect(variations.map((item) => item.id)).toEqual(['0', '1']);
    expect(create.mock.calls[0][0].messages[0].content).toContain('Pirate');
  });

  it('forwards explicit models to runPrompt and returns the provider text response', async () => {
    create.mockResolvedValueOnce(completion('Provider answer'));

    await expect(provider.runPrompt('Hello world', 'gpt-4-turbo')).resolves.toBe('Provider answer');
    expect(create.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        model: 'gpt-4-turbo',
      })
    );
  });

  it('falls back to the original prompt when compression returns an empty string', async () => {
    create.mockResolvedValueOnce(completion(''));

    await expect(provider.compressPrompt('Original prompt')).resolves.toBe('Original prompt');
  });

  it('returns a safe tie verdict if judging fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    create.mockRejectedValueOnce(new Error('Judge failure'));

    await expect(
      provider.judgeArenaOutputs(
        { role: 'Judge', task: 'Compare', context: '', format: '', constraints: '' },
        'Prompt A',
        'Output A',
        'Prompt B',
        'Output B'
      )
    ).resolves.toEqual({
      winner: 'TIE',
      reasoning: 'Judge error: Judge failure',
    });
  });
});
