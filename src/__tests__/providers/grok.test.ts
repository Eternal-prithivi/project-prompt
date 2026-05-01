import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GrokProvider } from '../../services/providers/grokProvider';

const completion = (content: string) => ({
  choices: [{ message: { content } }],
});

describe('GrokProvider', () => {
  let provider: GrokProvider;
  let create: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    create = vi.fn();
    provider = new GrokProvider('xai-test-key');
    (provider as any).client = {
      chat: {
        completions: {
          create,
        },
      },
    };
  });

  it('rejects missing API keys at construction time', () => {
    expect(() => new GrokProvider('')).toThrow('Grok API key is required');
    expect(() => new GrokProvider('undefined')).toThrow('Grok API key is required');
  });

  it('parses analysis JSON and adds an empty custom persona', async () => {
    create.mockResolvedValueOnce(
      completion('```json\n{"role":"Researcher","task":"Analyze","context":"xAI","format":"JSON","constraints":"None"}\n```')
    );

    await expect(provider.analyzePrompt('Analyze this')).resolves.toEqual({
      role: 'Researcher',
      task: 'Analyze',
      context: 'xAI',
      format: 'JSON',
      constraints: 'None',
      customPersona: '',
    });
  });

  it('passes custom persona instructions through variation generation', async () => {
    create.mockResolvedValueOnce(
      completion(
        JSON.stringify([
          { id: 'x', type: 'precisionist', title: 'A', description: 'desc', content: 'content A' },
        ])
      )
    );

    await provider.generateVariations({
      role: 'Writer',
      task: 'Draft',
      context: 'Email',
      format: 'Markdown',
      constraints: 'Concise',
      customPersona: 'Astronaut',
    });

    expect(create.mock.calls[0][0].messages[0].content).toContain('Astronaut');
  });

  it('forwards explicit models through runPrompt', async () => {
    create.mockResolvedValueOnce(completion('Grok answer'));

    await expect(provider.runPrompt('Hello', 'grok-2-1212')).resolves.toBe('Grok answer');
    expect(create.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        model: 'grok-2-1212',
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
