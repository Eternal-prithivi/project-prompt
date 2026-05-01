import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { VariationCard } from '../../components/Wizard';
import * as geminiService from '../../services/geminiService';
import * as compressionCache from '../../services/utils/compressionCache';

vi.mock('../../services/geminiService', () => ({
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

const baseResult = {
  id: 'test-1',
  type: 'precisionist' as const,
  title: 'Test Prompt',
  description: 'A structured test prompt',
  content: 'Return JSON for [TOPIC] in a friendly tone.',
};

const renderCard = () =>
  render(
    <VariationCard
      result={baseResult}
      onUpdateContent={vi.fn()}
      onToggleArena={vi.fn()}
      isSelectedForArena={false}
      isArenaFull={false}
      selectedEngine="gemini"
    />
  );

describe('VariationCard compression UI', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(compressionCache.getCachedCompression).mockReturnValue(null);
    vi.mocked(geminiService.compressPrompt).mockResolvedValue('Compact JSON for [TOPIC].');
  });

  it('renders fast mode by default and can switch into safe mode', () => {
    renderCard();

    expect(screen.getByRole('button', { name: /fast/i })).toHaveClass('bg-cyan-500/30');

    fireEvent.click(screen.getByRole('button', { name: /safe/i }));

    expect(screen.getByRole('button', { name: /safe/i })).toHaveClass('bg-emerald-500/30');
  });

  it('shows compression results and applies the compressed prompt back into the card', async () => {
    const onUpdateContent = vi.fn();

    render(
      <VariationCard
        result={baseResult}
        onUpdateContent={onUpdateContent}
        onToggleArena={vi.fn()}
        isSelectedForArena={false}
        isArenaFull={false}
        selectedEngine="gemini"
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /compress/i }));

    expect(await screen.findByText(/Compression Results/i)).toBeInTheDocument();
    expect(screen.getByText(/Compact JSON for \[TOPIC\]\./i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /apply compression/i }));

    expect(onUpdateContent).toHaveBeenCalledWith('test-1', 'Compact JSON for [TOPIC].');
  });

  it('opens the test output panel using cached responses without calling the provider again', async () => {
    vi.mocked(geminiService.runPrompt).mockResolvedValue('Provider output');
    renderCard();

    fireEvent.click(screen.getByRole('button', { name: /live resilience test/i }));

    await waitFor(() => {
      expect(screen.getByText(/Provider output/i)).toBeInTheDocument();
    });

    expect(geminiService.runPrompt).toHaveBeenCalledTimes(1);
  });
});
