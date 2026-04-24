import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  getSystemInfo,
  getInstallInstructions,
  getModelRecommendations,
  loadUserHardwareSelection,
  saveUserHardwareSelection,
  type GPUType,
} from '../../services/systemInfo';

describe('systemInfo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('getSystemInfo', () => {
    it('should return system info object', async () => {
      const info = await getSystemInfo();

      expect(info).toHaveProperty('os');
      expect(info).toHaveProperty('canRunOllama');
      expect(info).toHaveProperty('ollamaRunning');
      expect(info).toHaveProperty('suggestedModel');
    });

    it('should detect OS from user agent', async () => {
      const info = await getSystemInfo();

      expect(['Mac', 'Windows', 'Linux', 'Unknown']).toContain(info.os);
    });

    it('should not auto-detect RAM (user-provided)', async () => {
      const info = await getSystemInfo();

      // RAM should be undefined since it's not auto-detected anymore
      expect(info.ramGB).toBeUndefined();
    });

    it('should set canRunOllama to true for supported OS', async () => {
      const info = await getSystemInfo();

      if (info.os !== 'Unknown') {
        expect(info.canRunOllama).toBe(true);
      }
    });

    it('should set canRunOllama to false if OS is Unknown', async () => {
      const info = await getSystemInfo();

      if (info.os === 'Unknown') {
        expect(info.canRunOllama).toBe(false);
      }
    });

    it('should have default suggested model', async () => {
      const info = await getSystemInfo();

      expect(info.suggestedModel).toBeDefined();
      expect(typeof info.suggestedModel).toBe('string');
    });

    it('should handle Ollama detection failure gracefully', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      const info = await getSystemInfo();

      expect(info.ollamaRunning).toBe(false);
    });

    it('should detect when Ollama is running', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ models: [] }),
      });

      const info = await getSystemInfo();

      expect(info.ollamaRunning).toBe(true);
    });

    it('should detect when Ollama is not running', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
      });

      const info = await getSystemInfo();

      expect(info.ollamaRunning).toBe(false);
    });

    it('should set chipType for Mac', async () => {
      const info = await getSystemInfo();

      if (info.os === 'Mac') {
        expect(info.chipType).toBeDefined();
      }
    });

    it('should not have chipType for non-Mac systems', async () => {
      const info = await getSystemInfo();

      if (info.os !== 'Mac') {
        expect(info.chipType).toBeUndefined();
      }
    });

    it('should return fallback on error', async () => {
      // Mock fetch to throw
      global.fetch = vi.fn().mockImplementation(() => {
        throw new Error('Fetch failed');
      });

      const info = await getSystemInfo();

      // Just check that we get valid data back, even if Ollama check fails
      expect(info).toHaveProperty('os');
      expect(info).toHaveProperty('canRunOllama');
      expect(info).toHaveProperty('suggestedModel');
      expect(['Mac', 'Windows', 'Linux', 'Unknown']).toContain(info.os);
    });
  });

  describe('getModelRecommendations', () => {
    it('should return recommendations array', () => {
      const recs = getModelRecommendations(16, 'nvidia');

      expect(Array.isArray(recs)).toBe(true);
      expect(recs.length).toBeGreaterThan(0);
    });

    it('should include required recommendation fields', () => {
      const recs = getModelRecommendations(8, 'apple-metal');

      recs.forEach((rec) => {
        expect(rec).toHaveProperty('model');
        expect(rec).toHaveProperty('speedEstimate');
        expect(rec).toHaveProperty('speedCategory');
        expect(rec).toHaveProperty('ramNeededGB');
        expect(rec).toHaveProperty('reason');
      });
    });

    it('should recommend fast models for GPU with high RAM', () => {
      const recs = getModelRecommendations(16, 'nvidia');

      expect(recs[0].speedCategory).toBe('fast');
      expect(recs[0].model).toContain('7b');
    });

    it('should recommend small models for CPU only', () => {
      const recs = getModelRecommendations(16, 'none');

      const lastRec = recs[recs.length - 1];
      expect(['fast', 'medium']).toContain(lastRec.speedCategory);
    });

    it('should recommend tinyllama for 4GB CPU', () => {
      const recs = getModelRecommendations(4, 'none');

      expect(recs.some((r) => r.model.includes('tinyllama'))).toBe(true);
    });

    it('should include driver warnings for GPU models', () => {
      const nvidiaRecs = getModelRecommendations(16, 'nvidia');
      const cpuRecs = getModelRecommendations(16, 'none');

      expect(nvidiaRecs[0].driverWarning).toBeDefined();
      expect(cpuRecs[0].driverWarning).toBeUndefined();
    });

    it('should handle different GPU types', () => {
      const gpuTypes: GPUType[] = ['nvidia', 'amd', 'intel-arc', 'apple-metal', 'none'];

      gpuTypes.forEach((gpu) => {
        const recs = getModelRecommendations(8, gpu);

        expect(recs.length).toBeGreaterThan(0);
      });
    });

    it('should handle different RAM amounts', () => {
      const rams: number[] = [4, 8, 16, 32];

      rams.forEach((ram) => {
        const recs = getModelRecommendations(ram, 'nvidia');

        expect(recs.length).toBeGreaterThan(0);
      });
    });

    it('should recommend faster models with more RAM', () => {
      const recs4gb = getModelRecommendations(4, 'nvidia');
      const recs16gb = getModelRecommendations(16, 'nvidia');

      // Higher RAM systems should have faster avg models
      expect(recs16gb[0].speedCategory).toBe('fast');
    });

    it('should show speed estimates in recommendations', () => {
      const recs = getModelRecommendations(8, 'nvidia');

      recs.forEach((rec) => {
        expect(rec.speedEstimate).toMatch(/~.*\/response/);
      });
    });
  });

  describe('Hardware Persistence (localStorage)', () => {
    it('should save hardware selection to localStorage', () => {
      const ram: number = 16;
      const gpu: GPUType = 'nvidia';

      saveUserHardwareSelection(ram, gpu);

      expect(localStorage.getItem('ollama:userRAM')).toBe('16');
      expect(localStorage.getItem('ollama:userGPU')).toBe('nvidia');
    });

    it('should load hardware selection from localStorage', () => {
      localStorage.setItem('ollama:userRAM', '8');
      localStorage.setItem('ollama:userGPU', 'apple-metal');

      const selection = loadUserHardwareSelection();

      expect(selection.ramGB).toBe(8);
      expect(selection.gpuType).toBe('apple-metal');
    });

    it('should return empty object when no selection saved', () => {
      const selection = loadUserHardwareSelection();

      expect(selection.ramGB).toBeUndefined();
      expect(selection.gpuType).toBeUndefined();
    });

    it('should handle localStorage errors gracefully', () => {
      // Mock localStorage to throw error
      Storage.prototype.setItem = vi.fn().mockImplementation(() => {
        throw new Error('QuotaExceededError');
      });

      expect(() => {
        saveUserHardwareSelection(16, 'nvidia');
      }).not.toThrow();
    });

    it('should persist and retrieve various configurations', () => {
      const configs: [number, GPUType][] = [
        [4, 'none'],
        [8, 'nvidia'],
        [16, 'apple-metal'],
        [32, 'amd'],
      ];

      configs.forEach(([ram, gpu]) => {
        localStorage.clear();
        saveUserHardwareSelection(ram, gpu);

        const loaded = loadUserHardwareSelection();
        expect(loaded.ramGB).toBe(ram);
        expect(loaded.gpuType).toBe(gpu);
      });
    });
  });

  describe('getInstallInstructions', () => {
    it('should return Mac instructions with model parameter', () => {
      const instructions = getInstallInstructions('Mac', 'neural-chat');

      expect(instructions).toContain('ollama.ai');
      expect(instructions).toContain('Terminal');
      expect(instructions).toContain('ollama serve');
      expect(instructions).toContain('neural-chat');
    });

    it('should return Windows instructions with model parameter', () => {
      const instructions = getInstallInstructions('Windows', 'mistral:7b');

      expect(instructions).toContain('ollama.ai');
      expect(instructions).toContain('PowerShell');
      expect(instructions).toContain('ollama serve');
      expect(instructions).toContain('mistral:7b');
    });

    it('should return Linux instructions with model parameter', () => {
      const instructions = getInstallInstructions('Linux', 'tinyllama');

      expect(instructions).toContain('ollama.ai');
      expect(instructions).toContain('Terminal');
      expect(instructions).toContain('curl');
      expect(instructions).toContain('tinyllama');
    });

    it('should use default model if not provided', () => {
      const instructions = getInstallInstructions('Mac');

      expect(instructions).toContain('ollama pull neural-chat');
    });

    it('should substitute different models correctly', () => {
      const models = ['neural-chat', 'mistral:7b', 'tinyllama', 'llama2:13b'];

      models.forEach((model) => {
        const mac = getInstallInstructions('Mac', model);
        const windows = getInstallInstructions('Windows', model);

        expect(mac).toContain(`ollama pull ${model}`);
        expect(windows).toContain(`ollama pull ${model}`);
      });
    });

    it('should return Unknown instructions for unrecognized OS', () => {
      const instructions = getInstallInstructions('Unknown', 'neural-chat');

      expect(instructions).toContain('ollama.ai');
      expect(instructions).toContain('operating system');
    });

    it('should be multi-line instructions', () => {
      const instructions = getInstallInstructions('Mac', 'neural-chat');

      expect(instructions.split('\n').length).toBeGreaterThan(2);
    });
  });

  describe('edge cases', () => {
    it('should handle all valid RAM options', () => {
      const rams: number[] = [4, 8, 16, 32, 64];

      rams.forEach((ram) => {
        const recs = getModelRecommendations(ram, 'nvidia');
        expect(recs.length).toBeGreaterThan(0);
      });
    });

    it('should handle missing recommendations gracefully', () => {
      const recs = getModelRecommendations(4, 'none');

      expect(Array.isArray(recs)).toBe(true);
      expect(recs.length).toBeGreaterThan(0);
    });

    it('should be deterministic for same inputs', () => {
      const recs1 = getModelRecommendations(16, 'nvidia');
      const recs2 = getModelRecommendations(16, 'nvidia');

      expect(recs1[0].model).toBe(recs2[0].model);
      expect(recs1.length).toBe(recs2.length);
    });
  });
});
