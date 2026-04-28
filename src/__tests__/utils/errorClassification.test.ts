import { describe, it, expect } from 'vitest';
import {
  ProviderErrorType,
  classifyProviderError,
  getIncidentMessage,
} from '../../services/utils/errorClassification';

describe('errorClassification', () => {
  describe('classifyProviderError', () => {
    it('should classify timeout errors', () => {
      const error = new Error('Request timed out after 30s');
      const classified = classifyProviderError(error);
      expect(classified.type).toBe(ProviderErrorType.TIMEOUT);
      expect(classified.isRetryable).toBe(true);
    });

    it('should classify network errors (ECONNREFUSED)', () => {
      const error = new Error('ECONNREFUSED: Connection refused');
      const classified = classifyProviderError(error);
      expect(classified.type).toBe(ProviderErrorType.NETWORK);
      expect(classified.isRetryable).toBe(true);
    });

    it('should classify network errors (ENOTFOUND)', () => {
      const error = new Error('ENOTFOUND: getaddrinfo ENOTFOUND api.example.com');
      const classified = classifyProviderError(error);
      expect(classified.type).toBe(ProviderErrorType.NETWORK);
      expect(classified.isRetryable).toBe(true);
    });

    it('should classify 429 rate limit errors by status code', () => {
      const error = new Error('Too Many Requests');
      (error as any).status = 429;
      const classified = classifyProviderError(error);
      expect(classified.type).toBe(ProviderErrorType.RATE_LIMIT);
      expect(classified.isRetryable).toBe(true);
      expect(classified.statusCode).toBe(429);
    });

    it('should classify rate limit errors by message', () => {
      const error = new Error('Rate limit exceeded');
      const classified = classifyProviderError(error);
      expect(classified.type).toBe(ProviderErrorType.RATE_LIMIT);
      expect(classified.isRetryable).toBe(true);
    });

    it('should classify 401 auth errors', () => {
      const error = new Error('Unauthorized');
      (error as any).status = 401;
      const classified = classifyProviderError(error);
      expect(classified.type).toBe(ProviderErrorType.AUTH);
      expect(classified.isRetryable).toBe(false);
    });

    it('should classify 403 auth errors', () => {
      const error = new Error('Forbidden');
      (error as any).status = 403;
      const classified = classifyProviderError(error);
      expect(classified.type).toBe(ProviderErrorType.AUTH);
      expect(classified.isRetryable).toBe(false);
    });

    it('should classify invalid api key errors', () => {
      const error = new Error('Invalid API key provided');
      const classified = classifyProviderError(error);
      expect(classified.type).toBe(ProviderErrorType.AUTH);
      expect(classified.isRetryable).toBe(false);
    });

    it('should classify 5xx provider errors', () => {
      const error = new Error('Internal Server Error');
      (error as any).status = 500;
      const classified = classifyProviderError(error);
      expect(classified.type).toBe(ProviderErrorType.PROVIDER_ERROR);
      expect(classified.isRetryable).toBe(true);
    });

    it('should classify 502 provider errors', () => {
      const error = new Error('Bad Gateway');
      (error as any).status = 502;
      const classified = classifyProviderError(error);
      expect(classified.type).toBe(ProviderErrorType.PROVIDER_ERROR);
      expect(classified.isRetryable).toBe(true);
    });

    it('should classify 4xx malformed errors', () => {
      const error = new Error('Bad Request');
      (error as any).status = 400;
      const classified = classifyProviderError(error);
      expect(classified.type).toBe(ProviderErrorType.MALFORMED);
      expect(classified.isRetryable).toBe(false);
    });

    it('should classify malformed request by message', () => {
      const error = new Error('Malformed JSON in request');
      const classified = classifyProviderError(error);
      expect(classified.type).toBe(ProviderErrorType.MALFORMED);
      expect(classified.isRetryable).toBe(false);
    });

    it('should classify unknown errors', () => {
      const error = new Error('Some weird error that does not match patterns');
      const classified = classifyProviderError(error);
      expect(classified.type).toBe(ProviderErrorType.UNKNOWN);
      expect(classified.isRetryable).toBe(false);
    });

    it('should handle non-Error objects', () => {
      const classified = classifyProviderError('Plain string error');
      expect(classified.type).toBe(ProviderErrorType.UNKNOWN);
      expect(classified.original).toBeInstanceOf(Error);
    });

    it('should preserve original error', () => {
      const original = new Error('Original error');
      const classified = classifyProviderError(original);
      expect(classified.original).toBe(original);
    });

    it('should classify Ollama model not found', () => {
      const error = new Error('model not found in tags');
      const classified = classifyProviderError(error, 'ollama');
      expect(classified.type).toBe(ProviderErrorType.MALFORMED);
      expect(classified.isRetryable).toBe(false);
    });
  });

  describe('getIncidentMessage', () => {
    it('should return rate limit message', () => {
      const classified = {
        type: ProviderErrorType.RATE_LIMIT,
        message: 'Rate limit',
        original: new Error(),
        isRetryable: true,
      };
      const msg = getIncidentMessage(classified, 'gemini');
      expect(msg).toContain('rate-limited');
      expect(msg).toContain('Gemini');
    });

    it('should return auth error message', () => {
      const classified = {
        type: ProviderErrorType.AUTH,
        message: 'Invalid key',
        original: new Error(),
        isRetryable: false,
      };
      const msg = getIncidentMessage(classified, 'claude');
      expect(msg).toContain('auth failed');
      expect(msg).toContain('Claude');
    });

    it('should return timeout message', () => {
      const classified = {
        type: ProviderErrorType.TIMEOUT,
        message: 'Timeout',
        original: new Error(),
        isRetryable: true,
      };
      const msg = getIncidentMessage(classified, 'deepseek');
      expect(msg).toContain('timed out');
      expect(msg).toContain('Deepseek');
    });

    it('should return network message', () => {
      const classified = {
        type: ProviderErrorType.NETWORK,
        message: 'Connection refused',
        original: new Error(),
        isRetryable: true,
      };
      const msg = getIncidentMessage(classified, 'ollama');
      expect(msg).toContain('connection');
      expect(msg).toContain('Ollama');
    });

    it('should return provider error message', () => {
      const classified = {
        type: ProviderErrorType.PROVIDER_ERROR,
        message: 'Server error',
        original: new Error(),
        isRetryable: true,
      };
      const msg = getIncidentMessage(classified, 'chatgpt');
      expect(msg).toContain('service error');
      expect(msg).toContain('Chatgpt');
    });

    it('should capitalize provider name', () => {
      const classified = {
        type: ProviderErrorType.TIMEOUT,
        message: 'Timeout',
        original: new Error(),
        isRetryable: true,
      };
      const msg = getIncidentMessage(classified, 'grok');
      expect(msg).toContain('Grok');
    });
  });
});
