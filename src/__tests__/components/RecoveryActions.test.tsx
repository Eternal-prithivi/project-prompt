import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { RecoveryActions } from '../../components/RecoveryActions';
import { ProviderErrorType } from '../../services/utils/errorClassification';

const baseProps = {
  error: new Error('Provider failed'),
  provider: 'gemini',
  context: 'test' as const,
  onRetry: vi.fn(),
};

describe('RecoveryActions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('always renders a retry action and calls onRetry', () => {
    const onRetry = vi.fn();

    render(
      <RecoveryActions
        {...baseProps}
        errorType={ProviderErrorType.UNKNOWN}
        onRetry={onRetry}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /retry/i }));

    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('offers model and provider switches for rate limits', () => {
    const onSwitchModel = vi.fn();
    const onSwitchProvider = vi.fn();

    render(
      <RecoveryActions
        {...baseProps}
        errorType={ProviderErrorType.RATE_LIMIT}
        availableModels={['gemini-flash']}
        availableProviders={['chatgpt']}
        onSwitchModel={onSwitchModel}
        onSwitchProvider={onSwitchProvider}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /try different model/i }));
    fireEvent.click(screen.getByRole('button', { name: /switch provider/i }));

    expect(onSwitchModel).toHaveBeenCalledWith('gemini-flash');
    expect(onSwitchProvider).toHaveBeenCalledWith('chatgpt');
  });

  it('opens settings for auth failures before switching providers', () => {
    const onOpenSettings = vi.fn();
    const onSwitchProvider = vi.fn();

    render(
      <RecoveryActions
        {...baseProps}
        errorType={ProviderErrorType.AUTH}
        availableProviders={['claude']}
        onOpenSettings={onOpenSettings}
        onSwitchProvider={onSwitchProvider}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /check api key/i }));
    fireEvent.click(screen.getByRole('button', { name: /switch provider/i }));

    expect(onOpenSettings).toHaveBeenCalledTimes(1);
    expect(onSwitchProvider).toHaveBeenCalledWith('claude');
  });

  it('uses the first available model as a faster timeout fallback', () => {
    const onSwitchModel = vi.fn();

    render(
      <RecoveryActions
        {...baseProps}
        errorType={ProviderErrorType.TIMEOUT}
        availableModels={['fast-model']}
        onSwitchModel={onSwitchModel}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /try faster model/i }));

    expect(onSwitchModel).toHaveBeenCalledWith('fast-model');
  });

  it('offers local recovery for network failures when local is available', () => {
    const onSwitchProvider = vi.fn();
    const onOpenSettings = vi.fn();

    render(
      <RecoveryActions
        {...baseProps}
        errorType={ProviderErrorType.NETWORK}
        availableProviders={['local']}
        onOpenSettings={onOpenSettings}
        onSwitchProvider={onSwitchProvider}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /check settings/i }));
    fireEvent.click(screen.getByRole('button', { name: /try local/i }));

    expect(onOpenSettings).toHaveBeenCalledTimes(1);
    expect(onSwitchProvider).toHaveBeenCalledWith('local');
  });

  it('offers help for provider errors when settings are available', () => {
    const onOpenSettings = vi.fn();

    render(
      <RecoveryActions
        {...baseProps}
        errorType={ProviderErrorType.PROVIDER_ERROR}
        onOpenSettings={onOpenSettings}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /help/i }));

    expect(onOpenSettings).toHaveBeenCalledTimes(1);
  });

  it('limits malformed request recovery to retry and settings checks', () => {
    const onOpenSettings = vi.fn();

    render(
      <RecoveryActions
        {...baseProps}
        errorType={ProviderErrorType.MALFORMED}
        availableProviders={['chatgpt']}
        onOpenSettings={onOpenSettings}
      />
    );

    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /check settings/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /switch provider/i })).not.toBeInTheDocument();
  });
});
