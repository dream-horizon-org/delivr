/**
 * Structured Logger Utility
 *
 * Provides consistent logging across the application with:
 * - Log levels (debug, info, warn, error)
 * - Structured context data
 * - Timestamps
 * - Consistent format
 *
 * Usage:
 *   import { logger } from '~utils/logger.utils';
 *   logger.info('Operation completed', { releaseId, count: 5 });
 *   logger.error('Operation failed', { error: message, taskId });
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

type LogContext = Record<string, unknown>;

type LogEntry = {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: LogContext;
};

/**
 * Format log entry for output.
 * In development: readable format
 * In production: JSON for parsing
 */
const formatLogEntry = (entry: LogEntry): string => {
  const isProduction = process.env.NODE_ENV === 'prod';

  if (isProduction) {
    // JSON format for production (easier to parse in log aggregators)
    return JSON.stringify(entry);
  }

  // Human-readable format for development
  const contextStr = entry.context
    ? ` ${JSON.stringify(entry.context)}`
    : '';
  return `[${entry.timestamp}] [${entry.level.toUpperCase()}] ${entry.message}${contextStr}`;
};

/**
 * Get current timestamp in ISO format
 */
const getTimestamp = (): string => {
  return new Date().toISOString();
};

/**
 * Create a log entry and output it
 */
const log = (level: LogLevel, message: string, context?: LogContext): void => {
  const entry: LogEntry = {
    timestamp: getTimestamp(),
    level,
    message,
    context
  };

  const formatted = formatLogEntry(entry);

  switch (level) {
    case 'debug':
      console.debug(formatted);
      break;
    case 'info':
      console.info(formatted);
      break;
    case 'warn':
      console.warn(formatted);
      break;
    case 'error':
      console.error(formatted);
      break;
  }
};

/**
 * Logger instance with level-specific methods
 */
export const logger = {
  /**
   * Debug level - for detailed debugging information
   * Only shown when DEBUG=true or LOG_LEVEL=debug
   */
  debug: (message: string, context?: LogContext): void => {
    const debugEnabled = process.env.DEBUG === 'true' || process.env.LOG_LEVEL === 'debug';
    if (debugEnabled) {
      log('debug', message, context);
    }
  },

  /**
   * Info level - for general operational information
   */
  info: (message: string, context?: LogContext): void => {
    log('info', message, context);
  },

  /**
   * Warn level - for warnings that don't stop operation but should be noted
   */
  warn: (message: string, context?: LogContext): void => {
    log('warn', message, context);
  },

  /**
   * Error level - for errors that need attention
   */
  error: (message: string, context?: LogContext): void => {
    log('error', message, context);
  }
};

/**
 * Create a scoped logger with a prefix (useful for modules)
 *
 * Usage:
 *   const log = createScopedLogger('WorkflowPolling');
 *   log.info('Poll completed', { releaseId });
 *   // Output: [WorkflowPolling] Poll completed { releaseId: '...' }
 */
export const createScopedLogger = (scope: string) => ({
  debug: (message: string, context?: LogContext): void => {
    logger.debug(`[${scope}] ${message}`, context);
  },
  info: (message: string, context?: LogContext): void => {
    logger.info(`[${scope}] ${message}`, context);
  },
  warn: (message: string, context?: LogContext): void => {
    logger.warn(`[${scope}] ${message}`, context);
  },
  error: (message: string, context?: LogContext): void => {
    logger.error(`[${scope}] ${message}`, context);
  }
});

