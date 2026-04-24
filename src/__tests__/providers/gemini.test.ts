/**
 * Comprehensive tests for GeminiProvider
 * Test-driven approach: Full coverage of all methods and error scenarios
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GeminiProvider } from '../../services/providers/geminiProvider';
import { samplePromptComponents, sampleVariations, geminiMockResponse, mockErrorResponses } from '../mocks/fixtures';
import { mockFetch, mockFetchError } from '../mocks/providers.mock';

describe('GeminiProvider', () => {
  let provider: GeminiProvider;
  let mockGlobalFetch: any;

  beforeEach(() => {
    // Initialize provider with test key
    provider = new GeminiProvider('test-gemini-key');
    global.fetch = vi.fn();
    mockGlobalFetch = global.fetch as any;
    vi.clearAllMocks();

    // GeminiProvider uses the @google/genai SDK. For tests, we shim the SDK call to
    // use the existing fetch mocks so the test suite can remain deterministic.
    (provider as any).aiClient = {
      models: {
        generateContent: vi.fn(async () => {
          const res = await (global.fetch as any)('https://test.local/generate');
          if (typeof res?.json === 'function') {
            const data = await res.json();
            if (data && typeof data === 'object' && 'text' in data) {
              return { text: (data as any).text ?? '' };
            }
            if (typeof data === 'string') return { text: data };
            return { text: JSON.stringify(data) };
          }
          if (typeof res?.text === 'function') {
            const text = await res.text();
            return { text };
          }
          return { text: '' };
        }),
      },
    };
  });

  describe('initialization', () => {
    it('should initialize with valid API key', () => {
      expect(() => new GeminiProvider('valid-key')).not.toThrow();
    });

    it('should throw error with missing API key', () => {
      expect(() => new GeminiProvider('')).toThrow('Gemini API key is required');
    });

    it('should throw error with undefined API key', () => {
      expect(() => new GeminiProvider('undefined')).toThrow('Gemini API key is required');
    });
  });

  describe('analyzePrompt', () => {
    it('should analyze prompt and return components with scores', async () => {
      mockGlobalFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => geminiMockResponse.analyzePrompt,
      });

      const result = await provider.analyzePrompt('test prompt');

      expect(result).toHaveProperty('role');
      expect(result).toHaveProperty('task');
      expect(result).toHaveProperty('context');
      expect(result).toHaveProperty('format');
      expect(result).toHaveProperty('constraints');
      expect(result.scores).toBeDefined();
      expect(result.scores?.overall).toBeGreaterThanOrEqual(0);
      expect(result.scores?.overall).toBeLessThanOrEqual(100);
      expect(result.questions).toBeDefined();
      expect(Array.isArray(result.questions)).toBe(true);
    });

    it('should handle malformed JSON response', async () => {
      mockGlobalFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ text: 'invalid json' }),
      });

      // Should not throw, should return partial data
      await expect(provider.analyzePrompt('test')).resolves.toBeDefined();
    });

    it('should throw error on API failure', async () => {
      // With retry/backoff, the provider may retry multiple times.
      mockGlobalFetch.mockRejectedValue(new Error('Network error'));

      await expect(provider.analyzePrompt('test')).rejects.toThrow();
    });

    it('should include customPersona field as empty string', async () => {
      mockGlobalFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => geminiMockResponse.analyzePrompt,
      });

      const result = await provider.analyzePrompt('test');
      expect(result.customPersona).toBe('');
    });
  });

  describe('generateVariations', () => {
    it('should generate three prompt variations', async () => {
      mockGlobalFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => sampleVariations,
      });

      const result = await provider.generateVariations(samplePromptComponents);

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThanOrEqual(3);
    });

    it('should include precisionist, creative, and mastermind types', async () => {
      mockGlobalFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => sampleVariations,
      });

      const result = await provider.generateVariations(samplePromptComponents);
      const types = result.map((v) => v.type);

      expect(types).toContain('precisionist');
      expect(types).toContain('creative');
      expect(types).toContain('mastermind');
    });

    it('should include custom variation if customPersona provided', async () => {
      const componentsWithPersona = { ...samplePromptComponents, customPersona: 'Pirate' };
      mockGlobalFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [
          ...sampleVariations,
          { id: '3', type: 'custom', title: 'Pirate', description: 'As a pirate', content: 'arr...' },
        ],
      });

      const result = await provider.generateVariations(componentsWithPersona);
      const hasCustom = result.some((v) => v.type === 'custom');

      expect(hasCustom).toBe(true);
    });

    it('should have unique IDs for each variation', async () => {
      mockGlobalFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => sampleVariations,
      });

      const result = await provider.generateVariations(samplePromptComponents);
      const ids = result.map((v) => v.id);
      const uniqueIds = new Set(ids);

      expect(uniqueIds.size).toBe(ids.length);
    });

    it('should include variables in content formatted as [UPPERCASE]', async () => {
      const mockWithVariables = [
        {
          ...sampleVariations[0],
          content: 'Use this [TOPIC] with [TARGET_AUDIENCE] in mind',
        },
      ];
      mockGlobalFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockWithVariables,
      });

      const result = await provider.generateVariations(samplePromptComponents);

      expect(result[0].content).toMatch(/\[([A-Z_]+)\]/);
    });
  });

  describe('magicRefine', () => {
    it('should refine and enhance prompt components', async () => {
      const refinedComponents = {
        role: 'Senior Developer with DevOps expertise',
        task: 'Create and deploy a Kubernetes cluster configuration',
        context: 'For production cloud infrastructure',
        format: 'YAML with documentation',
        constraints: 'Must include security best practices and high availability',
      };

      mockGlobalFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => refinedComponents,
      });

      const result = await provider.magicRefine(samplePromptComponents);

      expect(result.role).toBeDefined();
      expect(result.task).toBeDefined();
      expect(result.context).toBeDefined();
      expect(result.format).toBeDefined();
      expect(result.constraints).toBeDefined();
    });

    it('should preserve customPersona if provided', async () => {
      const componentsWithPersona = { ...samplePromptComponents, customPersona: 'Sherlock Holmes' };
      mockGlobalFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => samplePromptComponents,
      });

      const result = await provider.magicRefine(componentsWithPersona);

      expect(result.customPersona).toBe('Sherlock Holmes');
    });

    it('should preserve scores if provided', async () => {
      mockGlobalFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => samplePromptComponents,
      });

      const result = await provider.magicRefine(samplePromptComponents);

      expect(result.scores).toEqual(samplePromptComponents.scores);
    });
  });

  describe('integrateAnswers', () => {
    it('should integrate user answers into components', async () => {
      const answers = [
        { q: 'What email standard?', a: 'RFC 5322 with practical modifications' },
        { q: 'Internationalization?', a: 'Yes, support IDN' },
        { q: 'Performance?', a: 'O(n) single pass' },
      ];

      const integratedComponents = {
        ...samplePromptComponents,
        context: 'Web application with international domain support, performance critical',
      };

      mockGlobalFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => integratedComponents,
      });

      const result = await provider.integrateAnswers(samplePromptComponents, answers);

      expect(result).toHaveProperty('role');
      expect(result).toHaveProperty('task');
      expect(result).toHaveProperty('context');
      expect(result).toHaveProperty('format');
      expect(result).toHaveProperty('constraints');
    });

    it('should handle empty answers array', async () => {
      mockGlobalFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => samplePromptComponents,
      });

      const result = await provider.integrateAnswers(samplePromptComponents, []);

      expect(result).toBeDefined();
    });
  });

  describe('generateExamples', () => {
    it('should generate markdown formatted examples', async () => {
      mockGlobalFetch.mockResolvedValueOnce({
        ok: true,
        text: async () =>
          '### Example 1\n**Input:** test input\n**Output:** expected output\n### Example 2\n**Input:** another input\n**Output:** another output',
      });

      const result = await provider.generateExamples(samplePromptComponents);

      expect(result).toContain('### Example');
      expect(result).toContain('**Input:**');
      expect(result).toContain('**Output:**');
    });

    it('should return empty string on failure', async () => {
      mockGlobalFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => null,
      });

      const result = await provider.generateExamples(samplePromptComponents);

      expect(result).toBe('');
    });
  });

  describe('runPrompt', () => {
    it('should run prompt with default model', async () => {
      mockGlobalFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ text: geminiMockResponse.runPrompt }),
      });

      const result = await provider.runPrompt('test prompt');

      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });

    it('should run prompt with specified model (flash)', async () => {
      mockGlobalFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ text: 'Flash response' }),
      });

      const result = await provider.runPrompt('test prompt', 'gemini-3-flash-preview');

      expect(result).toContain('Flash');
    });

    it('should run prompt with specified model (pro)', async () => {
      mockGlobalFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ text: 'Pro response' }),
      });

      const result = await provider.runPrompt('test prompt', 'gemini-3.1-pro-preview');

      expect(result).toContain('Pro');
    });

    it('should handle empty response', async () => {
      mockGlobalFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ text: null }),
      });

      const result = await provider.runPrompt('test');

      expect(result).toBe('');
    });
  });

  describe('compressPrompt', () => {
    it('should compress prompt text', async () => {
      const longPrompt = 'This is a very long prompt that should be compressed and shortened to use fewer tokens.';
      const compressedResponse = 'Short prompt.';

      mockGlobalFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ text: compressedResponse }),
      });

      const result = await provider.compressPrompt(longPrompt);

      expect(result.length).toBeLessThanOrEqual(longPrompt.length);
    });

    it('should maintain bracketed variables after compression', async () => {
      const promptWithVars = 'Analyze [TOPIC] for [TARGET_AUDIENCE]';
      mockGlobalFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ text: 'Analyze [TOPIC] for [TARGET_AUDIENCE]' }),
      });

      const result = await provider.compressPrompt(promptWithVars);

      expect(result).toContain('[TOPIC]');
      expect(result).toContain('[TARGET_AUDIENCE]');
    });

    it('should return original prompt on failure', async () => {
      const originalPrompt = 'test prompt';
      mockGlobalFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ text: null }),
      });

      const result = await provider.compressPrompt(originalPrompt);

      expect(result).toBe(originalPrompt);
    });
  });

  describe('judgeArenaOutputs', () => {
    it('should judge arena outputs and determine winner', async () => {
      mockGlobalFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ winner: 'A', reasoning: 'Prompt A was clearer' }),
      });

      const result = await provider.judgeArenaOutputs(
        samplePromptComponents,
        'Prompt A',
        'Output A',
        'Prompt B',
        'Output B'
      );

      expect(['A', 'B', 'TIE']).toContain(result.winner);
      expect(result.reasoning).toBeDefined();
    });

    it('should handle TIE verdict', async () => {
      mockGlobalFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ winner: 'TIE', reasoning: 'Both prompts equally good' }),
      });

      const result = await provider.judgeArenaOutputs(
        samplePromptComponents,
        'Prompt A',
        'Output A',
        'Prompt B',
        'Output B'
      );

      expect(result.winner).toBe('TIE');
    });

    it('should handle case-insensitive winner field', async () => {
      mockGlobalFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ winner: 'a', reasoning: 'test' }),
      });

      const result = await provider.judgeArenaOutputs(
        samplePromptComponents,
        'A',
        'Output A',
        'B',
        'Output B'
      );

      expect(result.winner).toBe('A');
    });

    it('should handle judge errors gracefully', async () => {
      mockGlobalFetch.mockRejectedValueOnce(new Error('API error'));

      const result = await provider.judgeArenaOutputs(
        samplePromptComponents,
        'Prompt A',
        'Output A',
        'Prompt B',
        'Output B'
      );

      expect(result.winner).toBe('TIE');
      expect(result.reasoning).toContain('Judge error');
    });

    it('should include customPersona in judgment if provided', async () => {
      const componentsWithPersona = { ...samplePromptComponents, customPersona: 'Expert Critic' };
      mockGlobalFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ winner: 'A', reasoning: 'test' }),
      });

      const result = await provider.judgeArenaOutputs(
        componentsWithPersona,
        'Prompt A',
        'Output A',
        'Prompt B',
        'Output B'
      );

      expect(result).toBeDefined();
    });
  });

  describe('error handling', () => {
    it('should handle network errors', async () => {
      // With retry/backoff, the provider may retry multiple times.
      mockGlobalFetch.mockRejectedValue(new Error('Network timeout'));

      await expect(provider.analyzePrompt('test')).rejects.toThrow('Network timeout');
    });

    it('should handle malformed JSON in responses', async () => {
      mockGlobalFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => 'not json',
      });

      // Should handle gracefully or throw appropriate error
      await expect(provider.analyzePrompt('test')).resolves.toBeDefined();
    });

    it('should handle 429 rate limit errors', async () => {
      // With retry/backoff, the provider may retry multiple times.
      mockGlobalFetch.mockRejectedValue(new Error('429: Too Many Requests'));

      await expect(provider.runPrompt('test')).rejects.toThrow();
    });

    it('should handle 403 authentication errors', async () => {
      mockGlobalFetch.mockRejectedValueOnce(new Error('403: Forbidden - Invalid API key'));

      await expect(provider.analyzePrompt('test')).rejects.toThrow();
    });
  });

  describe('edge cases', () => {
    it('should handle very long prompts', async () => {
      const longPrompt = 'test '.repeat(1000); // 5000 characters
      mockGlobalFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => samplePromptComponents,
      });

      const result = await provider.analyzePrompt(longPrompt);

      expect(result).toBeDefined();
    });

    it('should handle special characters in prompts', async () => {
      const specialPrompt = '测试 مرحبا العالم emoji: 🚀🎉 <script>alert("xss")</script>';
      mockGlobalFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => samplePromptComponents,
      });

      const result = await provider.analyzePrompt(specialPrompt);

      expect(result).toBeDefined();
    });

    it('should handle empty question array', async () => {
      const emptyQuestionsResponse = { ...samplePromptComponents, questions: [] };
      mockGlobalFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => emptyQuestionsResponse,
      });

      const result = await provider.analyzePrompt('test');

      expect(Array.isArray(result.questions)).toBe(true);
      expect(result.questions?.length).toBe(0);
    });
  });
});
