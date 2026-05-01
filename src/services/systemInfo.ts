// System information detection for Ollama setup

export type GPUType = 'none' | 'nvidia' | 'amd' | 'intel-arc' | 'apple-metal' | 'unknown';
export type MacChipType = 'M1' | 'M1 Pro' | 'M1 Max' | 'M2' | 'M2 Pro' | 'M2 Max' | 'M3' | 'M3 Pro' | 'M3 Max' | 'M4' | 'M4 Pro' | 'M4 Max' | 'Intel' | 'Unknown';

export interface ModelRecommendation {
  model: string;
  speedEstimate: string; // e.g., "~2-3s/response"
  speedCategory: 'fast' | 'medium' | 'slow';
  ramNeededGB: number;
  reason: string;
  driverWarning?: string; // e.g., "Requires CUDA 11.8+"
}

interface SystemInfo {
  os: 'Mac' | 'Windows' | 'Linux' | 'Unknown';
  ramGB?: number;
  gpuType?: GPUType;
  chipType?: string; // User-selected or detected chip type
  canRunOllama: boolean;
  ollamaRunning?: boolean;
  reason?: string;
  suggestedModel: string;
  modelRecommendations?: ModelRecommendation[];
}

// ============================================================================
// localStorage Helpers for Hardware Persistence
// ============================================================================

export const loadUserHardwareSelection = (): {
  ramGB?: number;
  gpuType?: GPUType;
  chipType?: MacChipType;
} => {
  try {
    const savedRAM = localStorage.getItem('ollama:userRAM');
    const savedGPU = localStorage.getItem('ollama:userGPU');
    const savedChip = localStorage.getItem('ollama:userChip');
    return {
      ramGB: savedRAM ? parseInt(savedRAM) : undefined,
      gpuType: (savedGPU as GPUType) || undefined,
      chipType: (savedChip as MacChipType) || undefined,
    };
  } catch {
    return {};
  }
};

export const saveUserHardwareSelection = (ramGB: number, gpuType: GPUType, chipType?: MacChipType): void => {
  try {
    localStorage.setItem('ollama:userRAM', String(ramGB));
    localStorage.setItem('ollama:userGPU', gpuType);
    if (chipType) {
      localStorage.setItem('ollama:userChip', chipType);
    }
  } catch {
    // Silently fail if localStorage not available
  }
};

// ============================================================================
// GPU-Aware Model Recommendations
// ============================================================================

