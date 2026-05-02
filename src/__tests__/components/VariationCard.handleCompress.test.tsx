import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { VariationCard } from '../../components/Wizard';
import * as llmService from '../../services/llmService';
import * as compressionCache from '../../services/utils/compressionCache';

vi.mock('../../services/llmService', () => ({
  analyzePrompt: vi.fn(),
  generateVariations: vi.fn(),
  magicRefine: vi.fn(),
  generateExamples: vi.fn(),
  integrateAnswers: vi.fn(),
  compressPrompt: vi.fn(),
  runPrompt: vi.fn(),
  judgeArenaOutputs: vi.fn(),
  initializeProvider: vi.fn(),
}));

vi.mock('../../services/utils/compressionCache', async () => {
  const actual = await vi.importActual('../../services/utils/compressionCache');
  return {
    ...actual,
    cacheCompression: vi.fn(),
    getCachedCompression: vi.fn(),
  };
});

const baseProps = {
  result: {
    id: 'test-1',
    type: 'precisionist' as const,
    title: 'Compression Candidate',
    description: 'Prompt awaiting compression',
    content: 'Use [TOPIC] and return JSON with citations.',
  },
  onUpdateContent: vi.fn(),
  onToggleArena: vi.fn(),
  isSelectedForArena: false,
  isArenaFull: false,
  selectedEngine: 'gemini' as const,
};

describe('VariationCard handleCompress', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(compressionCache.getCachedCompression).mockReturnValue(null);
  });

  it('reuses cached compression results instead of calling the provider again', async () => {
    vi.mocked(compressionCache.getCachedCompression).mockReturnValue({
      compressed: 'Cached JSON with [TOPIC].',
      mode: 'fast',
      quality: 91,
      timestamp: Date.now(),
    });

    render(<VariationCard {...baseProps} />);

    fireEvent.click(screen.getByRole('button', { name: /compress/i }));

    expect(await screen.findByText(/Compression Results/i)).toBeInTheDocument();
    expect(screen.getByText(/Cached JSON with \[TOPIC\]\./i)).toBeInTheDocument();
    expect(llmService.compressPrompt).not.toHaveBeenCalled();
  });

  it('rejects safe-mode compressions that drop required variables', async () => {
    vi.mocked(llmService.compressPrompt).mockResolvedValue('Return JSON with citations.');

    render(<VariationCard {...baseProps} />);

    fireEvent.click(screen.getByRole('button', { name: /safe/i }));
    fireEvent.click(screen.getByRole('button', { name: /compress/i }));

    expect(await screen.findByText(/Quality too low/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /apply compression/i })).not.toBeInTheDocument();
  });
});
