import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  saveCredentials,
  getCredentials,
  clearCredentials,
  credentialsToConfig,
  setCredentialPassword,
  clearCredentialPassword,
} from '../../services/credentialStore';
import { validateGeminiKey, validateDeepseekKey, validateOllamaConnection } from '../../services/providers/validation';

// Mock localStorage
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

describe('Integration Tests - Complete Workflows', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    setCredentialPassword('test-password');
    // Mock navigator for consistent behavior
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 Test Browser',
      configurable: true,
    });
  });

  afterEach(() => {
    localStorage.clear();
    clearCredentialPassword();
  });

  describe('Credential Storage Workflow', () => {
    it('should save and retrieve credentials with encryption', () => {
      const credentials = {
        geminiKey: 'test-gemini-key',
        deepseekKey: 'test-deepseek-key',
        ollamaUrl: 'http://localhost:11434',
        selectedModel: 'deepseek-r1',
        selectedEngine: 'gemini' as const,
      };

      saveCredentials(credentials);
      const retrieved = getCredentials();

      expect(retrieved.geminiKey).toBe('test-gemini-key');
      expect(retrieved.deepseekKey).toBe('test-deepseek-key');
      expect(retrieved.selectedEngine).toBe('gemini');
    });

    it('should convert credentials to provider config', () => {
      const credentials = {
        geminiKey: 'my-key',
        deepseekKey: '',
        chatgptKey: '',
        claudeKey: '',
        grokKey: '',
        ollamaUrl: 'http://localhost:11434',
        selectedModel: 'deepseek-r1',
        selectedEngine: 'gemini' as const,
      };

      const config = credentialsToConfig(credentials);

      expect(config.engine).toBe('gemini');
      expect(config.apiKey).toBe('my-key');
    });

    it('should clear credentials', () => {
      const credentials = {
        geminiKey: 'test-key',
        deepseekKey: '',
        chatgptKey: '',
        claudeKey: '',
        grokKey: '',
        ollamaUrl: 'http://localhost:11434',
        selectedModel: 'deepseek-r1',
        selectedEngine: 'gemini' as const,
      };

      saveCredentials(credentials);
      expect(getCredentials().geminiKey).toBe('test-key');

      clearCredentials();
      const after = getCredentials();
      expect(after.geminiKey).toBeUndefined();
    });

    it('should persist credentials across reads', () => {
      const creds1 = {
        geminiKey: 'key1',
        deepseekKey: '',
        chatgptKey: '',
        claudeKey: '',
        grokKey: '',
        ollamaUrl: 'http://localhost:11434',
        selectedModel: 'model1',
        selectedEngine: 'gemini' as const,
      };

      saveCredentials(creds1);

      const read1 = getCredentials();
      const read2 = getCredentials();

      expect(read1.geminiKey).toBe(read2.geminiKey);
      expect(read1.selectedModel).toBe(read2.selectedModel);
    });
  });

  describe('Provider Validation Workflow', () => {
    it('should validate empty API key', async () => {
      const result = await validateGeminiKey('');
      expect(result.valid).toBe(false);
    });

    it('should validate empty DeepSeek key', async () => {
      const result = await validateDeepseekKey('');
      expect(result.valid).toBe(false);
    });

    it('should validate Ollama with default URL', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false, // Ollama not running
        status: 500,
      });

      const result = await validateOllamaConnection('');
      expect(result.valid).toBe(false);
    });

    it('should handle network errors gracefully', async () => {
      global.fetch = vi.fn().mockRejectedValueOnce(new Error('Network error'));

      const result = await validateGeminiKey('test-key');
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('Multi-Provider Switching Workflow', () => {
    it('should switch from Gemini to DeepSeek', () => {
      // Save Gemini credentials
      let creds = {
        geminiKey: 'gemini-key',
        deepseekKey: '',
        chatgptKey: '',
        claudeKey: '',
        grokKey: '',
        ollamaUrl: '',
        selectedModel: '',
        selectedEngine: 'gemini' as const,
      };
      saveCredentials(creds);

      let retrieved = getCredentials();
      expect(retrieved.selectedEngine).toBe('gemini');

      // Switch to DeepSeek
      const deepseekCreds = {
        ...creds,
        deepseekKey: 'deepseek-key',
        selectedEngine: 'deepseek' as const,
      };
      saveCredentials(deepseekCreds);

      retrieved = getCredentials();
      expect(retrieved.selectedEngine).toBe('deepseek');
      expect(retrieved.deepseekKey).toBe('deepseek-key');
    });

    it('should switch to local Ollama', () => {
      const creds = {
        geminiKey: '',
        deepseekKey: '',
        chatgptKey: '',
        claudeKey: '',
        grokKey: '',
        ollamaUrl: 'http://localhost:11434',
        selectedModel: 'deepseek-r1',
        selectedEngine: 'local' as const,
      };

      saveCredentials(creds);
      const retrieved = getCredentials();

      expect(retrieved.selectedEngine).toBe('local');
      expect(retrieved.ollamaUrl).toBe('http://localhost:11434');
      expect(retrieved.selectedModel).toBe('deepseek-r1');
    });

    it('should convert switched provider to config', () => {
      const creds = {
        geminiKey: 'key1',
        deepseekKey: 'key2',
        chatgptKey: 'key3',
        claudeKey: 'key4',
        grokKey: 'key5',
        ollamaUrl: 'http://localhost:11434',
        selectedModel: 'model',
        selectedEngine: 'deepseek' as const,
      };

      saveCredentials(creds);
      const retrieved = getCredentials();
      const config = credentialsToConfig(retrieved);

      expect(config.engine).toBe('deepseek');
      expect(config.apiKey).toBe('key2');
    });
  });

  describe('Complete Authentication Flow', () => {
    it('should complete full auth setup: save -> retrieve -> validate -> switch', () => {
      // Step 1: Save initial credentials
      const initial = {
        geminiKey: 'gemini-test',
        deepseekKey: '',
        chatgptKey: '',
        claudeKey: '',
        grokKey: '',
        ollamaUrl: 'http://localhost:11434',
        selectedModel: 'deepseek-r1',
        selectedEngine: 'gemini' as const,
      };

      saveCredentials(initial);

      // Step 2: Retrieve and verify
      let retrieved = getCredentials();
      expect(retrieved.geminiKey).toBe('gemini-test');

      // Step 3: Update with new key
      const updated = {
        ...retrieved,
        deepseekKey: 'deepseek-test',
        selectedEngine: 'deepseek' as const,
      };

      saveCredentials(updated);

      // Step 4: Verify update
      retrieved = getCredentials();
      expect(retrieved.selectedEngine).toBe('deepseek');
      expect(retrieved.deepseekKey).toBe('deepseek-test');

      // Step 5: Convert to config
      const config = credentialsToConfig(retrieved);
      expect(config.engine).toBe('deepseek');
      expect(config.apiKey).toBe('deepseek-test');
    });
  });

  describe('Data Integrity Tests', () => {
    it('should maintain data integrity across multiple saves', () => {
      const originalCreds = {
        geminiKey: 'key-123',
        deepseekKey: 'key-456',
        chatgptKey: 'key-789',
        claudeKey: 'key-000',
        grokKey: 'key-111',
        ollamaUrl: 'http://custom:11434',
        selectedModel: 'custom-model',
        selectedEngine: 'gemini' as const,
      };

      saveCredentials(originalCreds);

      // Multiple reads should be consistent
      const read1 = getCredentials();
      const read2 = getCredentials();
      const read3 = getCredentials();

      expect(read1).toEqual(read2);
      expect(read2).toEqual(read3);
    });

    it('should handle special characters in credentials', () => {
      const creds = {
        geminiKey: 'key-with-"quotes"-and-\\backslashes\\',
        deepseekKey: 'key-with-émojis-🔒',
        chatgptKey: 'key-with-unicode-✓-✗',
        claudeKey: '',
        grokKey: '',
        ollamaUrl: 'http://localhost:11434',
        selectedModel: 'model',
        selectedEngine: 'gemini' as const,
      };

      saveCredentials(creds);
      const retrieved = getCredentials();

      expect(retrieved.geminiKey).toBe('key-with-"quotes"-and-\\backslashes\\');
      expect(retrieved.deepseekKey).toBe('key-with-émojis-🔒');
      expect(retrieved.chatgptKey).toBe('key-with-unicode-✓-✗');
    });

    it('should handle large credential strings', () => {
      const largeKey = 'a'.repeat(5000);
      const creds = {
        geminiKey: largeKey,
        deepseekKey: '',
        chatgptKey: '',
        claudeKey: '',
        grokKey: '',
        ollamaUrl: 'http://localhost:11434',
        selectedModel: 'model',
        selectedEngine: 'gemini' as const,
      };

      saveCredentials(creds);
      const retrieved = getCredentials();

      expect(retrieved.geminiKey.length).toBe(5000);
      expect(retrieved.geminiKey).toBe(largeKey);
    });
  });

  describe('Error Recovery', () => {
    it('should recover from corrupted data', () => {
      // Save valid data
      const valid = {
        geminiKey: 'valid-key',
        deepseekKey: '',
        chatgptKey: '',
        claudeKey: '',
        grokKey: '',
        ollamaUrl: 'http://localhost:11434',
        selectedModel: 'model',
        selectedEngine: 'gemini' as const,
      };

      saveCredentials(valid);

      // Corrupt the storage
      localStorage.setItem('pa_creds_v1', 'corrupted-invalid-data');

      // Should return defaults
      const retrieved = getCredentials();
      expect(retrieved).toBeDefined();
    });

    it('should handle empty localStorage', () => {
      localStorage.clear();
      const retrieved = getCredentials();

      expect(retrieved).toBeDefined();
      expect(retrieved.ollamaUrl).toBe('http://localhost:11434');
    });
  });

  describe('Cross-Credential Consistency', () => {
    it('should maintain consistency across different engine types', () => {
      // Test Gemini
      let creds = {
        geminiKey: 'g-key',
        deepseekKey: 'd-key',
        chatgptKey: 'c-key',
        claudeKey: 'a-key',
        grokKey: 'x-key',
        ollamaUrl: 'http://localhost:11434',
        selectedModel: 'model',
        selectedEngine: 'gemini' as const,
      };

      saveCredentials(creds);
      let retrieved = getCredentials();
      let config = credentialsToConfig(retrieved);
      expect(config.apiKey).toBe('g-key');

      // Test DeepSeek
      const deepseekCreds = { ...creds, selectedEngine: 'deepseek' as const };
      saveCredentials(deepseekCreds);
      retrieved = getCredentials();
      config = credentialsToConfig(retrieved);
      expect(config.apiKey).toBe('d-key');

      // Test Ollama (no API key)
      const ollamaCreds = { ...creds, selectedEngine: 'local' as const };
      saveCredentials(ollamaCreds);
      retrieved = getCredentials();
      config = credentialsToConfig(retrieved);
      expect(config.apiKey).toBeUndefined();
      expect(config.ollamaUrl).toBe('http://localhost:11434');
    });
  });
});
