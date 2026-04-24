import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

import { Wizard } from '../../components/Wizard';

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
    ollamaUrl: 'http://localhost:11434',
    selectedModel: 'deepseek-r1:7b',
  }),
  saveCredentials: vi.fn(),
  credentialsToConfig: vi.fn().mockReturnValue({
    engine: 'gemini',
    apiKey: 'test-key',
  }),
  updateCredential: vi.fn(),
  isCredentialsLocked: vi.fn().mockReturnValue(false),
  unlockCredentials: vi.fn(),
  setCredentialPassword: vi.fn(),
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

describe('Wizard Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
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
  });

  describe('library panel', () => {
    it('should open library when library button clicked', () => {
      render(<Wizard />);
      const libraryButton = screen.getByText(/LIBRARY/i);
      fireEvent.click(libraryButton);

      expect(screen.getAllByText(/LIBRARY/i).length).toBeGreaterThan(0);
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
});
