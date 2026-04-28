/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Error Classification Utility
 * Categorizes provider errors into actionable types for observability and UX
 */

export enum ProviderErrorType {
  RATE_LIMIT = 'rate_limit',      // 429, quota exceeded
  AUTH = 'auth',                  // 401, 403, invalid key
  TIMEOUT = 'timeout',            // Request took too long
  NETWORK = 'network',            // Connection lost, DNS fail
  MALFORMED = 'malformed',        // Bad request shape
  PROVIDER_ERROR = 'provider',    // 500, provider crashed
  UNKNOWN = 'unknown',            // Unclassifiable error
}

export interface ClassifiedError {
  type: ProviderErrorType;
  message: string;
  original: Error;
  isRetryable: boolean;
  statusCode?: number;
}

/**
 * Classify errors from any provider into standardized types
 * Handles error objects, HTTP status codes, and provider-specific messages
 */
export function classifyProviderError(error: any, provider?: string): ClassifiedError {
  const originalError = error instanceof Error ? error : new Error(String(error));
  const message = originalError.message || String(error);
  const statusCode = (error as any)?.status || (error as any)?.statusCode;

  // Timeout errors
  if (
    message.includes('timeout') ||
    message.includes('timed out') ||
    (error as any)?.code === 'ETIMEDOUT'
  ) {
    return {
      type: ProviderErrorType.TIMEOUT,
      message,
      original: originalError,
      isRetryable: true,
      statusCode,
    };
  }

  // Network errors
  if (
    message.includes('ECONNREFUSED') ||
    message.includes('ENOTFOUND') ||
    message.includes('ERR_INVALID_URL') ||
    message.includes('fetch failed') ||
    message.includes('offline') ||
    message.includes('connection') ||
    (error as any)?.code === 'ECONNREFUSED'
  ) {
    return {
      type: ProviderErrorType.NETWORK,
      message,
      original: originalError,
      isRetryable: true,
      statusCode,
    };
  }

  // HTTP status code classification
  if (statusCode) {
    // Rate limit (429, 503 Service Unavailable sometimes indicates rate limit)
    if (statusCode === 429 || (statusCode === 503 && message.includes('rate'))) {
      return {
        type: ProviderErrorType.RATE_LIMIT,
        message,
        original: originalError,
        isRetryable: true,
        statusCode,
      };
    }

    // Auth errors (401, 403)
    if (statusCode === 401 || statusCode === 403) {
      return {
        type: ProviderErrorType.AUTH,
        message,
        original: originalError,
        isRetryable: false,
        statusCode,
      };
    }

    // Provider errors (5xx)
    if (statusCode >= 500) {
      return {
        type: ProviderErrorType.PROVIDER_ERROR,
        message,
        original: originalError,
        isRetryable: true,
        statusCode,
      };
    }

    // Malformed (4xx but not 401/403/429)
    if (statusCode >= 400 && statusCode < 500) {
      return {
        type: ProviderErrorType.MALFORMED,
        message,
        original: originalError,
        isRetryable: false,
        statusCode,
      };
    }
  }

  // Provider-specific error message patterns (case-insensitive)
  const lowerMessage = message.toLowerCase();

  if (lowerMessage.includes('invalid api key') || lowerMessage.includes('authentication')) {
    return {
      type: ProviderErrorType.AUTH,
      message,
      original: originalError,
      isRetryable: false,
      statusCode,
    };
  }

  if (lowerMessage.includes('rate limit') || lowerMessage.includes('quota')) {
    return {
      type: ProviderErrorType.RATE_LIMIT,
      message,
      original: originalError,
      isRetryable: true,
      statusCode,
    };
  }

  if (lowerMessage.includes('malformed') || lowerMessage.includes('invalid request')) {
    return {
      type: ProviderErrorType.MALFORMED,
      message,
      original: originalError,
      isRetryable: false,
      statusCode,
    };
  }

  // Gemini-specific
  if (provider === 'gemini') {
    if (message.includes('safety')) {
      return {
        type: ProviderErrorType.PROVIDER_ERROR,
        message: `Gemini blocked: ${message}`,
        original: originalError,
        isRetryable: false,
        statusCode,
      };
    }
  }

  // Ollama-specific
  if (provider === 'ollama') {
    if (message.includes('model not found')) {
      return {
        type: ProviderErrorType.MALFORMED,
        message,
        original: originalError,
        isRetryable: false,
        statusCode,
      };
    }
  }

  // Default to unknown
  return {
    type: ProviderErrorType.UNKNOWN,
    message,
    original: originalError,
    isRetryable: false,
    statusCode,
  };
}

/**
 * Get a user-friendly incident message for UI display
 */
export function getIncidentMessage(classified: ClassifiedError, provider: string): string {
  const providerName = provider.charAt(0).toUpperCase() + provider.slice(1);

  switch (classified.type) {
    case ProviderErrorType.RATE_LIMIT:
      return `⏳ ${providerName} rate-limited. Backing off...`;
    case ProviderErrorType.AUTH:
      return `❌ ${providerName} auth failed. Check your API key.`;
    case ProviderErrorType.TIMEOUT:
      return `⏱️ ${providerName} request timed out. Retrying...`;
    case ProviderErrorType.NETWORK:
      return `📡 No connection to ${providerName}. Check your network.`;
    case ProviderErrorType.MALFORMED:
      return `⚠️ Invalid request to ${providerName}. Please retry.`;
    case ProviderErrorType.PROVIDER_ERROR:
      return `🔴 ${providerName} service error. Retrying...`;
    default:
      return `⚠️ ${providerName} encountered an error. Retrying...`;
  }
}
