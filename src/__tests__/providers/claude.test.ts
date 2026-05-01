import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ClaudeProvider } from '../../services/providers/claudeProvider';

const messageResponse = (text: string) => ({
  content: [{ type: 'text', text }],
});

describe('ClaudeProvider', () => {
  let provider: ClaudeProvider;
  let create: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    create = vi.fn();
    provider = new ClaudeProvider('sk-ant-test-key');
    (provider as any).client = {
      messages: {
        create,
      },
    };
  });

  it('rejects missing API keys at construction time', () => {
    expect(() => new ClaudeProvider('')).toThrow('Claude API key is required');
    expect(() => new ClaudeProvider('undefined')).toThrow('Claude API key is required');
  });

  it('parses structured analysis responses and adds an empty custom persona', async () => {
    create.mockResolvedValueOnce(
      messageResponse('```json\n{"role":"Strategist","task":"Plan","context":"Ops","format":"JSON","constraints":"None"}\n```')
    );

    await expect(provider.analyzePrompt('Plan this')).resolves.toEqual({
      role: 'Strategist',
      task: 'Plan',
      context: 'Ops',
      format: 'JSON',
      constraints: 'None',
      customPersona: '',
    });
  });

  it('preserves scores and custom persona during magicRefine', async () => {
    create.mockResolvedValueOnce(
      messageResponse('{"role":"Strategist","task":"Refined","context":"Ops","format":"Markdown","constraints":"Strict"}')
    );

    const refined = await provider.magicRefine({
      role: 'Strategist',
      task: 'Original',
      context: 'Ops',
      format: 'Text',
      constraints: 'Loose',
      customPersona: 'Coach',
      scores: { clarity: 1, context: 2, constraints: 3, tone: 4, overall: 5, feedback: 'x' },
    });

    expect(refined.customPersona).toBe('Coach');
    expect(refined.scores?.overall).toBe(5);
    expect(refined.task).toBe('Refined');
  });

  it('forwards explicit models through runPrompt', async () => {
    create.mockResolvedValueOnce(messageResponse('Claude answer'));

    await expect(provider.runPrompt('Hello', 'claude-3-sonnet-20250219')).resolves.toBe('Claude answer');
    expect(create.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        model: 'claude-3-sonnet-20250219',
      })
    );
  });

  it('falls back to the original prompt when compression comes back empty', async () => {
    create.mockResolvedValueOnce({ content: [{ type: 'tool_use', id: 'ignored' }] });

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
