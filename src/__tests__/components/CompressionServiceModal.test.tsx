import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CompressionServiceModal } from '../../components/CompressionServiceModal';
import * as llmService from '../../services/llmService';
import * as compressionCache from '../../services/utils/compressionCache';
import * as keywordExtractor from '../../services/utils/keywordExtractor';
import * as ruleBasedCompression from '../../services/utils/ruleBasedCompression';

vi.mock('../../services/llmService', () => ({
  compressPrompt: vi.fn(),
}));

vi.mock('../../services/utils/compressionCache', async () => {
  const actual = await vi.importActual('../../services/utils/compressionCache');
  return {
    ...actual,
    cacheCompression: vi.fn(),
    getCachedCompression: vi.fn(),
  };
});

vi.mock('../../services/utils/keywordExtractor', async () => {
  const actual = await vi.importActual('../../services/utils/keywordExtractor');
  return {
    ...actual,
    validateKeywordPreservation: vi.fn(),
  };
});

vi.mock('../../services/utils/ruleBasedCompression', async () => {
  const actual = await vi.importActual('../../services/utils/ruleBasedCompression');
  return {
    ...actual,
    safeRuleBasedCompress: vi.fn(),
  };
});

describe('CompressionServiceModal', () => {
  const onClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(compressionCache.getCachedCompression).mockReturnValue(null);
    vi.mocked(keywordExtractor.validateKeywordPreservation).mockReturnValue({
      passed: true,
      quality: 94,
      analysis: 'Preserved 3/3 keywords',
    });
    vi.mocked(ruleBasedCompression.safeRuleBasedCompress).mockReturnValue({
      success: true,
      compressed: 'Fallback compressed prompt',
      quality: 88,
      message: 'Compressed 35% (estimate: 88% quality)',
    });
  });

  it('does not render when closed', () => {
    render(<CompressionServiceModal isOpen={false} onClose={onClose} />);

    expect(screen.queryByRole('dialog', { name: /compression service/i })).not.toBeInTheDocument();
  });

  it('starts with the primary action disabled until there is input', () => {
    render(<CompressionServiceModal isOpen={true} onClose={onClose} />);

    expect(screen.getByRole('button', { name: /compress now/i })).toBeDisabled();
  });

  it('uses cached compression results without calling the provider again', async () => {
    vi.mocked(compressionCache.getCachedCompression).mockReturnValue({
      compressed: 'Cached compressed prompt',
      mode: 'fast',
      quality: 90,
      timestamp: Date.now(),
    });

    render(<CompressionServiceModal isOpen={true} onClose={onClose} />);

    fireEvent.change(screen.getByPlaceholderText(/paste your prompt here/i), {
      target: { value: 'Original prompt text' },
    });
    fireEvent.click(screen.getByRole('button', { name: /compress now/i }));

    expect(await screen.findByText(/Cached compressed prompt/i)).toBeInTheDocument();
    expect(screen.getByText(/\$0\.00 \(cached\)/i)).toBeInTheDocument();
    expect(llmService.compressPrompt).not.toHaveBeenCalled();
  });

  it('rejects low-quality safe-mode compression and keeps the modal in input mode', async () => {
    vi.mocked(llmService.compressPrompt).mockResolvedValue('Compressed without topic');
    vi.mocked(keywordExtractor.validateKeywordPreservation).mockReturnValue({
      passed: false,
      quality: 60,
      analysis: 'Preserved 3/5 keywords (Lost: [TOPIC])',
    });

    render(<CompressionServiceModal isOpen={true} onClose={onClose} />);

    fireEvent.change(screen.getByPlaceholderText(/paste your prompt here/i), {
      target: { value: 'Write markdown for [TOPIC]' },
    });
    fireEvent.click(screen.getByRole('button', { name: /safe/i }));
    fireEvent.click(screen.getByRole('button', { name: /compress now/i }));

    expect(await screen.findByText(/Compression quality too low \(60%\)/i)).toBeInTheDocument();
    expect(screen.queryByText(/Tokens Saved/i)).not.toBeInTheDocument();
  });

  it('falls back to rule-based compression when the provider fails', async () => {
    vi.mocked(llmService.compressPrompt).mockRejectedValue(new Error('API unavailable'));

    render(<CompressionServiceModal isOpen={true} onClose={onClose} />);

    fireEvent.change(screen.getByPlaceholderText(/paste your prompt here/i), {
      target: { value: 'Please make sure to write markdown for [TOPIC]' },
    });
    fireEvent.click(screen.getByRole('button', { name: /compress now/i }));

    expect(await screen.findByText(/Using free fallback compression/i)).toBeInTheDocument();
    expect(screen.getByText(/Fallback compressed prompt/i)).toBeInTheDocument();
    expect(screen.getByText(/\$0\.00 \(free fallback\)/i)).toBeInTheDocument();
  });

  it('supports copy, reset, and close flows after a successful compression', async () => {
    vi.mocked(llmService.compressPrompt).mockResolvedValue('Compressed prompt result');

    render(<CompressionServiceModal isOpen={true} onClose={onClose} />);

    fireEvent.change(screen.getByPlaceholderText(/paste your prompt here/i), {
      target: { value: 'Original prompt result' },
    });
    fireEvent.click(screen.getByRole('button', { name: /compress now/i }));

    expect(await screen.findByText(/Compressed prompt result/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /copy compressed/i }));
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('Compressed prompt result');

    fireEvent.click(screen.getByRole('button', { name: /compress another/i }));
    expect(screen.getByPlaceholderText(/paste your prompt here/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /close compression modal/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