export const getModelRecommendations = (
  ramGB: number,
  gpuType: GPUType,
  macChipType?: MacChipType
): ModelRecommendation[] => {
  const recommendations: ModelRecommendation[] = [];

  // Helper to determine if M-series chip is Pro/Max
  const isHighEndMac = macChipType?.includes('Pro') || macChipType?.includes('Max');

  // Normalize RAM into tiers: <4GB, 4-7GB, 8-15GB, 16-31GB, 32GB+
  const getRamTier = (ram: number) => {
    if (ram < 4) return 'minimal';
    if (ram < 8) return 'low';
    if (ram < 16) return 'medium';
    if (ram < 32) return 'high';
    return 'extreme';
  };

  const ramTier = getRamTier(ramGB);

  if (gpuType === 'nvidia' || gpuType === 'amd' || gpuType === 'intel-arc') {
    // GPU users (NVIDIA, AMD, Intel Arc) get faster models
    const driverWarning = gpuType === 'nvidia'
      ? 'Requires CUDA 11.8+ and compatible GPU driver'
      : gpuType === 'amd'
      ? 'Requires ROCm 5.2+ and compatible GPU driver'
      : 'Requires Intel GPU driver';

    if (ramTier === 'extreme' || ramTier === 'high') {
      // 16GB+ with GPU
      recommendations.push({
        model: 'neural-chat:7b-v3.1-q5_K_M',
        speedEstimate: '~2-3s/response',
        speedCategory: 'fast',
        ramNeededGB: 12,
        reason: 'Best balance of quality and speed with GPU acceleration',
        driverWarning,
      });
      recommendations.push({
        model: 'mistral:7b-v3.1-q5_K_M',
        speedEstimate: '~2-3s/response',
        speedCategory: 'fast',
        ramNeededGB: 12,
        reason: 'Excellent reasoning with GPU acceleration',
        driverWarning,
      });
      recommendations.push({
        model: 'llama2:13b-q4_K_M',
        speedEstimate: '~4-5s/response',
        speedCategory: 'medium',
        ramNeededGB: 16,
        reason: 'Most capable model, slower but more powerful',
        driverWarning,
      });
    } else if (ramTier === 'medium') {
      // 8-15GB with GPU
      recommendations.push({
        model: 'neural-chat:7b-v3.1-q5_K_M',
        speedEstimate: '~2-3s/response',
        speedCategory: 'fast',
        ramNeededGB: 8,
        reason: 'Recommended for balanced performance with GPU',
        driverWarning,
      });
      recommendations.push({
        model: 'mistral:7b-v3.1-q4_K_M',
        speedEstimate: '~2-3s/response',
        speedCategory: 'fast',
        ramNeededGB: 8,
        reason: 'Good reasoning with GPU acceleration',
        driverWarning,
      });
      recommendations.push({
        model: 'neural-chat:3.5b-v2-q4_K_M',
        speedEstimate: '~1-2s/response',
        speedCategory: 'fast',
        ramNeededGB: 4,
        reason: 'Faster, lightweight option',
        driverWarning,
      });
    } else if (ramTier === 'low') {
      // 4-7GB with GPU
      recommendations.push({
        model: 'neural-chat:3.5b-v2-q4_K_M',
        speedEstimate: '~1-2s/response',
        speedCategory: 'fast',
        ramNeededGB: 4,
        reason: 'Best option for 4-7GB VRAM with GPU acceleration',
        driverWarning,
      });
      recommendations.push({
        model: 'tinyllama:latest',
        speedEstimate: '~1s/response',
        speedCategory: 'fast',
        ramNeededGB: 2,
        reason: 'Fastest option if you need maximum speed',
        driverWarning,
      });
    } else {
      // <4GB with GPU
      recommendations.push({
        model: 'tinyllama:latest',
        speedEstimate: '~1s/response',
        speedCategory: 'fast',
        ramNeededGB: 2,
        reason: 'Only practical option for <4GB VRAM',
        driverWarning,
      });
    }
  } else if (gpuType === 'apple-metal') {
    // Apple Metal support - faster than CPU but different model availability
    if (ramTier === 'extreme' || ramTier === 'high') {
      // 16GB+ with Metal
      const baseNote = isHighEndMac ? ' (M3 Pro/Max excellent performance)' : '';
      recommendations.push({
        model: 'neural-chat:7b-v3.1-q5_K_M',
        speedEstimate: isHighEndMac ? '~1-2s/response' : '~2-3s/response',
        speedCategory: 'fast',
        ramNeededGB: 12,
        reason: `Excellent performance with Apple Metal acceleration${baseNote}`,
      });
      recommendations.push({
        model: 'mistral:7b-v3.1-q5_K_M',
        speedEstimate: isHighEndMac ? '~1-2s/response' : '~2-3s/response',
        speedCategory: 'fast',
        ramNeededGB: 12,
        reason: 'Strong reasoning with Apple Metal',
      });
      recommendations.push({
        model: 'llama2:13b-q4_K_M',
        speedEstimate: isHighEndMac ? '~3-5s/response' : '~5-10s/response',
        speedCategory: 'medium',
        ramNeededGB: 16,
        reason: 'Most capable, runs well on Metal',
      });
    } else if (ramTier === 'medium') {
      // 8-15GB with Metal
      recommendations.push({
        model: 'neural-chat:7b-v3.1-q5_K_M',
        speedEstimate: '~2-3s/response',
        speedCategory: 'fast',
        ramNeededGB: 8,
        reason: 'Works well with 8-15GB + Metal acceleration',
      });
      recommendations.push({
        model: 'mistral:7b-v3.1-q4_K_M',
        speedEstimate: '~2-3s/response',
        speedCategory: 'fast',
        ramNeededGB: 8,
        reason: 'Good option with Apple Metal',
      });
      recommendations.push({
        model: 'neural-chat:3.5b-v2-q4_K_M',
        speedEstimate: '~1-2s/response',
        speedCategory: 'fast',
        ramNeededGB: 4,
        reason: 'Faster, lightweight option',
      });
    } else if (ramTier === 'low') {
      // 4-7GB with Metal
      recommendations.push({
        model: 'neural-chat:3.5b-v2-q4_K_M',
        speedEstimate: '~1-2s/response',
        speedCategory: 'fast',
        ramNeededGB: 4,
        reason: 'Best for 4-7GB with Apple Metal acceleration',
      });
      recommendations.push({
        model: 'tinyllama:latest',
        speedEstimate: '~1s/response',
        speedCategory: 'fast',
        ramNeededGB: 2,
        reason: 'Fastest lightweight option',
      });
    } else {
      // <4GB with Metal
      recommendations.push({
        model: 'tinyllama:latest',
        speedEstimate: '~1s/response',
        speedCategory: 'fast',
        ramNeededGB: 2,
        reason: 'Only practical option for <4GB',
      });
    }
  } else {
    // CPU-only (no GPU acceleration) - recommend small, fast models
    if (ramTier === 'extreme' || ramTier === 'high') {
      // 16GB+ CPU only
      recommendations.push({
        model: 'neural-chat:7b-v3.1-q4_K_M',
        speedEstimate: '~60-90s/response',
        speedCategory: 'slow',
        ramNeededGB: 8,
        reason: 'CPU-only: Very slow but capable. Consider adding a GPU for better experience.',
      });
      recommendations.push({
        model: 'neural-chat:3.5b-v2-q4_K_M',
        speedEstimate: '~25-35s/response',
        speedCategory: 'slow',
        ramNeededGB: 4,
        reason: 'Slower on CPU, but more responsive than 7B',
      });
      recommendations.push({
        model: 'tinyllama:latest',
        speedEstimate: '~1-2s/response',
        speedCategory: 'fast',
        ramNeededGB: 2,
        reason: 'Fast and lightweight - recommended for CPU',
      });
    } else if (ramTier === 'medium' || ramTier === 'low') {
      // 4-15GB CPU only
      recommendations.push({
        model: 'neural-chat:3.5b-v2-q4_K_M',
        speedEstimate: '~25-35s/response',
        speedCategory: 'slow',
        ramNeededGB: 4,
        reason: 'CPU inference is slow, but best quality option',
      });
      recommendations.push({
        model: 'tinyllama:latest',
        speedEstimate: '~1-2s/response',
        speedCategory: 'fast',
        ramNeededGB: 2,
        reason: 'Fast option - recommended for CPU without GPU',
      });
    } else {
      // <4GB CPU only
      recommendations.push({
        model: 'tinyllama:latest',
        speedEstimate: '~1-2s/response',
        speedCategory: 'fast',
        ramNeededGB: 2,
        reason: 'Only practical option for CPU with limited RAM',
      });
    }
  }

  return recommendations;
};

