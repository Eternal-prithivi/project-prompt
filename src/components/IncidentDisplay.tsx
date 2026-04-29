/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Incident Display Component
 * Shows user-facing incident hints during provider operations
 */

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertCircle, Zap, Loader } from 'lucide-react';
import { logger, LogEntry, LogLevel } from '../services/utils/logger';
import { getIncidentMessage, ProviderErrorType, classifyProviderError } from '../services/utils/errorClassification';
import { RecoveryActions } from './RecoveryActions';

export interface IncidentDisplayProps {
  provider?: string;
  isLoading?: boolean;
  error?: Error | null;
  onClose?: () => void;
  onRetry?: () => void;
  onSwitchProvider?: (provider: string) => void;
  onSwitchModel?: (model: string) => void;
  onOpenSettings?: () => void;
  showActions?: boolean;
  context?: 'test' | 'analyze' | 'variations' | 'battle' | 'refine' | 'init';
  availableProviders?: string[];
  availableModels?: string[];
}

/**
 * Display incident hints during provider operations
 * Shows status like: "⏳ Gemini rate-limited, retrying in 2s..."
 * Optionally shows recovery action buttons
 */
export const IncidentDisplay: React.FC<IncidentDisplayProps> = ({
  provider,
  isLoading = false,
  error = null,
  onClose,
  onRetry,
  onSwitchProvider,
  onSwitchModel,
  onOpenSettings,
  showActions = false,
  context = 'test',
  availableProviders = [],
  availableModels = [],
}) => {
  const [recentLogs, setRecentLogs] = useState<LogEntry[]>([]);
  const [isRetrying, setIsRetrying] = useState(false);
  const [errorType, setErrorType] = useState<ProviderErrorType>(ProviderErrorType.UNKNOWN);

  useEffect(() => {
    if (!provider) return;

    // Poll logs every 500ms to show real-time incidents
    const interval = setInterval(() => {
      const logs = logger.getProviderErrors(provider, 5);
      if (logs.length > 0) {
        setRecentLogs(logs);
        // If most recent error is classified as retryable, mark as retrying
        const latest = logs[logs.length - 1];
        if (latest?.data?.isRetryable) {
          setIsRetrying(true);
          setTimeout(() => setIsRetrying(false), 2000);
        }
        // Extract error type from logs
        if (latest?.data?.errorType) {
          setErrorType(latest.data.errorType);
        }
      }
    }, 500);

    return () => clearInterval(interval);
  }, [provider]);

  // If error provided, show incident message for it
  if (error && provider) {
    let incidentMsg = `Error: ${error.message}`;
    let classifiedErrorType = ProviderErrorType.UNKNOWN;

    try {
      // Classify the error
      const classified = classifyProviderError(error, provider);
      classifiedErrorType = classified.type as ProviderErrorType;
      incidentMsg = getIncidentMessageForType(classifiedErrorType, provider);
    } catch {
      // Fall back to error message
    }

    return (
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 flex flex-col gap-2"
      >
        <div className="flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1 text-sm text-red-300">{incidentMsg}</div>
          {onClose && (
            <button onClick={onClose} className="text-red-400 hover:text-red-300 flex-shrink-0">
              ✕
            </button>
          )}
        </div>
        {showActions && onRetry && (
          <RecoveryActions
            error={error}
            errorType={classifiedErrorType}
            provider={provider}
            context={context}
            onRetry={onRetry}
            onSwitchProvider={onSwitchProvider}
            onSwitchModel={onSwitchModel}
            onOpenSettings={onOpenSettings}
            availableProviders={availableProviders}
            availableModels={availableModels}
          />
        )}
      </motion.div>
    );
  }

  // Show loading indicator if active
  if (isLoading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="flex items-center gap-2 text-indigo-400"
      >
        <Loader className="w-4 h-4 animate-spin" />
        <span className="text-sm">
          {provider ? `Calling ${provider}...` : 'Processing...'}
        </span>
      </motion.div>
    );
  }

  // Show retry state
  if (isRetrying && provider) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="flex items-center gap-2 text-amber-400"
      >
        <Zap className="w-4 h-4 animate-pulse" />
        <span className="text-sm">⏳ {provider} backing off, will retry...</span>
      </motion.div>
    );
  }

  return null;
};

/**
 * Get user-friendly incident message for error type
 */
function getIncidentMessageForType(errorType: ProviderErrorType, provider: string): string {
  const providerName = provider.charAt(0).toUpperCase() + provider.slice(1);

  const messages: Record<ProviderErrorType, string> = {
    [ProviderErrorType.RATE_LIMIT]: `⏳ ${providerName} rate-limited. Backing off...`,
    [ProviderErrorType.AUTH]: `❌ ${providerName} auth failed. Check your API key.`,
    [ProviderErrorType.TIMEOUT]: `⏱️ ${providerName} request timed out. Retrying...`,
    [ProviderErrorType.NETWORK]: `📡 No connection to ${providerName}. Check your network.`,
    [ProviderErrorType.MALFORMED]: `⚠️ Invalid request to ${providerName}. Please retry.`,
    [ProviderErrorType.PROVIDER_ERROR]: `🔴 ${providerName} service error. Retrying...`,
    [ProviderErrorType.UNKNOWN]: `⚠️ ${providerName} encountered an error. Retrying...`,
  };

  return messages[errorType] || `⚠️ ${providerName} error occurred.`;
}
