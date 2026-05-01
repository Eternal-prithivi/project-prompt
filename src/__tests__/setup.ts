import { afterEach, beforeEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';

type MockStorage = Storage & {
  clear: ReturnType<typeof vi.fn>;
  getItem: ReturnType<typeof vi.fn>;
  key: ReturnType<typeof vi.fn>;
  removeItem: ReturnType<typeof vi.fn>;
  setItem: ReturnType<typeof vi.fn>;
};

function createStorageMock(): MockStorage {
  let storageData: Record<string, string> = {};

  const storage = {
    get length() {
      return Object.keys(storageData).length;
    },
    clear: vi.fn(() => {
      storageData = {};
    }),
    getItem: vi.fn((key: string) => storageData[key] ?? null),
    key: vi.fn((index: number) => Object.keys(storageData)[index] ?? null),
    removeItem: vi.fn((key: string) => {
      delete storageData[key];
    }),
    setItem: vi.fn((key: string, value: string) => {
      storageData[key] = String(value);
    }),
  };

  return storage as unknown as MockStorage;
}

const localStorageMock = createStorageMock();
const sessionStorageMock = createStorageMock();
const originalFetch = globalThis.fetch?.bind(globalThis);

Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
  configurable: true,
});

Object.defineProperty(globalThis, 'sessionStorage', {
  value: sessionStorageMock,
  configurable: true,
});

Object.defineProperty(import.meta, 'env', {
  value: {
    VITE_GEMINI_API_KEY: 'test-gemini-key',
    VITE_DEEPSEEK_API_KEY: 'test-deepseek-key',
    VITE_OLLAMA_URL: 'http://localhost:11434',
    VITE_OLLAMA_MODEL: 'deepseek-r1',
  },
  configurable: true,
});

beforeEach(() => {
  Object.defineProperty(globalThis, 'fetch', {
    value: originalFetch ?? vi.fn(),
    configurable: true,
    writable: true,
  });

  Object.defineProperty(globalThis.navigator, 'clipboard', {
    value: {
      writeText: vi.fn().mockResolvedValue(undefined),
    },
    configurable: true,
  });

  localStorage.clear();
  sessionStorage.clear();
  vi.clearAllMocks();
});

afterEach(() => {
  cleanup();
  localStorage.clear();
  sessionStorage.clear();
});
