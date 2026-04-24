/**
 * Validate Gemini API key by testing against Google API
 */
import { fetchWithTimeout } from '../utils/timeout';
import { retry, isRetryableStatus } from '../utils/retry';

const DEFAULT_VALIDATION_TIMEOUT_MS = 8000;
const DEFAULT_VALIDATION_RETRY_ATTEMPTS = 3;

const ollamaModelsCache: Record<string, { ts: number; models: string[] }> = {};
const OLLAMA_MODELS_CACHE_TTL_MS = 30_000;
const ENABLE_OLLAMA_MODELS_CACHE = typeof process !== 'undefined' ? process.env.NODE_ENV !== 'test' : true;

export async function validateGeminiKey(key: string): Promise<{ valid: boolean; error?: string }> {
  if (!key || key.trim().length === 0) {
    return { valid: false, error: 'API key is required' };
  }

  try {
    const response = await retry(async () => {
      const res = await fetchWithTimeout(
        'https://generativelanguage.googleapis.com/v1beta/models/list',
        {
          headers: {
            'x-goog-api-key': key,
          },
        },
        DEFAULT_VALIDATION_TIMEOUT_MS
      );
      if (isRetryableStatus(res.status)) {
        const err: any = new Error(`HTTP ${res.status}`);
        err.status = res.status;
        throw err;
      }
      return res;
    }, { maxAttempts: DEFAULT_VALIDATION_RETRY_ATTEMPTS, baseDelayMs: 400, maxDelayMs: 2500 });

    if (!response.ok) {
      return {
        valid: false,
        error: response.status === 403 ? 'Invalid API key' : `HTTP ${response.status}`,
      };
    }

    return { valid: true };
  } catch (e: any) {
    return { valid: false, error: e.message };
  }
}

/**
 * Validate DeepSeek API key by testing against DeepSeek API
 */
export async function validateDeepseekKey(key: string): Promise<{ valid: boolean; error?: string }> {
  if (!key || key.trim().length === 0) {
    return { valid: false, error: 'API key is required' };
  }

  try {
    const response = await retry(async () => {
      const res = await fetchWithTimeout(
        'https://api.deepseek.com/v1/models',
        {
          headers: {
            'Authorization': `Bearer ${key}`,
            'Content-Type': 'application/json',
          },
        },
        DEFAULT_VALIDATION_TIMEOUT_MS
      );
      if (isRetryableStatus(res.status)) {
        const err: any = new Error(`HTTP ${res.status}`);
        err.status = res.status;
        throw err;
      }
      return res;
    }, { maxAttempts: DEFAULT_VALIDATION_RETRY_ATTEMPTS, baseDelayMs: 400, maxDelayMs: 2500 });

    if (!response.ok) {
      return {
        valid: false,
        error: response.status === 401 ? 'Invalid API key' : `HTTP ${response.status}`,
      };
    }

    return { valid: true };
  } catch (e: any) {
    return { valid: false, error: e.message };
  }
}

/**
 * Validate Ollama connection by checking local server
 */
export async function validateOllamaConnection(url: string): Promise<{ valid: boolean; error?: string }> {
  try {
    const cleanUrl = (url || 'http://localhost:11434').replace(/\/$/, '');
    const response = await retry(async () => {
      const res = await fetchWithTimeout(
        `${cleanUrl}/api/tags`,
        { method: 'GET' },
        3000
      );
      if (isRetryableStatus(res.status)) {
        const err: any = new Error(`HTTP ${res.status}`);
        err.status = res.status;
        throw err;
      }
      return res;
    }, { maxAttempts: 2, baseDelayMs: 250, maxDelayMs: 1000 });

    if (!response.ok) {
      return { valid: false, error: 'Ollama server not responding' };
    }

    return { valid: true };
  } catch (e: any) {
    return {
      valid: false,
      error: `Cannot connect to Ollama. Is it running? Try: ollama serve`,
    };
  }
}

/**
 * Get available models from Ollama
 */
export async function getOllamaModels(url: string): Promise<string[]> {
  try {
    const cleanUrl = url.replace(/\/$/, '');
    const now = Date.now();
    if (ENABLE_OLLAMA_MODELS_CACHE) {
      const cached = ollamaModelsCache[cleanUrl];
      if (cached && now - cached.ts < OLLAMA_MODELS_CACHE_TTL_MS) {
        return cached.models;
      }
    }

    const response = await retry(async () => {
      const res = await fetchWithTimeout(
        `${cleanUrl}/api/tags`,
        {},
        5000
      );
      if (isRetryableStatus(res.status)) {
        const err: any = new Error(`HTTP ${res.status}`);
        err.status = res.status;
        throw err;
      }
      return res;
    }, { maxAttempts: 2, baseDelayMs: 250, maxDelayMs: 1200 });

    if (!response.ok) {
      return [];
    }

    const data = await response.json();
    const models = data.models?.map((m: any) => m.name) || [];
    if (ENABLE_OLLAMA_MODELS_CACHE) {
      ollamaModelsCache[cleanUrl] = { ts: now, models };
    }
    return models;
  } catch {
    return [];
  }
}

/**
 * Validate all providers and return status
 */
export async function validateAllProviders(credentials: any) {
  const results: Record<string, any> = {};

  // Test Gemini if key provided
  if (credentials.geminiKey) {
    results.gemini = await validateGeminiKey(credentials.geminiKey);
  }

  // Test DeepSeek if key provided
  if (credentials.deepseekKey) {
    results.deepseek = await validateDeepseekKey(credentials.deepseekKey);
  }

  // Test Ollama
  results.local = await validateOllamaConnection(
    credentials.ollamaUrl || 'http://localhost:11434'
  );

  return results;
}
