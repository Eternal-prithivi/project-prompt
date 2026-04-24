import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  validateGeminiKey,
  validateDeepseekKey,
  validateOllamaConnection,
  getOllamaModels,
} from '../../services/providers/validation';

describe('validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('validateGeminiKey', () => {
    it('should return valid for correct Gemini key format', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ models: [{ name: 'gemini-pro' }] }),
      });

      const result = await validateGeminiKey('AIzaSy...');

      expect(result.valid).toBe(true);
    });

    it('should return invalid for empty key', async () => {
      const result = await validateGeminiKey('');

      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should return invalid for missing key', async () => {
      const result = await validateGeminiKey(undefined as any);

      expect(result.valid).toBe(false);
    });

    it('should return invalid for API errors', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
      });

      const result = await validateGeminiKey('invalid-key');

      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should return invalid on network error', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      const result = await validateGeminiKey('test-key');

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Network');
    });

    it('should handle malformed response', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({}),
      });

      const result = await validateGeminiKey('test-key');

      expect(result.valid).toBe(true);
    });
  });

  describe('validateDeepseekKey', () => {
    it('should return valid for correct DeepSeek key', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ model: 'deepseek-chat' }),
      });

      const result = await validateDeepseekKey('sk-deepseek...');

      expect(result.valid).toBe(true);
    });

    it('should return invalid for empty key', async () => {
      const result = await validateDeepseekKey('');

      expect(result.valid).toBe(false);
    });

    it('should return invalid for API errors', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
      });

      const result = await validateDeepseekKey('invalid-key');

      expect(result.valid).toBe(false);
    });

    it('should return invalid on network error', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Connection failed'));

      const result = await validateDeepseekKey('test-key');

      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should validate using OpenAI-compatible endpoint', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ id: 'test' }),
      });
      global.fetch = fetchMock;

      await validateDeepseekKey('test-key');

      expect(fetchMock).toHaveBeenCalled();
      const callArgs = fetchMock.mock.calls[0];
      expect(callArgs[0]).toContain('api.deepseek.com');
    });
  });

  describe('validateOllamaConnection', () => {
    it('should return valid when Ollama is running', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ status: 'ok' }),
      });

      const result = await validateOllamaConnection('http://localhost:11434');

      expect(result.valid).toBe(true);
    });

    it('should return invalid when Ollama is not running', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Connection refused'));

      const result = await validateOllamaConnection('http://localhost:11434');

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Cannot connect');
    });

    it('should return invalid for custom URL that is not running', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Failed'));

      const result = await validateOllamaConnection('http://custom-host:11434');

      expect(result.valid).toBe(false);
    });

    it('should handle malformed URL gracefully', async () => {
      const result = await validateOllamaConnection('not-a-valid-url');

      expect(result.valid).toBe(false);
    });

    it('should use default URL if not provided', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({}),
      });

      await validateOllamaConnection('');

      const callArgs = global.fetch as any;
      expect(callArgs.mock.calls[0][0]).toContain('localhost:11434');
    });

    it('should verify API endpoint existence', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({}),
      });
      global.fetch = fetchMock;

      await validateOllamaConnection('http://localhost:11434');

      const endpoint = fetchMock.mock.calls[0][0];
      expect(endpoint).toContain('/api/tags');
    });
  });

  describe('getOllamaModels', () => {
    it('should return list of models', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          models: [
            { name: 'deepseek-r1:7b' },
            { name: 'neural-chat:7b' },
            { name: 'tinyllama:latest' },
          ],
        }),
      });

      const models = await getOllamaModels('http://localhost:11434');

      expect(Array.isArray(models)).toBe(true);
      expect(models.length).toBe(3);
      expect(models).toContain('deepseek-r1:7b');
    });

    it('should return empty array when no models', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ models: [] }),
      });

      const models = await getOllamaModels('http://localhost:11434');

      expect(models).toEqual([]);
    });

    it('should return empty array on error', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Failed'));

      const models = await getOllamaModels('http://localhost:11434');

      expect(models).toEqual([]);
    });

    it('should extract model names correctly', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          models: [
            { name: 'model:tag1' },
            { name: 'model:tag2' },
            { name: 'other-model' },
          ],
        }),
      });

      const models = await getOllamaModels('http://localhost:11434');

      expect(models).toEqual(['model:tag1', 'model:tag2', 'other-model']);
    });

    it('should handle response without models property', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({}),
      });

      const models = await getOllamaModels('http://localhost:11434');

      expect(Array.isArray(models)).toBe(true);
    });

    it('should use correct API endpoint', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ models: [] }),
      });
      global.fetch = fetchMock;

      await getOllamaModels('http://custom:11434');

      const endpoint = fetchMock.mock.calls[0][0];
      expect(endpoint).toBe('http://custom:11434/api/tags');
    });
  });

  describe('error handling', () => {
    it('should provide meaningful error messages', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('ECONNREFUSED'));

      const result = await validateOllamaConnection('http://localhost:11434');

      expect(result.error).toBeDefined();
      expect(typeof result.error).toBe('string');
      expect(result.error.length).toBeGreaterThan(0);
    });

    it('should not throw exceptions', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Any error'));

      expect(async () => {
        await validateGeminiKey('key');
        await validateDeepseekKey('key');
        await validateOllamaConnection('http://localhost:11434');
      }).not.toThrow();
    });
  });

  describe('edge cases', () => {
    it('should handle very long URLs', async () => {
      const longUrl = 'http://localhost:11434' + '/a'.repeat(1000);

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ models: [] }),
      });

      const models = await getOllamaModels(longUrl);

      expect(Array.isArray(models)).toBe(true);
    });

    it('should handle timeout scenarios', async () => {
      global.fetch = vi.fn().mockImplementation(
        () =>
          new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Timeout')), 100);
          })
      );

      const result = await validateOllamaConnection('http://localhost:11434');

      expect(result.valid).toBe(false);
    });

    it('should handle different HTTP error codes', async () => {
      const codes = [400, 401, 403, 404, 500, 502, 503];

      for (const code of codes) {
        global.fetch = vi.fn().mockResolvedValue({
          ok: false,
          status: code,
        });

        const result = await validateGeminiKey('test');

        expect(result.valid).toBe(false);
      }
    });
  });
});
