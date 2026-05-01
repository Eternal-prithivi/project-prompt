import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { OllamaSetupModal } from '../../components/OllamaSetupModal';
import * as systemInfo from '../../services/systemInfo';

vi.mock('../../services/systemInfo', () => ({
  getSystemInfo: vi.fn(),
  getInstallInstructions: vi.fn(),
  getModelRecommendations: vi.fn(),
  loadUserHardwareSelection: vi.fn(),
  saveUserHardwareSelection: vi.fn(),
}));

describe('OllamaSetupModal', () => {
  const onClose = vi.fn();
  const onComplete = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(systemInfo.getInstallInstructions).mockReturnValue('Install Ollama\nRun ollama pull deepseek-r1:7b');
    vi.mocked(systemInfo.getModelRecommendations).mockReturnValue([
      {
        model: 'deepseek-r1:7b',
        speedEstimate: '~2-3s/response',
        speedCategory: 'fast',
        ramNeededGB: 8,
        reason: 'Balanced default',
      },
    ]);
  });

  it('does not render when closed', () => {
    render(<OllamaSetupModal isOpen={false} onClose={onClose} onComplete={onComplete} />);

    expect(screen.queryByText(/Ollama Setup/i)).not.toBeInTheDocument();
  });

  it('loads saved hardware selections and opens directly on the install step', async () => {
    vi.mocked(systemInfo.getSystemInfo).mockResolvedValue({
      os: 'Mac',
      canRunOllama: true,
      ollamaRunning: false,
      suggestedModel: 'deepseek-r1:7b',
    } as any);
    vi.mocked(systemInfo.loadUserHardwareSelection).mockReturnValue({
      ramGB: 16,
      gpuType: 'apple-metal',
      chipType: 'M3 Pro',
    });

    render(<OllamaSetupModal isOpen={true} onClose={onClose} onComplete={onComplete} />);

    expect(await screen.findByText(/Installation Steps/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /copy "ollama serve" command/i }));

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('ollama serve');
  });

  it('collects hardware input when no prior selection exists and persists it before installation', async () => {
    vi.mocked(systemInfo.getSystemInfo).mockResolvedValue({
      os: 'Mac',
      canRunOllama: true,
      ollamaRunning: false,
      suggestedModel: 'deepseek-r1:7b',
    } as any);
    vi.mocked(systemInfo.loadUserHardwareSelection).mockReturnValue({});

    render(<OllamaSetupModal isOpen={true} onClose={onClose} onComplete={onComplete} />);

    expect(await screen.findByText(/RAM Memory/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Apple Metal/i }));
    fireEvent.click(screen.getByRole('button', { name: /M3 Pro/i }));
    fireEvent.click(screen.getByRole('button', { name: /Proceed to Installation/i }));

    expect(systemInfo.saveUserHardwareSelection).toHaveBeenCalled();
    expect(await screen.findByText(/Installation Steps/i)).toBeInTheDocument();
  });

  it('shows the incompatible-system branch with cloud alternatives', async () => {
    vi.mocked(systemInfo.getSystemInfo).mockResolvedValue({
      os: 'Unknown',
      canRunOllama: false,
      reason: 'Unsupported platform',
      suggestedModel: 'deepseek-r1:7b',
    } as any);
    vi.mocked(systemInfo.loadUserHardwareSelection).mockReturnValue({});

    render(<OllamaSetupModal isOpen={true} onClose={onClose} onComplete={onComplete} />);

    expect(await screen.findByText(/System Not Compatible/i)).toBeInTheDocument();
    expect(screen.getByText(/Google Gemini/i)).toBeInTheDocument();
    expect(screen.getByText(/Claude/i)).toBeInTheDocument();
  });

  it('progresses from waiting to detected and calls onComplete when Ollama comes online', async () => {
    vi.mocked(systemInfo.getSystemInfo)
      .mockResolvedValueOnce({
        os: 'Mac',
        canRunOllama: true,
        ollamaRunning: false,
        suggestedModel: 'deepseek-r1:7b',
      } as any)
      .mockResolvedValueOnce({
        os: 'Mac',
        canRunOllama: true,
        ollamaRunning: true,
        suggestedModel: 'deepseek-r1:7b',
      } as any);
    vi.mocked(systemInfo.loadUserHardwareSelection).mockReturnValue({
      ramGB: 16,
      gpuType: 'apple-metal',
      chipType: 'M3 Pro',
    });

    render(<OllamaSetupModal isOpen={true} onClose={onClose} onComplete={onComplete} />);

    fireEvent.click(await screen.findByRole('button', { name: /done! start ollama/i }));
    fireEvent.click(screen.getByRole('button', { name: /check if ollama is running/i }));

    expect(await screen.findByText(/Ollama Detected!/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /next: choose models/i }));

    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('exposes an accessible close control', async () => {
    vi.mocked(systemInfo.getSystemInfo).mockResolvedValue({
      os: 'Mac',
      canRunOllama: true,
      ollamaRunning: false,
      suggestedModel: 'deepseek-r1:7b',
    } as any);
    vi.mocked(systemInfo.loadUserHardwareSelection).mockReturnValue({});

    render(<OllamaSetupModal isOpen={true} onClose={onClose} onComplete={onComplete} />);

    fireEvent.click(await screen.findByRole('button', { name: /close ollama setup/i }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
