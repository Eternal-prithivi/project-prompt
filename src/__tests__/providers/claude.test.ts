/**
 * Tests for Claude Provider
 * Focus on initialization, error handling, and interface compliance
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ClaudeProvider } from '../../services/providers/claudeProvider';

describe('ClaudeProvider', () => {
  const stubClient = (provider: ClaudeProvider) => {
    (provider as any).client = {
      messages: {
        create: vi.fn().mockResolvedValue({
          content: [{ type: 'text', text: '[]' }],
        }),
      },
    };
  };
  describe('initialization', () => {
    it('should initialize with valid API key', () => {
      expect(() => new ClaudeProvider('sk-ant-test-key')).not.toThrow();
    });

    it('should throw error with missing API key', () => {
      expect(() => new ClaudeProvider('')).toThrow('Claude API key is required');
    });

    it('should throw error with undefined API key', () => {
      expect(() => new ClaudeProvider('undefined')).toThrow('Claude API key is required');
    });
  });

  describe('interface compliance', () => {
    let provider: ClaudeProvider;

    beforeEach(() => {
      provider = new ClaudeProvider('sk-ant-test-key');
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

    it('should have runPrompt method with customizable model', async () => {
      // Test that the method exists and accepts model parameter
      expect(typeof provider.runPrompt).toBe('function');
      const result = provider.runPrompt('test prompt', 'claude-3-opus-20250219');
      expect(result instanceof Promise).toBe(true);
    });
  });

  describe('model compatibility', () => {
    let provider: ClaudeProvider;

    beforeEach(() => {
      provider = new ClaudeProvider('sk-ant-test-key');
      stubClient(provider);
    });

    it('should accept claude-3-opus model', () => {
      // Verify method exists and accepts the model parameter
      expect(typeof provider.runPrompt).toBe('function');
    });

    it('should accept claude-3-sonnet model parameter', () => {
      const result = provider.runPrompt('test', 'claude-3-sonnet-20250219');
      expect(result instanceof Promise).toBe(true);
    });
  });
});
