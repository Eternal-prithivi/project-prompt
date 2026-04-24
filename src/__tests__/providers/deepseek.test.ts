import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DeepseekProvider } from '../../services/providers/deepseekProvider';
import { PromptComponents } from '../../types';

describe('DeepseekProvider', () => {
  let provider: DeepseekProvider;

  beforeEach(() => {
    vi.clearAllMocks();
    provider = new DeepseekProvider('test-key');
  });

  describe('initialization', () => {
    it('should initialize with API key', () => {
      const p = new DeepseekProvider('test-deepseek-key');
      expect(p).toBeDefined();
    });

    it('should throw error without API key', () => {
      expect(() => new DeepseekProvider('')).toThrow();
    });

    it('should implement ILLMProvider interface', () => {
      expect(provider.analyzePrompt).toBeDefined();
      expect(provider.generateVariations).toBeDefined();
      expect(provider.magicRefine).toBeDefined();
      expect(provider.runPrompt).toBeDefined();
      expect(provider.generateExamples).toBeDefined();
      expect(provider.integrateAnswers).toBeDefined();
      expect(provider.compressPrompt).toBeDefined();
      expect(provider.judgeArenaOutputs).toBeDefined();
    });
  });

  describe('analyzePrompt', () => {
    it('should return prompt components', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  role: 'AI Assistant',
                  task: 'Answer questions',
                  context: 'General',
                  format: 'Text',
                  constraints: 'None',
                  scores: {
                    clarity: 80,
                    context: 70,
                    constraints: 75,
                    tone: 85,
                    overall: 77,
                    feedback: 'Good prompt',
                  },
                  questions: ['Q1', 'Q2', 'Q3'],
                }),
              },
            },
          ],
        }),
      });

      const result = await provider.analyzePrompt('test prompt');

      expect(result).toHaveProperty('role');
      expect(result).toHaveProperty('task');
      expect(result).toHaveProperty('scores');
      expect(result).toHaveProperty('questions');
    });

    it('should handle API errors', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
      });

      await expect(provider.analyzePrompt('test prompt')).rejects.toThrow(/DeepSeek API error/);
    });

    it('should handle network errors', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      await expect(provider.analyzePrompt('test prompt')).rejects.toThrow(/Network error/);
    });

    it('should handle malformed JSON response', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'not-json' } }],
        }),
      });

      await expect(provider.analyzePrompt('test prompt')).resolves.toBeDefined();
    });
  });

  describe('generateVariations', () => {
    it('should generate multiple variations', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: JSON.stringify([
                  { id: '1', type: 'precisionist', title: 'Precise', description: 'Formal', content: 'Content 1' },
                  { id: '2', type: 'creative', title: 'Creative', description: 'Fun', content: 'Content 2' },
                  { id: '3', type: 'mastermind', title: 'Master', description: 'Complex', content: 'Content 3' },
                ]),
              },
            },
          ],
        }),
      });

      const components: PromptComponents = {
        role: 'Test',
        task: 'Test task',
        context: 'Test context',
        format: 'JSON',
        constraints: 'None',
        customPersona: '',
      };

      const result = await provider.generateVariations(components);

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('runPrompt', () => {
    it('should execute prompt and return response', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'Generated response' } }],
        }),
      });

      const result = await provider.runPrompt('test prompt', 'deepseek-chat');

      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('should handle empty response', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: '' } }],
        }),
      });

      const result = await provider.runPrompt('test prompt', 'deepseek-chat');

      expect(typeof result).toBe('string');
    });

    it('should handle missing content field', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{ message: {} }],
        }),
      });

      const result = await provider.runPrompt('test prompt', 'deepseek-chat');

      expect(typeof result).toBe('string');
    });
  });

  describe('compressPrompt', () => {
    it('should compress prompt to shorter version', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: 'Compressed prompt that is shorter than original',
              },
            },
          ],
        }),
      });

      const longPrompt = 'This is a very long prompt that needs to be compressed. '.repeat(10);
      const result = await provider.compressPrompt(longPrompt);

      expect(typeof result).toBe('string');
    });

    it('should handle compression errors gracefully', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('API error'));

      const longPrompt = 'Test prompt';
      const result = await provider.compressPrompt(longPrompt);

      // Should return original or fallback
      expect(typeof result).toBe('string');
    });
  });

  describe('API integration', () => {
    it('should call DeepSeek API with correct endpoint', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ choices: [{ message: { content: '{}' } }] }),
      });
      global.fetch = fetchMock;

      await provider.runPrompt('test', 'deepseek-chat');

      const call = fetchMock.mock.calls[0];
      expect(call[0]).toContain('deepseek');
    });

    it('should include API key in headers', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ choices: [{ message: { content: '{}' } }] }),
      });
      global.fetch = fetchMock;

      await provider.runPrompt('test', 'deepseek-chat');

      const call = fetchMock.mock.calls[0];
      expect(call[1].headers).toBeDefined();
      expect(call[1].headers.Authorization).toContain('Bearer');
    });

    it('should handle rate limiting', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
      });

      await expect(provider.runPrompt('test', 'deepseek-chat')).rejects.toThrow(/DeepSeek API error/);
    });
  });

  describe('error handling', () => {
    it('should handle network timeouts', async () => {
      global.fetch = vi.fn().mockImplementation(
        () =>
          new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Timeout')), 100);
          })
      );

      await expect(provider.analyzePrompt('test')).rejects.toThrow(/Timeout/);
    });

    it('should handle invalid credentials', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
      });

      await expect(provider.runPrompt('test', 'deepseek-chat')).rejects.toThrow(/DeepSeek API error/);
    });

    it('should handle server errors', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
      });

      await expect(provider.runPrompt('test', 'deepseek-chat')).rejects.toThrow(/DeepSeek API error/);
    });
  });

  describe('edge cases', () => {
    it('should handle very long prompts', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ choices: [{ message: { content: 'response' } }] }),
      });

      const longPrompt = 'A'.repeat(10000);
      const result = await provider.runPrompt(longPrompt, 'deepseek-chat');

      expect(typeof result).toBe('string');
    });

    it('should handle special characters in prompts', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ choices: [{ message: { content: 'response' } }] }),
      });

      const specialPrompt = 'Test with émojis 🔒 and "quotes" and \\backslashes\\';
      const result = await provider.runPrompt(specialPrompt, 'deepseek-chat');

      expect(typeof result).toBe('string');
    });

    it('should handle concurrent requests', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ choices: [{ message: { content: 'response' } }] }),
      });

      const promises = [
        provider.runPrompt('prompt1', 'deepseek-chat'),
        provider.runPrompt('prompt2', 'deepseek-chat'),
        provider.runPrompt('prompt3', 'deepseek-chat'),
      ];

      const results = await Promise.all(promises);

      expect(results.length).toBe(3);
      results.forEach((r) => expect(typeof r).toBe('string'));
    });
  });
});
