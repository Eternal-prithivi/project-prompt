import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  saveCredentials,
  getCredentials,
  clearCredentials,
  getDefaults,
  credentialsToConfig,
  updateCredential,
  setCredentialPassword,
  clearCredentialPassword,
  StoredCredentials,
} from '../../services/credentialStore';

// Mock localStorage for all tests
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('credentialStore', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    setCredentialPassword('test-password');
    // Mock navigator for consistent fingerprint
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 Test Browser',
      configurable: true,
    });
    Object.defineProperty(navigator, 'language', {
      value: 'en-US',
      configurable: true,
    });
  });

  afterEach(() => {
    localStorage.clear();
    clearCredentialPassword();
  });

  describe('getDefaults', () => {
    it('should return default credentials', () => {
      const defaults = getDefaults();
      expect(defaults).toEqual({
        ollamaUrl: 'http://localhost:11434',
        selectedModel: 'deepseek-r1:7b',
        selectedEngine: 'local',
      });
    });

    it('should have no API keys in defaults', () => {
      const defaults = getDefaults();
      expect(defaults.geminiKey).toBeUndefined();
      expect(defaults.deepseekKey).toBeUndefined();
      expect(defaults.chatgptKey).toBeUndefined();
      expect(defaults.claudeKey).toBeUndefined();
      expect(defaults.grokKey).toBeUndefined();
    });
  });

  describe('saveCredentials and getCredentials', () => {
    it('should save and retrieve credentials', () => {
      const creds: StoredCredentials = {
        geminiKey: 'test-gemini-key',
        ollamaUrl: 'http://localhost:11434',
        selectedModel: 'deepseek-r1',
        selectedEngine: 'gemini',
      };

      saveCredentials(creds);
      const retrieved = getCredentials();

      expect(retrieved.geminiKey).toBe('test-gemini-key');
      expect(retrieved.selectedEngine).toBe('gemini');
    });

    it('should encrypt credentials (not plain text in localStorage)', () => {
      const creds: StoredCredentials = {
        geminiKey: 'secret-api-key-12345',
        ollamaUrl: 'http://localhost:11434',
        selectedModel: 'deepseek-r1',
        selectedEngine: 'gemini',
      };

      saveCredentials(creds);
      const raw = localStorage.getItem('pa_creds_v1');

      // Should not contain the plain text key
      expect(raw).toBeDefined();
      expect(raw).not.toContain('secret-api-key-12345');
      expect(raw).not.toContain('gemini');
    });

    it('should handle multiple API keys', () => {
      const creds: StoredCredentials = {
        geminiKey: 'gemini-key',
        deepseekKey: 'deepseek-key',
        chatgptKey: 'chatgpt-key',
        ollamaUrl: 'http://localhost:11434',
        selectedModel: 'deepseek-r1',
        selectedEngine: 'gemini',
      };

      saveCredentials(creds);
      const retrieved = getCredentials();

      expect(retrieved.geminiKey).toBe('gemini-key');
      expect(retrieved.deepseekKey).toBe('deepseek-key');
      expect(retrieved.chatgptKey).toBe('chatgpt-key');
    });

    it('should return defaults when no credentials stored', () => {
      const retrieved = getCredentials();
      expect(retrieved).toEqual(getDefaults());
    });

    it('should throw error on save failure with empty key', () => {
      const creds: StoredCredentials = {
        geminiKey: 'test',
        ollamaUrl: 'http://localhost:11434',
        selectedModel: 'deepseek-r1',
        selectedEngine: 'gemini',
      };

      // Should not throw but should handle gracefully
      expect(() => saveCredentials(creds)).not.toThrow();
    });

    it('should handle JSON with special characters', () => {
      const creds: StoredCredentials = {
        geminiKey: 'key-with-"quotes"-and-\\backslashes\\',
        deepseekKey: 'key-with-émojis-🔒',
        ollamaUrl: 'http://localhost:11434',
        selectedModel: 'deepseek-r1',
        selectedEngine: 'deepseek',
      };

      saveCredentials(creds);
      const retrieved = getCredentials();

      expect(retrieved.geminiKey).toBe('key-with-"quotes"-and-\\backslashes\\');
      expect(retrieved.deepseekKey).toBe('key-with-émojis-🔒');
    });
  });

  describe('clearCredentials', () => {
    it('should remove credentials from localStorage', () => {
      const creds: StoredCredentials = {
        geminiKey: 'test-key',
        ollamaUrl: 'http://localhost:11434',
        selectedModel: 'deepseek-r1',
        selectedEngine: 'gemini',
      };

      saveCredentials(creds);
      expect(getCredentials().geminiKey).toBe('test-key');

      clearCredentials();
      const retrieved = getCredentials();

      expect(retrieved).toEqual(getDefaults());
    });

    it('should not throw error when clearing empty storage', () => {
      expect(() => clearCredentials()).not.toThrow();
    });
  });

  describe('credentialsToConfig', () => {
    it('should convert gemini credentials to config', () => {
      const creds: StoredCredentials = {
        geminiKey: 'gemini-key',
        ollamaUrl: 'http://localhost:11434',
        selectedModel: 'deepseek-r1',
        selectedEngine: 'gemini',
      };

      const config = credentialsToConfig(creds);

      expect(config.engine).toBe('gemini');
      expect(config.apiKey).toBe('gemini-key');
    });

    it('should convert deepseek credentials to config', () => {
      const creds: StoredCredentials = {
        deepseekKey: 'deepseek-key',
        ollamaUrl: 'http://localhost:11434',
        selectedModel: 'deepseek-r1',
        selectedEngine: 'deepseek',
      };

      const config = credentialsToConfig(creds);

      expect(config.engine).toBe('deepseek');
      expect(config.apiKey).toBe('deepseek-key');
    });

    it('should convert local credentials to config', () => {
      const creds: StoredCredentials = {
        ollamaUrl: 'http://custom-ollama:11434',
        selectedModel: 'custom-model',
        selectedEngine: 'local',
      };

      const config = credentialsToConfig(creds);

      expect(config.engine).toBe('local');
      expect(config.apiKey).toBeUndefined();
      expect(config.ollamaUrl).toBe('http://custom-ollama:11434');
      expect(config.selectedModel).toBe('custom-model');
    });

    it('should convert all provider types', () => {
      const providers: Array<'gemini' | 'deepseek' | 'chatgpt' | 'claude' | 'grok' | 'local'> = [
        'gemini',
        'deepseek',
        'chatgpt',
        'claude',
        'grok',
        'local',
      ];

      providers.forEach((provider) => {
        const creds: StoredCredentials = {
          geminiKey: 'key',
          deepseekKey: 'key',
          chatgptKey: 'key',
          claudeKey: 'key',
          grokKey: 'key',
          ollamaUrl: 'http://localhost:11434',
          selectedModel: 'model',
          selectedEngine: provider,
        };

        const config = credentialsToConfig(creds);
        expect(config.engine).toBe(provider);
      });
    });
  });

  describe('updateCredential', () => {
    it('should update single credential without losing others', () => {
      const initial: StoredCredentials = {
        geminiKey: 'gemini-key',
        deepseekKey: 'deepseek-key',
        ollamaUrl: 'http://localhost:11434',
        selectedModel: 'deepseek-r1',
        selectedEngine: 'gemini',
      };

      saveCredentials(initial);

      const updated = updateCredential('geminiKey', 'new-gemini-key');

      expect(updated.geminiKey).toBe('new-gemini-key');
      expect(updated.deepseekKey).toBe('deepseek-key');
      expect(updated.selectedEngine).toBe('gemini');
    });

    it('should persist updated credentials', () => {
      const initial: StoredCredentials = {
        geminiKey: 'old-key',
        ollamaUrl: 'http://localhost:11434',
        selectedModel: 'deepseek-r1',
        selectedEngine: 'gemini',
      };

      saveCredentials(initial);
      updateCredential('geminiKey', 'new-key');

      const retrieved = getCredentials();
      expect(retrieved.geminiKey).toBe('new-key');
    });

    it('should update engine selection', () => {
      const initial: StoredCredentials = {
        geminiKey: 'key',
        deepseekKey: 'key',
        ollamaUrl: 'http://localhost:11434',
        selectedModel: 'deepseek-r1',
        selectedEngine: 'gemini',
      };

      saveCredentials(initial);
      const updated = updateCredential('selectedEngine', 'deepseek');

      expect(updated.selectedEngine).toBe('deepseek');
    });

    it('should work starting from defaults', () => {
      // Start with no saved credentials
      const updated = updateCredential('geminiKey', 'first-key');

      expect(updated.geminiKey).toBe('first-key');
      expect(updated.ollamaUrl).toBe('http://localhost:11434');
    });
  });

  describe('encryption security', () => {
    it('should encrypt different credentials differently', () => {
      const creds1: StoredCredentials = {
        geminiKey: 'key1',
        ollamaUrl: 'http://localhost:11434',
        selectedModel: 'deepseek-r1',
        selectedEngine: 'gemini',
      };

      const creds2: StoredCredentials = {
        geminiKey: 'key2',
        ollamaUrl: 'http://localhost:11434',
        selectedModel: 'deepseek-r1',
        selectedEngine: 'gemini',
      };

      saveCredentials(creds1);
      const encrypted1 = localStorage.getItem('pa_creds_v1');

      saveCredentials(creds2);
      const encrypted2 = localStorage.getItem('pa_creds_v1');

      expect(encrypted1).not.toBe(encrypted2);
    });

    it('should handle corrupted encrypted data gracefully', () => {
      localStorage.setItem('pa_creds_v1', 'not-valid-encryption-data');

      const retrieved = getCredentials();
      expect(retrieved).toEqual(getDefaults());
    });

    it('should handle empty encrypted data gracefully', () => {
      localStorage.setItem('pa_creds_v1', '');

      const retrieved = getCredentials();
      expect(retrieved).toEqual(getDefaults());
    });
  });

  describe('edge cases', () => {
    it('should handle localStorage full scenario', () => {
      const creds: StoredCredentials = {
        geminiKey: 'test-key',
        ollamaUrl: 'http://localhost:11434',
        selectedModel: 'deepseek-r1:7b',
        selectedEngine: 'gemini',
      };

      // Mock localStorage to simulate full storage
      const spy = vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
        throw new Error('QuotaExceededError');
      });

      expect(() => saveCredentials(creds)).toThrow();

      spy.mockRestore();
    });

    it('should handle null ollamaUrl gracefully', () => {
      const creds: StoredCredentials = {
        geminiKey: 'key',
        ollamaUrl: '',
        selectedModel: 'model',
        selectedEngine: 'gemini',
      };

      expect(() => saveCredentials(creds)).not.toThrow();
      const retrieved = getCredentials();
      expect(retrieved.ollamaUrl).toBe('');
    });
  });
});
