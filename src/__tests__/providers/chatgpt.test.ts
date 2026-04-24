/**
 * Tests for ChatGPT Provider
 * Focus on initialization, error handling, and interface compliance
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ChatGPTProvider } from '../../services/providers/chatgptProvider';

describe('ChatGPTProvider', () => {
  describe('initialization', () => {
    it('should initialize with valid API key', () => {
      expect(() => new ChatGPTProvider('sk-test-key')).not.toThrow();
    });

    it('should throw error with missing API key', () => {
      expect(() => new ChatGPTProvider('')).toThrow('ChatGPT API key is required');
    });

    it('should throw error with undefined API key', () => {
      expect(() => new ChatGPTProvider('undefined')).toThrow('ChatGPT API key is required');
    });
  });

  describe('interface compliance', () => {
    let provider: ChatGPTProvider;

    beforeEach(() => {
      provider = new ChatGPTProvider('sk-test-key');
      (provider as any).client = {
        chat: {
          completions: {
            create: vi.fn().mockResolvedValue({
              choices: [{ message: { content: '[]' } }],
            }),
          },
        },
      };
    });

    it('should implement all required ILLMProvider methods', () => {
      expect(typeof provider.analyzePrompt).toBe('function');
      expect(typeof provider.generateVariations).toBe('function');
      expect(typeof provider.magicRefine).toBe('function');
      expect(typeof provider.integrateAnswers).toBe('function');
      expect(typeof provider.generateExamples).toBe('function');
      expect(typeof provider.runPrompt).toBe('function');
      expect(typeof provider.compressPrompt).toBe('function');
      expect(typeof provider.judgeArenaOutputs).toBe('function');
    });

    it('should have analyzePrompt as async method', async () => {
      const result = provider.analyzePrompt('test');
      expect(result instanceof Promise).toBe(true);
    });

    it('should have generateVariations as async method', async () => {
      const result = provider.generateVariations({
        role: 'test',
        task: 'test',
        context: 'test',
        format: 'test',
        constraints: 'test',
      });
      expect(result instanceof Promise).toBe(true);
    });
  });
});
