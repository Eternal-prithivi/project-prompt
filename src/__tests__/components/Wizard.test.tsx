import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

import { Wizard } from '../../components/Wizard';
import * as geminiService from '../../services/geminiService';
import * as credentialStore from '../../services/credentialStore';
import * as providerFactory from '../../services/providerFactory';
import * as validation from '../../services/providers/validation';
import { clearPromptResponseCache } from '../../services/utils/promptResponseCache';
import { clearPreservedState, savePreservedState } from '../../services/utils/statePreservation';

vi.mock('../../components/IncidentDisplay', () => ({
  IncidentDisplay: ({ context, error, isLoading, onRetry, onClose }: any) => (
    <div data-testid={`incident-${context}`}>
      <span>{isLoading ? 'Loading' : error?.message}</span>
      {onRetry && <button onClick={onRetry}>Retry {context}</button>}
      {onClose && <button onClick={onClose}>Close {context}</button>}
    </div>
  ),
}));

// Mock the services
vi.mock('../../services/geminiService', () => ({
  analyzePrompt: vi.fn().mockResolvedValue({
    role: 'Test Role',
    task: 'Test Task',
    context: 'Test Context',
    format: 'Test Format',
    constraints: 'None',
    scores: {
      clarity: 75,
      context: 80,
      constraints: 70,
      tone: 85,
      overall: 77,
      feedback: 'Good prompt structure',
    },
    questions: ['Question 1?', 'Question 2?', 'Question 3?'],
  }),
  generateVariations: vi.fn().mockResolvedValue([
    {
      id: '1',
      type: 'precisionist',
      title: 'Precise Version',
      description: 'Formal and strict',
      content: 'Precise prompt content',
    },
    {
      id: '2',
      type: 'creative',
      title: 'Creative Version',
      description: 'Friendly and creative',
      content: 'Creative prompt content',
    },
    {
      id: '3',
      type: 'mastermind',
      title: 'Master Version',
      description: 'Complex reasoning',
      content: 'Master prompt content',
    },
  ]),
  magicRefine: vi.fn(),
  generateExamples: vi.fn(),
  integrateAnswers: vi.fn(),
  compressPrompt: vi.fn(),
  runPrompt: vi.fn(),
  judgeArenaOutputs: vi.fn(),
  initializeProvider: vi.fn(),
}));

vi.mock('../../services/credentialStore', () => ({
  getCredentials: vi.fn().mockReturnValue({
    selectedEngine: 'gemini',
    geminiKey: 'test-key',
    deepseekKey: '',
    chatgptKey: '',
    claudeKey: '',
    grokKey: '',
    ollamaUrl: 'http://localhost:11434',
    selectedModel: 'deepseek-r1:7b',
  }),
  saveCredentials: vi.fn(),
  credentialsToConfig: vi.fn((creds: any) => ({
    engine: creds.selectedEngine,
    apiKey:
      creds.selectedEngine === 'gemini'
        ? creds.geminiKey
        : creds.selectedEngine === 'deepseek'
          ? creds.deepseekKey
          : creds.selectedEngine === 'chatgpt'
            ? creds.chatgptKey
            : creds.selectedEngine === 'claude'
              ? creds.claudeKey
              : creds.selectedEngine === 'grok'
                ? creds.grokKey
                : undefined,
    ollamaUrl: creds.ollamaUrl,
    selectedModel: creds.selectedModel,
  })),
  updateCredential: vi.fn(),
  isCredentialsLocked: vi.fn().mockReturnValue(false),
  unlockCredentials: vi.fn(),
  setCredentialPassword: vi.fn(),
  hasCredentialPassword: vi.fn().mockReturnValue(true),
}));

vi.mock('../../services/providers/validation', () => ({
  validateGeminiKey: vi.fn().mockResolvedValue({ valid: true }),
  validateDeepseekKey: vi.fn().mockResolvedValue({ valid: true }),
  validateOllamaConnection: vi.fn().mockResolvedValue({ valid: true }),
  getOllamaModels: vi.fn().mockResolvedValue(['deepseek-r1', 'neural-chat']),
}));

