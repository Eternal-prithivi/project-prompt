/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Structured Logging Utility
 * Provides contextual, provider-aware logging for observability
 */

export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
}

export interface LogEntry {
  timestamp: number;
  level: LogLevel;
  event: string;
  provider?: string;
  data?: Record<string, any>;
  message?: string;
}

export class StructuredLogger {
  private logs: LogEntry[] = [];
  private maxLogs = 1000; // Keep last 1000 logs in memory
  private enabled = true;

  /**
   * Log an event with context
   */
  log(
    level: LogLevel,
    event: string,
    opts: {
      provider?: string;
      method?: string;
      model?: string;
      data?: Record<string, any>;
      message?: string;
    } = {}
  ): void {
    if (!this.enabled) return;

    const entry: LogEntry = {
      timestamp: Date.now(),
      level,
      event,
      provider: opts.provider,
      data: opts.data ? { ...opts.data, method: opts.method, model: opts.model } : (opts.method || opts.model ? { method: opts.method, model: opts.model } : undefined),
      message: opts.message,
    };

    this.logs.push(entry);

    // Keep only last N logs
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // Log to console in development
    if (process.env.NODE_ENV !== 'production') {
      const timestamp = new Date(entry.timestamp).toISOString();
      const prefix = `[${timestamp}] ${entry.level}`;
      const providerStr = entry.provider ? ` [${entry.provider}]` : '';
      const msg = `${prefix}${providerStr} ${entry.event}`;

      if (entry.data || entry.message) {
        const details = entry.data || { message: entry.message };
        console.log(msg, details);
      } else {
        console.log(msg);
      }
    }
  }

  info(event: string, opts?: { provider?: string; method?: string; model?: string; data?: Record<string, any> }): void {
    this.log(LogLevel.INFO, event, opts);
  }

  debug(event: string, opts?: { provider?: string; method?: string; model?: string; data?: Record<string, any> }): void {
    this.log(LogLevel.DEBUG, event, opts);
  }

  warn(event: string, opts?: { provider?: string; method?: string; model?: string; data?: Record<string, any> }): void {
    this.log(LogLevel.WARN, event, opts);
  }

  error(event: string, opts?: { provider?: string; method?: string; model?: string; message?: string; data?: Record<string, any> }): void {
    this.log(LogLevel.ERROR, event, opts);
  }

  /**
   * Get all logs (for UI inspection or debug)
   */
  getLogs(filters?: { provider?: string; level?: LogLevel; since?: number }): LogEntry[] {
    let result = this.logs;

    if (filters?.provider) {
      result = result.filter((log) => log.provider === filters.provider);
    }

    if (filters?.level) {
      result = result.filter((log) => log.level === filters.level);
    }

    if (filters?.since) {
      result = result.filter((log) => log.timestamp >= filters.since);
    }

    return result;
  }

  /**
   * Get provider's recent errors
   */
  getProviderErrors(provider: string, limit = 10): LogEntry[] {
    return this.getLogs({ provider, level: LogLevel.ERROR }).slice(-limit);
  }

  /**
   * Clear all logs
   */
  clear(): void {
    this.logs = [];
  }

  /**
   * Enable/disable logging
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * Export logs as JSON (for debugging/reporting)
   */
  export(): string {
    return JSON.stringify(this.logs, null, 2);
  }
}

// Global logger instance
export const logger = new StructuredLogger();
