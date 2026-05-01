import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { IncidentDisplay } from '../../components/IncidentDisplay';
import { ProviderErrorType } from '../../services/utils/errorClassification';
import { logger } from '../../services/utils/logger';

describe('IncidentDisplay', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    logger.clear();
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    logger.clear();
  });

  it('renders nothing when idle', () => {
    const { container } = render(<IncidentDisplay />);

    expect(container).toBeEmptyDOMElement();
  });

  it('shows provider-specific loading state', () => {
    render(<IncidentDisplay provider="gemini" isLoading />);

    expect(screen.getByText('Calling gemini...')).toBeInTheDocument();
  });

  it('shows generic loading state without provider', () => {
    render(<IncidentDisplay isLoading />);

    expect(screen.getByText('Processing...')).toBeInTheDocument();
  });

  it('classifies provided auth errors into user-facing incidents', () => {
    render(<IncidentDisplay provider="gemini" error={new Error('Invalid API key')} />);

    expect(screen.getByText(/Gemini auth failed/i)).toBeInTheDocument();
  });

  it('calls onClose from the error display', () => {
    const onClose = vi.fn();

    render(
      <IncidentDisplay
        provider="gemini"
        error={new Error('Invalid API key')}
        onClose={onClose}
      />
    );

    fireEvent.click(screen.getByRole('button'));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('renders recovery actions when requested and retries through them', () => {
    const onRetry = vi.fn();
    const onOpenSettings = vi.fn();

    render(
      <IncidentDisplay
        provider="gemini"
        error={new Error('Invalid API key')}
        showActions
        onRetry={onRetry}
        onOpenSettings={onOpenSettings}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /retry/i }));
    fireEvent.click(screen.getByRole('button', { name: /check api key/i }));

    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(onOpenSettings).toHaveBeenCalledTimes(1);
  });

  it('does not render recovery actions unless retry is available', () => {
    render(
      <IncidentDisplay
        provider="gemini"
        error={new Error('Invalid API key')}
        showActions
      />
    );

    expect(screen.queryByRole('button', { name: /retry/i })).not.toBeInTheDocument();
  });

  it('polls provider logs and shows retry backoff state for retryable errors', () => {
    vi.useFakeTimers();

    logger.error('provider_error', {
      provider: 'gemini',
      data: {
        errorType: ProviderErrorType.RATE_LIMIT,
        isRetryable: true,
      },
    });

    render(<IncidentDisplay provider="gemini" />);

    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(screen.getByText(/gemini backing off, will retry/i)).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(screen.queryByText(/gemini backing off, will retry/i)).not.toBeInTheDocument();
  });
});
