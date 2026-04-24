import { vi } from 'vitest';
import { ILLMProvider } from '../../services/types/ILLMProvider';
import { PromptComponents, PromptVariation } from '../../types';

export const createMockProvider = (overrides?: Partial<ILLMProvider>): ILLMProvider => ({
  analyzePrompt: vi.fn().mockResolvedValue({
    role: 'test-role',
    task: 'test-task',
    context: 'test-context',
    format: 'test-format',
    constraints: 'test-constraints',
  } as PromptComponents),

  generateVariations: vi.fn().mockResolvedValue([
    {
      id: '0',
      type: 'precisionist',
      title: 'Test Precisionist',
      description: 'Test description',
      content: 'test content',
    } as PromptVariation,
  ]),

  magicRefine: vi.fn().mockResolvedValue({
    role: 'refined-role',
    task: 'refined-task',
    context: 'refined-context',
    format: 'refined-format',
    constraints: 'refined-constraints',
  } as PromptComponents),

  integrateAnswers: vi.fn().mockResolvedValue({
    role: 'integrated-role',
    task: 'integrated-task',
    context: 'integrated-context',
    format: 'integrated-format',
    constraints: 'integrated-constraints',
  } as PromptComponents),

  generateExamples: vi.fn().mockResolvedValue('### Example 1\n**Input:** test\n**Output:** result'),

  runPrompt: vi.fn().mockResolvedValue('Test response from prompt'),

  compressPrompt: vi.fn().mockResolvedValue('Compressed prompt'),

  judgeArenaOutputs: vi.fn().mockResolvedValue({
    winner: 'A',
    reasoning: 'Test reasoning',
  }),

  ...overrides,
});

// Mock fetch for API testing
export const mockFetch = (status: number = 200, data: any = {}) => {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: vi.fn().mockResolvedValue(data),
    text: vi.fn().mockResolvedValue(JSON.stringify(data)),
  });
};

// Mock fetch error
export const mockFetchError = (error: Error) => {
  return vi.fn().mockRejectedValue(error);
};