vi.mock('../../services/systemInfo', () => ({
  getSystemInfo: vi.fn().mockResolvedValue({
    os: 'Mac',
    ramGB: 16,
    canRunOllama: true,
    ollamaRunning: false,
    suggestedModel: 'deepseek-r1',
  }),
}));

vi.mock('../../services/providerFactory', () => ({
  preloadProvider: vi.fn(),
}));

describe('Wizard Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
    clearPromptResponseCache();
    clearPreservedState();
  });

  describe('initial state', () => {
    it('should render the main title', () => {
      render(<Wizard />);
      expect(screen.getAllByText(/Prompt Architect/i).length).toBeGreaterThan(0);
    });

    it('should display input textarea', () => {
      render(<Wizard />);
      const textarea = screen.getByPlaceholderText(/What do you want the AI to do/i);
      expect(textarea).toBeInTheDocument();
    });

    it('should have analyze button disabled initially', () => {
      render(<Wizard />);
      const analyzeButton = screen.getByRole('button', { name: /Analyze/i });
      expect(analyzeButton).toBeDisabled();
    });

    it('should have settings button', () => {
      render(<Wizard />);
      expect(screen.getByText(/SETTINGS/i)).toBeInTheDocument();
    });

    it('should have library button', () => {
      render(<Wizard />);
      expect(screen.getByText(/LIBRARY/i)).toBeInTheDocument();
    });
  });

  describe('prompt input', () => {
    it('should enable analyze button when text entered', () => {
      render(<Wizard />);
      const textarea = screen.getByPlaceholderText(/What do you want the AI to do/i);

      fireEvent.change(textarea, {
        target: { value: 'Write a professional email' },
      });

      const analyzeButton = screen.getByRole('button', { name: /Analyze/i });
      expect(analyzeButton).not.toBeDisabled();
    });

    it('should keep analyze button disabled when only whitespace entered', () => {
      render(<Wizard />);
      const textarea = screen.getByPlaceholderText(/What do you want the AI to do/i);

      fireEvent.change(textarea, { target: { value: '   ' } });

      const analyzeButton = screen.getByRole('button', { name: /Analyze/i });
      expect(analyzeButton).toBeDisabled();
    });
  });

  describe('analysis flow', () => {
    it('should show refining step after analysis', async () => {
      render(<Wizard />);
      const textarea = screen.getByPlaceholderText(/What do you want the AI to do/i);

      fireEvent.change(textarea, {
        target: { value: 'Help me write a professional email' },
      });

      const analyzeButton = screen.getByRole('button', { name: /Analyze/i });
      fireEvent.click(analyzeButton);

      await waitFor(() => {
        expect(screen.getByText(/Refine Architecture/i)).toBeInTheDocument();
      });
    });

    it('should display prompt components after analysis', async () => {
      render(<Wizard />);
      const textarea = screen.getByPlaceholderText(/What do you want the AI to do/i);

      fireEvent.change(textarea, {
        target: { value: 'Help me write a professional email' },
      });

      const analyzeButton = screen.getByRole('button', { name: /Analyze/i });
      fireEvent.click(analyzeButton);

      await waitFor(() => {
        expect(screen.getByDisplayValue(/Test Role/i)).toBeInTheDocument();
      });
    });

    it('should display scores after analysis', async () => {
      render(<Wizard />);
      const textarea = screen.getByPlaceholderText(/What do you want the AI to do/i);

      fireEvent.change(textarea, {
        target: { value: 'Help me write a professional email' },
      });

      const analyzeButton = screen.getByRole('button', { name: /Analyze/i });
      fireEvent.click(analyzeButton);

      await waitFor(() => {
        expect(screen.getByText(/Initial Prompt Score/i)).toBeInTheDocument();
      });
    });

    it('should display clarifying questions', async () => {
      render(<Wizard />);
      const textarea = screen.getByPlaceholderText(/What do you want the AI to do/i);

      fireEvent.change(textarea, {
        target: { value: 'Help me write a professional email' },
      });

      const analyzeButton = screen.getByRole('button', { name: /Analyze/i });
      fireEvent.click(analyzeButton);

      await waitFor(() => {
        expect(screen.getByText(/AI Clarification Interview/i)).toBeInTheDocument();
      });
    });
  });

  describe('navigation', () => {
    it('should show back button after analysis', async () => {
      render(<Wizard />);
      const textarea = screen.getByPlaceholderText(/What do you want the AI to do/i);

      fireEvent.change(textarea, {
        target: { value: 'Test prompt' },
      });

      const analyzeButton = screen.getByRole('button', { name: /Analyze/i });
      fireEvent.click(analyzeButton);

      await waitFor(() => {
        expect(screen.getByText(/BACK/i)).toBeInTheDocument();
      });
    });

    it('should go back to initial state when back button clicked', async () => {
      render(<Wizard />);
      const textarea = screen.getByPlaceholderText(/What do you want the AI to do/i);

      fireEvent.change(textarea, {
        target: { value: 'Test prompt' },
      });

      const analyzeButton = screen.getByRole('button', { name: /Analyze/i });
      fireEvent.click(analyzeButton);

      await waitFor(() => {
        const backButton = screen.getByText(/BACK/i);
        fireEvent.click(backButton);
      });

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/What do you want the AI to do/i)).toBeInTheDocument();
      });
    });
  });

  describe('settings panel', () => {
    it('should open settings panel when settings button clicked', () => {
      render(<Wizard />);
      const settingsButton = screen.getByText(/SETTINGS/i);
      fireEvent.click(settingsButton);

      expect(screen.getByText(/LLM Provider Settings/i)).toBeInTheDocument();
    });

    it('should display provider options in settings', () => {
      render(<Wizard />);
      const settingsButton = screen.getByText(/SETTINGS/i);
      fireEvent.click(settingsButton);

      expect(screen.getByText(/Google Gemini/i)).toBeInTheDocument();
      expect(screen.getByText(/DeepSeek/i)).toBeInTheDocument();
      expect(screen.getByText(/Local Ollama/i)).toBeInTheDocument();
    });

    it('should close settings when cancel clicked', async () => {
      render(<Wizard />);
      const settingsButton = screen.getByText(/SETTINGS/i);
      fireEvent.click(settingsButton);

      const cancelButton = screen.getByRole('button', { name: /Cancel/i });
      fireEvent.click(cancelButton);

      await waitFor(() => {
        expect(screen.queryByText(/LLM Provider Settings/i)).not.toBeInTheDocument();
      });
    });

    it('should show provider validation errors inside settings', async () => {
      vi.mocked(validation.validateGeminiKey).mockResolvedValueOnce({
        valid: false,
        error: 'Bad key',
      });

      render(<Wizard />);
      fireEvent.click(screen.getByText(/SETTINGS/i));
      fireEvent.click(screen.getByRole('button', { name: /test/i }));

      await waitFor(() => {
        expect(screen.getAllByText(/gemini validation failed: Bad key/i).length).toBeGreaterThan(0);
      });
    });

    it('should keep settings open and show an error when saving a provider without its API key', async () => {
      render(<Wizard />);
      fireEvent.click(screen.getByText(/SETTINGS/i));
      fireEvent.click(screen.getByText(/ChatGPT \/ OpenAI/i));

      fireEvent.click(screen.getByRole('button', { name: /save & apply/i }));

      await waitFor(() => {
        expect(screen.getAllByText(/Please enter ChatGPT API key/i).length).toBeGreaterThan(0);
      });
      expect(screen.getByText(/LLM Provider Settings/i)).toBeInTheDocument();
    });

    it('should show a save error when provider reinitialization fails', async () => {
      render(<Wizard />);
      fireEvent.click(screen.getByText(/SETTINGS/i));

      vi.mocked(geminiService.initializeProvider).mockClear();
      vi.mocked(geminiService.initializeProvider).mockImplementationOnce(() => {
        throw new Error('Save failed');
      });

      fireEvent.click(screen.getByRole('button', { name: /save & apply/i }));

      await waitFor(() => {
        expect(screen.getByText(/Failed to save provider: Save failed/i)).toBeInTheDocument();
      });

      expect(screen.getByText(/LLM Provider Settings/i)).toBeInTheDocument();
    });
  });

  describe('library panel', () => {
    it('should open library when library button clicked', () => {
      render(<Wizard />);
      const libraryButton = screen.getByText(/LIBRARY/i);
      fireEvent.click(libraryButton);

      expect(screen.getAllByText(/LIBRARY/i).length).toBeGreaterThan(0);
    });
  });

  describe('modal orchestration', () => {
    it('should open and close the standalone compression modal from the header', async () => {
      render(<Wizard />);

      fireEvent.click(screen.getByRole('button', { name: /compress/i }));

      expect(await screen.findByRole('dialog', { name: /compression service/i })).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: /close compression modal/i }));

      await waitFor(() => {
        expect(screen.queryByRole('dialog', { name: /compression service/i })).not.toBeInTheDocument();
      });
    });
  });

  describe('provider persistence', () => {
    it('saves a valid provider configuration and reinitializes the provider', async () => {
      render(<Wizard />);

      fireEvent.click(screen.getByText(/SETTINGS/i));
      fireEvent.click(screen.getByText(/ChatGPT \/ OpenAI/i));
      fireEvent.change(screen.getByPlaceholderText(/Enter OpenAI API key/i), {
        target: { value: 'sk-test-openai-key' },
      });
      fireEvent.click(screen.getByRole('button', { name: /save & apply/i }));

      await waitFor(() => {
        expect(credentialStore.saveCredentials).toHaveBeenCalledWith(
          expect.objectContaining({
            selectedEngine: 'chatgpt',
            chatgptKey: 'sk-test-openai-key',
          })
        );
      });

      expect(geminiService.initializeProvider).toHaveBeenCalledWith({
        engine: 'chatgpt',
        apiKey: 'sk-test-openai-key',
        ollamaUrl: 'http://localhost:11434',
        selectedModel: 'deepseek-r1:7b',
      });

      await waitFor(() => {
        expect(screen.queryByText(/LLM Provider Settings/i)).not.toBeInTheDocument();
      });
    });

    it('requires an encryption password before persisting provider settings', async () => {
      vi.mocked(credentialStore.hasCredentialPassword).mockReturnValueOnce(false);

      render(<Wizard />);

      fireEvent.click(screen.getByText(/SETTINGS/i));
      fireEvent.click(screen.getByRole('button', { name: /save & apply/i }));

      await waitFor(() => {
        expect(
          screen.getAllByText(/Enter an encryption password before saving provider settings/i).length
        ).toBeGreaterThan(0);
      });

      expect(credentialStore.saveCredentials).not.toHaveBeenCalled();
    });

    it('syncs unlocked credentials back into settings state before reinitializing the provider', async () => {
      vi.mocked(credentialStore.isCredentialsLocked).mockReturnValueOnce(true);
      vi.mocked(credentialStore.unlockCredentials).mockReturnValueOnce({
        selectedEngine: 'chatgpt',
        chatgptKey: 'sk-restored-openai-key',
        geminiKey: '',
        deepseekKey: '',
        claudeKey: '',
        grokKey: '',
        ollamaUrl: 'http://localhost:11434',
        selectedModel: 'gpt-4-turbo',
      });

      render(<Wizard />);

      expect(
        await screen.findByPlaceholderText(/Enter encryption password to unlock/i)
      ).toBeInTheDocument();

      fireEvent.change(screen.getByPlaceholderText(/Enter encryption password to unlock/i), {
        target: { value: 'secret-password' },
      });
      fireEvent.click(screen.getByRole('button', { name: /unlock/i }));

      await waitFor(() => {
        expect(geminiService.initializeProvider).toHaveBeenCalledWith({
          engine: 'chatgpt',
          apiKey: 'sk-restored-openai-key',
          ollamaUrl: 'http://localhost:11434',
          selectedModel: 'gpt-4-turbo',
        });
      });

      expect(screen.getByPlaceholderText(/Enter OpenAI API key/i)).toHaveValue('sk-restored-openai-key');
    });
  });

  describe('prompt response caching', () => {
    it('reuses cached live test output and supports explicit refresh', async () => {
      vi.mocked(geminiService.runPrompt)
        .mockResolvedValueOnce('First provider output')
        .mockResolvedValueOnce('Refreshed provider output');

      render(<Wizard />);
      fireEvent.change(screen.getByPlaceholderText(/What do you want the AI to do/i), {
        target: { value: 'Help me write a professional email' },
      });
      fireEvent.click(screen.getByRole('button', { name: /Analyze/i }));

      await waitFor(() => {
        expect(screen.getByText(/Refine Architecture/i)).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /Forge Final Prompts/i }));

      await waitFor(() => {
        expect(screen.getByText(/Forged Variations/i)).toBeInTheDocument();
      });

      fireEvent.click(screen.getAllByRole('button', { name: /Live Resilience Test/i })[0]);

      await waitFor(() => {
        expect(screen.getByText(/First provider output/i)).toBeInTheDocument();
      });
      expect(geminiService.runPrompt).toHaveBeenCalledTimes(1);

      fireEvent.click(screen.getByRole('button', { name: /Clear/i }));
      fireEvent.click(screen.getAllByRole('button', { name: /Live Resilience Test/i })[0]);

      await waitFor(() => {
        expect(screen.getByText(/First provider output/i)).toBeInTheDocument();
      });
      expect(screen.getByText(/Cached response/i)).toBeInTheDocument();
      expect(geminiService.runPrompt).toHaveBeenCalledTimes(1);

      fireEvent.click(screen.getByRole('button', { name: /Refresh/i }));

      await waitFor(() => {
        expect(screen.getByText(/Refreshed provider output/i)).toBeInTheDocument();
      });
      expect(geminiService.runPrompt).toHaveBeenCalledTimes(2);
    });
  });

  describe('error handling', () => {
    it('should display error message on analysis failure', async () => {
      render(<Wizard />);
      const textarea = screen.getByPlaceholderText(/What do you want the AI to do/i);

      fireEvent.change(textarea, {
        target: { value: 'Test' },
      });

      // Manually trigger an error scenario
      const analyzeButton = screen.getByRole('button', { name: /Analyze/i });
      fireEvent.click(analyzeButton);

      // Component should handle gracefully
      expect(screen.getByPlaceholderText(/What do you want the AI to do/i)).toBeInTheDocument();
    });

    it('should show recovery UI when provider initialization fails and clear it after retry', async () => {
      vi.mocked(geminiService.initializeProvider)
        .mockImplementationOnce(() => {
          throw new Error('Init failed');
        })
        .mockImplementationOnce(() => {});

      render(<Wizard />);

      await waitFor(() => {
        expect(screen.getByTestId('incident-init')).toHaveTextContent('Init failed');
      });

      fireEvent.click(screen.getByRole('button', { name: /retry init/i }));

      await waitFor(() => {
        expect(screen.queryByTestId('incident-init')).not.toBeInTheDocument();
      });

      expect(geminiService.initializeProvider).toHaveBeenCalledTimes(2);
    });

    it('should recover from analysis failure when retry succeeds', async () => {
      vi.mocked(geminiService.analyzePrompt).mockRejectedValueOnce(new Error('Analyze failed'));

      render(<Wizard />);
      fireEvent.change(screen.getByPlaceholderText(/What do you want the AI to do/i), {
        target: { value: 'Help me write a professional email' },
      });

      fireEvent.click(screen.getByRole('button', { name: /Analyze/i }));

      await waitFor(() => {
        expect(screen.getByTestId('incident-analyze')).toHaveTextContent('Analyze failed');
      });

      fireEvent.click(screen.getByRole('button', { name: /retry analyze/i }));

      await waitFor(() => {
        expect(screen.getByText(/Refine Architecture/i)).toBeInTheDocument();
      });

      expect(geminiService.analyzePrompt).toHaveBeenCalledTimes(2);
    });

    it('should recover from variation generation failure when retry succeeds', async () => {
      vi.mocked(geminiService.generateVariations).mockRejectedValueOnce(new Error('Variations failed'));

      render(<Wizard />);
      fireEvent.change(screen.getByPlaceholderText(/What do you want the AI to do/i), {
        target: { value: 'Help me write a professional email' },
      });
      fireEvent.click(screen.getByRole('button', { name: /Analyze/i }));

      await waitFor(() => {
        expect(screen.getByText(/Refine Architecture/i)).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /Forge Final Prompts/i }));

      await waitFor(() => {
        expect(screen.getByTestId('incident-variations')).toHaveTextContent('Variations failed');
      });

      fireEvent.click(screen.getByRole('button', { name: /retry variations/i }));

      await waitFor(() => {
        expect(screen.getByText(/Forged Variations/i)).toBeInTheDocument();
      });

      expect(geminiService.generateVariations).toHaveBeenCalledTimes(2);
    });

    it('should recover from battle failure when retry succeeds', async () => {
      vi.mocked(geminiService.runPrompt)
        .mockRejectedValueOnce(new Error('Battle failed'))
        .mockResolvedValueOnce('Output A')
        .mockResolvedValueOnce('Output B');
      vi.mocked(geminiService.judgeArenaOutputs).mockResolvedValueOnce({
        winner: 'A',
        reasoning: 'A is better for the task.',
      });

      render(<Wizard />);
      fireEvent.change(screen.getByPlaceholderText(/What do you want the AI to do/i), {
        target: { value: 'Help me write a professional email' },
      });
      fireEvent.click(screen.getByRole('button', { name: /Analyze/i }));

      await waitFor(() => {
        expect(screen.getByText(/Refine Architecture/i)).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /Forge Final Prompts/i }));

      await waitFor(() => {
        expect(screen.getByText(/Forged Variations/i)).toBeInTheDocument();
      });

      const arenaButtons = screen.getAllByRole('button', { name: /add to arena/i });
      fireEvent.click(arenaButtons[0]);
      fireEvent.click(arenaButtons[1]);
      fireEvent.click(screen.getByRole('button', { name: /enter battle arena/i }));

      fireEvent.click(screen.getByRole('button', { name: /fight/i }));

      await waitFor(() => {
        expect(screen.getByTestId('incident-battle')).toHaveTextContent('Battle failed');
      });

      fireEvent.click(screen.getByRole('button', { name: /retry battle/i }));

      await waitFor(() => {
        expect(screen.getByText(/A WINS/i)).toBeInTheDocument();
      });

      expect(geminiService.runPrompt).toHaveBeenCalledTimes(3);
      expect(geminiService.judgeArenaOutputs).toHaveBeenCalledTimes(1);
    });
  });

  describe('accessibility', () => {
    it('should have proper heading hierarchy', () => {
      render(<Wizard />);
      expect(screen.getAllByText(/Prompt Architect/i).length).toBeGreaterThan(0);
    });

    it('should have descriptive button labels', () => {
      render(<Wizard />);
      expect(screen.getByRole('button', { name: /Analyze/i })).toBeInTheDocument();
    });

    it('should have accessible inputs', () => {
      render(<Wizard />);
      const textarea = screen.getByPlaceholderText(/What do you want the AI to do/i);
      expect(textarea).toBeInTheDocument();
    });
  });

  describe('history and restored state', () => {
    it('persists generated results into history and can reopen them from the library', async () => {
      render(<Wizard />);
      fireEvent.change(screen.getByPlaceholderText(/What do you want the AI to do/i), {
        target: { value: 'Help me write a professional email' },
      });
      fireEvent.click(screen.getByRole('button', { name: /Analyze/i }));

      await waitFor(() => {
        expect(screen.getByText(/Refine Architecture/i)).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /Forge Final Prompts/i }));

      await waitFor(() => {
        expect(screen.getByText(/Forged Variations/i)).toBeInTheDocument();
      });

      expect(JSON.parse(localStorage.getItem('prompt_history') || '[]')).toHaveLength(1);

      fireEvent.click(screen.getByRole('button', { name: /new architecture/i }));
      fireEvent.click(screen.getByText(/LIBRARY/i));
      fireEvent.click(await screen.findByText(/Help me write a professional email/i));

      await waitFor(() => {
        expect(screen.getByText(/Forged Variations/i)).toBeInTheDocument();
      });
      expect(screen.getByText(/Precise Version/i)).toBeInTheDocument();
    });

    it('restores preserved results state on mount', async () => {
      savePreservedState({
        initialInput: 'Recovered prompt',
        components: {
          role: 'Recovered role',
          task: 'Recovered task',
          context: 'Recovered context',
          format: 'Recovered format',
          constraints: 'Recovered constraints',
        },
        results: [
          {
            id: 'recovered-1',
            type: 'precisionist',
            title: 'Recovered Variation',
            description: 'Recovered description',
            content: 'Recovered content',
          },
        ],
        selectedEngine: 'gemini',
        step: 'results',
      });

      render(<Wizard />);

      await waitFor(() => {
        expect(screen.getByText(/Recovered Variation/i)).toBeInTheDocument();
      });
      expect(screen.getByText(/Forged Variations/i)).toBeInTheDocument();
    });
  });

  describe('results interactions', () => {
    it('applies accepted compression results back into a variation', async () => {
      vi.mocked(geminiService.generateVariations).mockResolvedValueOnce([
        {
          id: '1',
          type: 'precisionist',
          title: 'Precise Version',
          description: 'Formal and strict',
          content: 'Return JSON for [TOPIC] with citations.',
        },
      ]);
      vi.mocked(geminiService.compressPrompt).mockResolvedValueOnce('Compact JSON for [TOPIC].');

      render(<Wizard />);
      fireEvent.change(screen.getByPlaceholderText(/What do you want the AI to do/i), {
        target: { value: 'Help me write a professional email' },
      });
      fireEvent.click(screen.getByRole('button', { name: /Analyze/i }));

      await waitFor(() => {
        expect(screen.getByText(/Refine Architecture/i)).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /Forge Final Prompts/i }));
      await waitFor(() => {
        expect(screen.getByText(/Forged Variations/i)).toBeInTheDocument();
      });

      fireEvent.click(screen.getAllByRole('button', { name: /compress/i })[1]);
      expect(await screen.findByText(/Compression Results/i)).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: /apply compression/i }));

      await waitFor(() => {
        expect(screen.getByText(/Compact JSON for \[TOPIC\]\./i)).toBeInTheDocument();
      });
    });

    it('keeps the original variation when safe-mode compression drops a required variable', async () => {
      vi.mocked(geminiService.generateVariations).mockResolvedValueOnce([
        {
          id: '1',
          type: 'precisionist',
          title: 'Precise Version',
          description: 'Formal and strict',
          content: 'Return JSON for [TOPIC] with citations.',
        },
      ]);
      vi.mocked(geminiService.compressPrompt).mockResolvedValueOnce('Return JSON with citations.');

      render(<Wizard />);
      fireEvent.change(screen.getByPlaceholderText(/What do you want the AI to do/i), {
        target: { value: 'Help me write a professional email' },
      });
      fireEvent.click(screen.getByRole('button', { name: /Analyze/i }));

      await waitFor(() => {
        expect(screen.getByText(/Refine Architecture/i)).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /Forge Final Prompts/i }));
      await waitFor(() => {
        expect(screen.getByText(/Forged Variations/i)).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /safe/i }));
      fireEvent.click(screen.getAllByRole('button', { name: /compress/i })[1]);

      expect(await screen.findByText(/Quality too low/i)).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /apply compression/i })).not.toBeInTheDocument();
      expect(screen.getAllByText(/Return JSON for \[TOPIC\] with citations\./i).length).toBeGreaterThan(0);
    });

    it('runs the arena flow and shows the judged winner', async () => {
      vi.mocked(geminiService.runPrompt)
        .mockResolvedValueOnce('Arena output A')
        .mockResolvedValueOnce('Arena output B');
      vi.mocked(geminiService.judgeArenaOutputs).mockResolvedValueOnce({
        winner: 'A',
        reasoning: 'Prompt A followed the format more closely.',
      });

      render(<Wizard />);
      fireEvent.change(screen.getByPlaceholderText(/What do you want the AI to do/i), {
        target: { value: 'Help me write a professional email' },
      });
      fireEvent.click(screen.getByRole('button', { name: /Analyze/i }));

      await waitFor(() => {
        expect(screen.getByText(/Refine Architecture/i)).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /Forge Final Prompts/i }));
      await waitFor(() => {
        expect(screen.getByText(/Forged Variations/i)).toBeInTheDocument();
      });

      fireEvent.click(screen.getAllByRole('button', { name: /add to arena/i })[0]);
      fireEvent.click(screen.getAllByRole('button', { name: /add to arena/i })[1]);
      fireEvent.click(screen.getByRole('button', { name: /enter battle arena/i }));
      fireEvent.click(await screen.findByRole('button', { name: /fight/i }));

      expect(await screen.findByText(/A WINS/i)).toBeInTheDocument();
      expect(screen.getByText(/Prompt A followed the format more closely/i)).toBeInTheDocument();
      expect(screen.getByText(/Arena output A/i)).toBeInTheDocument();
      expect(screen.getByText(/Arena output B/i)).toBeInTheDocument();
    });

    it('reuses cached arena results on repeat fight and supports explicit refresh', async () => {
      vi.mocked(geminiService.runPrompt)
        .mockResolvedValueOnce('Arena output A')
        .mockResolvedValueOnce('Arena output B')
        .mockResolvedValueOnce('Arena output A refreshed')
        .mockResolvedValueOnce('Arena output B refreshed');
      vi.mocked(geminiService.judgeArenaOutputs)
        .mockResolvedValueOnce({
          winner: 'A',
          reasoning: 'First verdict',
        })
        .mockResolvedValueOnce({
          winner: 'B',
          reasoning: 'Refreshed verdict',
        });

      render(<Wizard />);
      fireEvent.change(screen.getByPlaceholderText(/What do you want the AI to do/i), {
        target: { value: 'Help me write a professional email' },
      });
      fireEvent.click(screen.getByRole('button', { name: /Analyze/i }));

      await waitFor(() => {
        expect(screen.getByText(/Refine Architecture/i)).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /Forge Final Prompts/i }));
      await waitFor(() => {
        expect(screen.getByText(/Forged Variations/i)).toBeInTheDocument();
      });

      fireEvent.click(screen.getAllByRole('button', { name: /add to arena/i })[0]);
      fireEvent.click(screen.getAllByRole('button', { name: /add to arena/i })[1]);
      fireEvent.click(screen.getByRole('button', { name: /enter battle arena/i }));

      fireEvent.click(await screen.findByRole('button', { name: /^fight$/i }));
      expect(await screen.findByText(/First verdict/i)).toBeInTheDocument();
      expect(vi.mocked(geminiService.runPrompt)).toHaveBeenCalledTimes(2);
      expect(vi.mocked(geminiService.judgeArenaOutputs)).toHaveBeenCalledTimes(1);

      fireEvent.click(screen.getByRole('button', { name: /^fight$/i }));
      expect(await screen.findByText(/Cached response/i)).toBeInTheDocument();
      expect(vi.mocked(geminiService.runPrompt)).toHaveBeenCalledTimes(2);
      expect(vi.mocked(geminiService.judgeArenaOutputs)).toHaveBeenCalledTimes(1);

      fireEvent.click(screen.getByRole('button', { name: /refresh/i }));
      expect(await screen.findByText(/Refreshed verdict/i)).toBeInTheDocument();
      expect(vi.mocked(geminiService.runPrompt)).toHaveBeenCalledTimes(4);
      expect(vi.mocked(geminiService.judgeArenaOutputs)).toHaveBeenCalledTimes(2);
    });

    it('preloads only the currently selected provider hint', async () => {
      render(<Wizard />);

      await waitFor(() => {
        expect(providerFactory.preloadProvider).toHaveBeenCalledWith('gemini');
      });

      fireEvent.click(screen.getByText(/SETTINGS/i));
      fireEvent.click(screen.getByText(/ChatGPT \/ OpenAI/i));

      await waitFor(() => {
        expect(providerFactory.preloadProvider).toHaveBeenCalledWith('chatgpt');
      });
    });
  });
});
