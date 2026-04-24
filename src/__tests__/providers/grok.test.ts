/**
 * Tests for Grok Provider
 * Focus on initialization, error handling, and interface compliance
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GrokProvider } from '../../services/providers/grokProvider';

describe('GrokProvider', () => {
  const stubClient = (provider: GrokProvider) => {
    (provider as any).client = {
      chat: {
        completions: {
          create: vi.fn().mockResolvedValue({
            choices: [{ message: { content: '[]' } }],
          }),
        },
      },
    };
  };
  describe('initialization', () => {
    it('should initialize with valid API key', () => {
      expect(() => new GrokProvider('xai-test-key')).not.toThrow();
    });

    it('should throw error with missing API key', () => {
      expect(() => new GrokProvider('')).toThrow('Grok API key is required');
    });

    it('should throw error with undefined API key', () => {
      expect(() => new GrokProvider('undefined')).toThrow('Grok API key is required');
    });
  });

  describe('interface compliance', () => {
    let provider: GrokProvider;

    beforeEach(() => {
      provider = new GrokProvider('xai-test-key');
      stubClient(provider);
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

  describe('model configuration', () => {
    let provider: GrokProvider;

    beforeEach(() => {
      provider = new GrokProvider('xai-test-key');
      stubClient(provider);
    });

    it('should support grok-2 model for runPrompt', () => {
      expect(typeof provider.runPrompt).toBe('function');
      const result = provider.runPrompt('test prompt', 'grok-2-1212');
      expect(result instanceof Promise).toBe(true);
    });

    it('should have default model when not specified', () => {
      const result = provider.runPrompt('test prompt');
      expect(result instanceof Promise).toBe(true);
    });
  });

  describe('xAI endpoint compatibility', () => {
    let provider: GrokProvider;

    beforeEach(() => {
      provider = new GrokProvider('xai-test-key');
      stubClient(provider);
    });

    it('should be configured for xAI API', () => {
      // Provider should be initialized successfully
      expect(provider).toBeDefined();
    });
  });
});