export const getSystemInfo = async (): Promise<SystemInfo> => {
  try {
    // Detect OS from user agent
    const userAgent = navigator.userAgent.toLowerCase();
    let os: 'Mac' | 'Windows' | 'Linux' | 'Unknown' = 'Unknown';
    let chipType: string | undefined;

    if (userAgent.includes('mac')) {
      os = 'Mac';
      // Try to detect Apple Silicon vs Intel
      // Check for specific indicators of Apple Silicon
      if (userAgent.includes('arm64') ||
          userAgent.includes('aarch64') ||
          (userAgent.includes('mac') && userAgent.includes('silicon'))) {
        chipType = 'Apple Silicon (M1/M2/M3/M4)';
      } else if (userAgent.includes('intel')) {
        chipType = 'Intel';
      } else {
        // For modern Macs, if ARM is detected via other means, likely Apple Silicon
        chipType = 'Unknown Mac Processor';
      }
    } else if (userAgent.includes('win')) {
      os = 'Windows';
    } else if (userAgent.includes('linux')) {
      os = 'Linux';
    }

    // Check if Ollama is running (try to reach localhost:11434)
    let ollamaRunning = false;
    try {
      const response = await fetch('http://localhost:11434/api/tags', {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(3000), // 3 second timeout
      });
      ollamaRunning = response.ok;
    } catch {
      ollamaRunning = false;
    }

    // Determine if system can run Ollama (only based on OS)
    const canRunOllama = os !== 'Unknown';
    const reason = !canRunOllama
      ? 'Your operating system is not supported for this guide.'
      : undefined;

    return {
      os,
      chipType,
      canRunOllama,
      ollamaRunning,
      reason,
      suggestedModel: 'neural-chat' // Default suggestion until user provides hardware info
    };
  } catch {
    return {
      os: 'Unknown',
      canRunOllama: false,
      reason: 'Could not detect system information',
      suggestedModel: 'tinyllama'
    };
  }
};

export const getInstallInstructions = (os: string, recommendedModel: string = 'neural-chat'): string => {
  const instructions: Record<string, string> = {
    'Mac': `1. Download Ollama from https://ollama.ai
2. Open the installer and follow the setup wizard
3. Open Terminal and run: ollama serve
4. Keep Terminal running - Ollama will listen on http://localhost:11434
5. In a new Terminal window, run: ollama pull ${recommendedModel}`,

    'Windows': `1. Download Ollama from https://ollama.ai
2. Run the installer (OllamaSetup.exe)
3. Open PowerShell or Command Prompt
4. Run: ollama serve
5. Keep the window open - Ollama will listen on http://localhost:11434
6. In a new PowerShell/CMD window, run: ollama pull ${recommendedModel}`,

    'Linux': `1. Open Terminal
2. Run: curl https://ollama.ai/install.sh | sh
3. Start Ollama: ollama serve
4. Keep Terminal running - Ollama will listen on http://localhost:11434
5. In a new Terminal, run: ollama pull ${recommendedModel}`,

    'Unknown': `1. Visit https://ollama.ai for installation instructions
2. Follow your operating system's specific guide
3. Run: ollama serve
4. Keep the server running
5. Pull a model: ollama pull ${recommendedModel}`
  };

  return instructions[os] || instructions['Unknown'];
};
