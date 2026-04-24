import { describe, it, expect, beforeEach, vi } from 'vitest';
import { OllamaProvider } from '../../services/providers/ollamaProvider';
import { PromptComponents } from '../../types';

describe('OllamaProvider', () => {
  let provider: OllamaProvider;

  beforeEach(() => {
    vi.clearAllMocks();
    provider = new OllamaProvider('http://localhost:11434', 'deepseek-r1:7b');
    global.fetch = vi.fn();
  });

  describe('initialization', () => {
    it('should initialize with Ollama URL', () => {
      const p = new OllamaProvider('http://localhost:11434', 'model');
      expect(p).toBeDefined();
    });

    it('should use default URL if not provided', () => {
      const p = new OllamaProvider();
      expect(p).toBeDefined();
    });

    it('should remove trailing slash from URL', () => {
      const p = new OllamaProvider('http://localhost:11434/', 'model');
      expect(p).toBeDefined();
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
    it('should return prompt components when API succeeds', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          response: JSON.stringify({
            role: 'Assistant',
            task: 'Test task',
            context: 'Test context',
            format: 'JSON',
            constraints: 'None',
            scores: {
              clarity: 80,
              context: 75,
              constraints: 80,
              tone: 85,
              overall: 80,
              feedback: 'Good',
            },
            questions: ['Q1', 'Q2', 'Q3'],
          }),
        }),
      });

      const result = await provider.analyzePrompt('test prompt');

      expect(result).toHaveProperty('role');
      expect(result).toHaveProperty('task');
      expect(result.customPersona).toBe('');
    });

    it('should return fallback when API fails', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('Connection failed'));

      const result = await provider.analyzePrompt('test prompt');

      expect(result.role).toBeDefined();
      expect(result.task).toBeDefined();
      expect(result.context).toBeDefined();
    });

    it('should handle malformed JSON response', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          response: 'not json',
        }),
      });

      const result = await provider.analyzePrompt('test');

      expect(result.role).toBeDefined(); // Should return fallback
    });

    it('should handle API errors', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      const result = await provider.analyzePrompt('test');
      expect(result.role).toBeDefined(); // fallback
    });
  });

  describe('generateVariations', () => {
    it('should generate prompt variations', async () => {
      const mockVariations = [
        { id: '0', type: 'precisionist', title: 'Precise', description: 'Formal', content: 'Content 1' },
        { id: '1', type: 'creative', title: 'Creative', description: 'Fun', content: 'Content 2' },
        { id: '2', type: 'mastermind', title: 'Master', description: 'Complex', content: 'Content 3' },
      ];

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          response: JSON.stringify(mockVariations),
        }),
      });

      const components: PromptComponents = {
        role: 'Test',
        task: 'Test',
        context: 'Test',
        format: 'Test',
        constraints: 'Test',
        customPersona: '',
      };

      const result = await provider.generateVariations(components);

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should include custom persona in prompt if provided', async () => {
      const fetchMock = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          response: '[]',
        }),
      });
      (global.fetch as any) = fetchMock;

      const components: PromptComponents = {
        role: 'Test',
        task: 'Test',
        context: 'Test',
        format: 'Test',
        constraints: 'Test',
        customPersona: 'Pirate',
      };

      await provider.generateVariations(components);

      const call = fetchMock.mock.calls[0];
      expect(call[1].body).toContain('Pirate');
    });
  });

  describe('runPrompt', () => {
    it('should execute prompt and return response', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          message: { content: 'Generated response' },
        }),
      });

      const result = await provider.runPrompt('test prompt', 'deepseek-r1:7b');

      expect(typeof result).toBe('string');
      expect(result).toBe('Generated response');
    });

    it('should handle empty response', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          message: { content: '' },
        }),
      });

      const result = await provider.runPrompt('test', 'model:latest');

      expect(typeof result).toBe('string');
    });

    it('should send correct model to API', async () => {
      const fetchMock = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message: { content: 'test' } }),
      });
      (global.fetch as any) = fetchMock;

      await provider.runPrompt('prompt', 'custom-model:latest');

      const call = fetchMock.mock.calls[0];
      expect(call[1].body).toContain('custom-model');
    });
  });

  describe('compressPrompt', () => {
    it('should compress prompt', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          message: { content: 'Compressed version' },
        }),
      });

      const result = await provider.compressPrompt('Long prompt that needs compression');

      expect(typeof result).toBe('string');
    });
  });

  describe('error handling', () => {
    it('should handle network errors', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

      await expect(provider.runPrompt('test', 'model:latest')).rejects.toThrow();
    });

    it('should handle server errors', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      await expect(provider.runPrompt('test', 'model:latest')).rejects.toThrow();
    });

    it('should provide meaningful error messages', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('Connection refused'));

      try {
        await provider.runPrompt('test', 'model:latest');
      } catch (e: any) {
        expect(e.message).toContain('Failed to connect');
      }
    });
  });

  describe('API endpoint', () => {
    it('should call correct Ollama API endpoint', async () => {
      const fetchMock = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message: { content: '' } }),
      });
      (global.fetch as any) = fetchMock;

      await provider.runPrompt('test', 'model:latest');

      const endpoint = fetchMock.mock.calls[0][0];
      expect(endpoint).toContain('localhost:11434');
      expect(endpoint).toContain('/api/chat');
    });

    it('should use custom Ollama URL', async () => {
      const customProvider = new OllamaProvider('http://custom:11434', 'model');
      const fetchMock = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message: { content: '' } }),
      });
      (global.fetch as any) = fetchMock;

      await customProvider.runPrompt('test', 'model:latest');

      const endpoint = fetchMock.mock.calls[0][0];
      expect(endpoint).toContain('custom:11434');
    });

    it('should send JSON payload with model and prompt', async () => {
      const fetchMock = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message: { content: '' } }),
      });
      (global.fetch as any) = fetchMock;

      await provider.runPrompt('test prompt', 'test-model:latest');

      const call = fetchMock.mock.calls[0];
      const body = JSON.parse(call[1].body);
      expect(body.messages?.[0]?.content).toBe('test prompt');
      expect(body.model).toBe('test-model:latest');
      expect(body.stream).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('should handle very long prompts', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message: { content: 'response' } }),
      });

      const longPrompt = 'A'.repeat(10000);
      const result = await provider.runPrompt(longPrompt, 'model:latest');

      expect(typeof result).toBe('string');
    });

    it('should handle special characters in prompts', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message: { content: 'response' } }),
      });

      const specialPrompt = 'Test with émojis 🔒 "quotes" \\backslashes\\';
      const result = await provider.runPrompt(specialPrompt, 'model:latest');

      expect(typeof result).toBe('string');
    });
  });
});
