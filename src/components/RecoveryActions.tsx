/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Recovery Actions Component
 * Displays action buttons for user recovery from provider errors
 */

import React from 'react';
import { motion } from 'motion/react';
import { RotateCw, AlertCircle, Settings, Zap } from 'lucide-react';
import { ProviderErrorType } from '../services/utils/errorClassification';
import { Button } from './ui/Button';

export interface RecoveryActionsProps {
  error: Error;
  errorType: ProviderErrorType;
  provider: string;
  context: 'test' | 'analyze' | 'variations' | 'battle' | 'refine' | 'init';
  onRetry: () => void;
  onSwitchProvider?: (provider: string) => void;
  onSwitchModel?: (model: string) => void;
  onOpenSettings?: () => void;
  availableProviders?: string[];
  availableModels?: string[];
}

/**
 * Renders contextual recovery actions based on error type and context
 */
export const RecoveryActions: React.FC<RecoveryActionsProps> = ({
  error: _error,
  errorType,
  provider: _provider,
  context: _context,
  onRetry,
  onSwitchProvider,
  onSwitchModel,
  onOpenSettings,
  availableProviders = [],
  availableModels = [],
}) => {
  const getActionButtonsForErrorType = (): {
    label: string;
    icon: React.ReactNode;
    action: () => void;
    variant: 'primary' | 'secondary';
  }[] => {
    const actions: {
      label: string;
      icon: React.ReactNode;
      action: () => void;
      variant: 'primary' | 'secondary';
    }[] = [];

    // Primary action is always Retry
    actions.push({
      label: 'RETRY',
      icon: <RotateCw className="w-3 h-3" />,
      action: onRetry,
      variant: 'primary',
    });

    // Secondary actions based on error type
    switch (errorType) {
      case ProviderErrorType.RATE_LIMIT:
        // Rate limited: try different model or wait + switch provider
        if (availableModels.length > 0 && onSwitchModel) {
          actions.push({
            label: 'TRY DIFFERENT MODEL',
            icon: <Zap className="w-3 h-3" />,
            action: () => onSwitchModel(availableModels[0]),
            variant: 'secondary',
          });
        }
        if (availableProviders.length > 0 && onSwitchProvider) {
          actions.push({
            label: 'SWITCH PROVIDER',
            icon: <AlertCircle className="w-3 h-3" />,
            action: () => onSwitchProvider(availableProviders[0]),
            variant: 'secondary',
          });
        }
        break;

      case ProviderErrorType.AUTH:
        // Auth error: must check settings or switch provider
        if (onOpenSettings) {
          actions.push({
            label: 'CHECK API KEY',
            icon: <Settings className="w-3 h-3" />,
            action: onOpenSettings,
            variant: 'secondary',
          });
        }
        if (availableProviders.length > 0 && onSwitchProvider) {
          actions.push({
            label: 'SWITCH PROVIDER',
            icon: <AlertCircle className="w-3 h-3" />,
            action: () => onSwitchProvider(availableProviders[0]),
            variant: 'secondary',
          });
        }
        break;

      case ProviderErrorType.TIMEOUT:
        // Timeout: try different model or provider
        if (availableModels.length > 0 && onSwitchModel) {
          actions.push({
            label: 'TRY FASTER MODEL',
            icon: <Zap className="w-3 h-3" />,
            action: () => onSwitchModel(availableModels[0]),
            variant: 'secondary',
          });
        }
        if (availableProviders.length > 0 && onSwitchProvider) {
          actions.push({
            label: 'SWITCH PROVIDER',
            icon: <AlertCircle className="w-3 h-3" />,
            action: () => onSwitchProvider(availableProviders[0]),
            variant: 'secondary',
          });
        }
        break;

      case ProviderErrorType.NETWORK:
        // Network error: check settings or offline mode
        if (onOpenSettings) {
          actions.push({
            label: 'CHECK SETTINGS',
            icon: <Settings className="w-3 h-3" />,
            action: onOpenSettings,
            variant: 'secondary',
          });
        }
        if (availableProviders.includes('local')) {
          actions.push({
            label: 'TRY LOCAL',
            icon: <AlertCircle className="w-3 h-3" />,
            action: () => onSwitchProvider?.('local'),
            variant: 'secondary',
          });
        }
        break;

      case ProviderErrorType.PROVIDER_ERROR:
        // Provider error (5xx): try different provider
        if (availableProviders.length > 0 && onSwitchProvider) {
          actions.push({
            label: 'SWITCH PROVIDER',
            icon: <AlertCircle className="w-3 h-3" />,
            action: () => onSwitchProvider(availableProviders[0]),
            variant: 'secondary',
          });
        }
        if (onOpenSettings) {
          actions.push({
            label: 'HELP',
            icon: <Settings className="w-3 h-3" />,
            action: onOpenSettings,
            variant: 'secondary',
          });
        }
        break;

      case ProviderErrorType.MALFORMED:
        // Malformed request: only retry or check settings
        if (onOpenSettings) {
          actions.push({
            label: 'CHECK SETTINGS',
            icon: <Settings className="w-3 h-3" />,
            action: onOpenSettings,
            variant: 'secondary',
          });
        }
        break;

      case ProviderErrorType.UNKNOWN:
      default:
        // Unknown: switch provider or check settings
        if (availableProviders.length > 0 && onSwitchProvider) {
          actions.push({
            label: 'SWITCH PROVIDER',
            icon: <AlertCircle className="w-3 h-3" />,
            action: () => onSwitchProvider(availableProviders[0]),
            variant: 'secondary',
          });
        }
        if (onOpenSettings) {
          actions.push({
            label: 'SETTINGS',
            icon: <Settings className="w-3 h-3" />,
            action: onOpenSettings,
            variant: 'secondary',
          });
        }
        break;
    }

    return actions;
  };

  const actions = getActionButtonsForErrorType();

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="mt-3 flex flex-wrap gap-2"
    >
      {actions.map((action, idx) => (
        <Button
          key={idx}
          variant={action.variant}
          size="sm"
          onClick={action.action}
          className="gap-1.5 text-xs h-8 px-3"
        >
          {action.icon}
          {action.label}
        </Button>
      ))}
    </motion.div>
  );
};
