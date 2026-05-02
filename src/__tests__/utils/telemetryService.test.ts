import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  getTelemetryData,
  recordPromptRun,
  recordCompression,
  recordBattleWin,
  clearTelemetryData
} from '../../services/utils/telemetryService';

describe('telemetryService', () => {
  let originalLocalStorage: Storage;

  beforeEach(() => {
    originalLocalStorage = window.localStorage;
    const store: Record<string, string> = {};
    const mockLocalStorage = {
      getItem: (key: string) => store[key] || null,
      setItem: (key: string, value: string) => {
        store[key] = value.toString();
      },
      clear: () => {
        for (const key in store) delete store[key];
      },
      removeItem: (key: string) => {
        delete store[key];
      },
      length: 0,
      key: (index: number) => null,
    };
    Object.defineProperty(window, 'localStorage', { value: mockLocalStorage, writable: true });
    clearTelemetryData();
  });

  afterEach(() => {
    Object.defineProperty(window, 'localStorage', { value: originalLocalStorage, writable: true });
  });

  it('starts with default data', () => {
    const data = getTelemetryData();
    expect(data.totalPromptsRun).toBe(0);
    expect(data.totalTokensCompressed).toBe(0);
    expect(data.estimatedCostSaved).toBe(0);
    expect(data.providerUsage).toEqual({});
    expect(data.battleWins).toEqual({});
  });

  it('records prompt runs', () => {
    recordPromptRun('gemini');
    recordPromptRun('gemini');
    recordPromptRun('local');

    const data = getTelemetryData();
    expect(data.totalPromptsRun).toBe(3);
    expect(data.providerUsage).toEqual({ gemini: 2, local: 1 });
  });

  it('records compressions', () => {
    recordCompression(1000, 0.05);
    recordCompression(500, 0.02);

    const data = getTelemetryData();
    expect(data.totalTokensCompressed).toBe(1500);
    expect(data.estimatedCostSaved).toBeCloseTo(0.07);
  });

  it('records battle wins', () => {
    recordBattleWin('gemini-1.5-flash');
    recordBattleWin('local-llama3');
    recordBattleWin('gemini-1.5-flash');

    const data = getTelemetryData();
    expect(data.battleWins).toEqual({
      'gemini-1.5-flash': 2,
      'local-llama3': 1
    });
  });

  it('clears data', () => {
    recordPromptRun('chatgpt');
    clearTelemetryData();
    const data = getTelemetryData();
    expect(data.totalPromptsRun).toBe(0);
    expect(data.providerUsage).toEqual({});
  });
});
