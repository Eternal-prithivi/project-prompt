import { vi } from 'vitest';
import '@testing-library/jest-dom';

// Global mocks for fetch
global.fetch = vi.fn();

// Mock localStorage with real behavior
const storageData: Record<string, string> = {};
const localStorageMock = {
  getItem: vi.fn((key: string) => storageData[key] || null),
  setItem: vi.fn((key: string, value: string) => { storageData[key] = value; }),
  removeItem: vi.fn((key: string) => { delete storageData[key]; }),
  clear: vi.fn(() => { Object.keys(storageData).forEach(key => delete storageData[key]); }),
};
global.localStorage = localStorageMock as any;

// Mock import.meta.env
Object.defineProperty(import.meta, 'env', {
  value: {
    VITE_GEMINI_API_KEY: 'test-gemini-key',
    VITE_DEEPSEEK_API_KEY: 'test-deepseek-key',
    VITE_OLLAMA_URL: 'http://localhost:11434',
    VITE_OLLAMA_MODEL: 'deepseek-r1',
  }
});
