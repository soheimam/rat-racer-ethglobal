/**
 * Professional Structured JSON Logger
 * 
 * Enforces uniform logging across all API routes and services.
 * Outputs structured JSON logs for easy parsing and monitoring.
 * 
 * Usage:
 * ```typescript
 * import { logger } from '@/lib/logger';
 * 
 * logger.info('User action', { userId: '123', action: 'login' });
 * logger.error('Failed to process', error, { context: 'payment' });
 * ```
 */

import { NextRequest } from 'next/server';

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  service: string;
  environment: string;
  requestId?: string;
  userId?: string;
  data?: Record<string, any>;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

class Logger {
  private service: string;
  private environment: string;
  private minLevel: LogLevel;

  constructor() {
    this.service = 'rat-racer-api';
    this.environment = process.env.NODE_ENV || 'development';
    this.minLevel = this.getMinLogLevel();
  }

  /**
   * Get minimum log level from environment
   */
  private getMinLogLevel(): LogLevel {
    const envLevel = process.env.LOG_LEVEL?.toLowerCase();
    switch (envLevel) {
      case 'debug':
        return LogLevel.DEBUG;
      case 'info':
        return LogLevel.INFO;
      case 'warn':
        return LogLevel.WARN;
      case 'error':
        return LogLevel.ERROR;
      default:
        return this.environment === 'production' ? LogLevel.INFO : LogLevel.DEBUG;
    }
  }

  /**
   * Check if log level should be output
   */
  private shouldLog(level: LogLevel): boolean {
    const levels = [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR];
    const minIndex = levels.indexOf(this.minLevel);
    const currentIndex = levels.indexOf(level);
    return currentIndex >= minIndex;
  }

  /**
   * Format and output log entry
   */
  private log(entry: LogEntry): void {
    if (!this.shouldLog(entry.level)) return;

    if (this.environment === 'production') {
      // Production: Output pure JSON for log aggregation
      console.log(JSON.stringify(entry));
    } else {
      // Development: Pretty print for readability
      const color = {
        [LogLevel.DEBUG]: '\x1b[36m', // Cyan
        [LogLevel.INFO]: '\x1b[32m',  // Green
        [LogLevel.WARN]: '\x1b[33m',  // Yellow
        [LogLevel.ERROR]: '\x1b[31m', // Red
      }[entry.level];

      const reset = '\x1b[0m';
      const timestamp = new Date(entry.timestamp).toLocaleTimeString();

      console.log(
        `${color}[${timestamp}] ${entry.level.toUpperCase()}${reset}`,
        `${entry.message}`
      );

      if (entry.data && Object.keys(entry.data).length > 0) {
        console.log('  Data:', JSON.stringify(entry.data, null, 2));
      }

      if (entry.error) {
        console.log('  Error:', entry.error.message);
        if (entry.error.stack) {
          console.log('  Stack:', entry.error.stack);
        }
      }
    }
  }

  /**
   * Create base log entry
   */
  private createEntry(
    level: LogLevel,
    message: string,
    data?: Record<string, any>,
    error?: Error
  ): LogEntry {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      service: this.service,
      environment: this.environment,
    };

    if (data) {
      entry.data = this.sanitizeData(data);
    }

    if (error) {
      entry.error = {
        name: error.name,
        message: error.message,
        stack: this.environment === 'production' ? undefined : error.stack,
      };
    }

    return entry;
  }

  /**
   * Sanitize data to remove sensitive information
   */
  private sanitizeData(data: Record<string, any>): Record<string, any> {
    const sanitized = { ...data };
    const sensitiveKeys = [
      'password',
      'privateKey',
      'apiKey',
      'secret',
      'token',
      'authorization',
    ];

    for (const key of Object.keys(sanitized)) {
      const lowerKey = key.toLowerCase();
      if (sensitiveKeys.some(sensitive => lowerKey.includes(sensitive))) {
        sanitized[key] = '[REDACTED]';
      }
    }

    return sanitized;
  }

  /**
   * Extract request metadata for logging
   */
  extractRequestMetadata(request: NextRequest): Record<string, any> {
    return {
      method: request.method,
      url: request.url,
      userAgent: request.headers.get('user-agent'),
      ip: request.headers.get('x-forwarded-for') || 
          request.headers.get('x-real-ip') || 
          'unknown',
      requestId: request.headers.get('x-request-id') || 
                 `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };
  }

  /**
   * Log debug message
   */
  debug(message: string, data?: Record<string, any>): void {
    this.log(this.createEntry(LogLevel.DEBUG, message, data));
  }

  /**
   * Log info message
   */
  info(message: string, data?: Record<string, any>): void {
    this.log(this.createEntry(LogLevel.INFO, message, data));
  }

  /**
   * Log warning message
   */
  warn(message: string, data?: Record<string, any>): void {
    this.log(this.createEntry(LogLevel.WARN, message, data));
  }

  /**
   * Log error message
   */
  error(message: string, error?: Error, data?: Record<string, any>): void {
    this.log(this.createEntry(LogLevel.ERROR, message, data, error));
  }

  /**
   * Create a child logger with additional context
   */
  child(context: Record<string, any>): ChildLogger {
    return new ChildLogger(this, context);
  }

  /**
   * Log webhook payload (for debugging)
   */
  logWebhookPayload(webhookName: string, payload: any): void {
    this.info(`[${webhookName}] Received webhook payload`, {
      webhook: webhookName,
      payloadKeys: Object.keys(payload),
      fullPayload: payload, // Log full payload for debugging
    });
  }

  /**
   * Log API route entry
   */
  logApiEntry(route: string, request: NextRequest): string {
    const metadata = this.extractRequestMetadata(request);
    this.info(`[${route}] API request received`, metadata);
    return metadata.requestId as string;
  }

  /**
   * Log API route exit
   */
  logApiExit(route: string, requestId: string, success: boolean, duration?: number): void {
    this.info(`[${route}] API request completed`, {
      requestId,
      success,
      durationMs: duration,
    });
  }

  /**
   * Log database operation
   */
  logDbOperation(operation: string, collection: string, data?: Record<string, any>): void {
    this.debug(`[DB] ${operation} on ${collection}`, data);
  }

  /**
   * Log contract interaction
   */
  logContractCall(
    contract: string,
    method: string,
    args?: any[],
    result?: any
  ): void {
    this.info(`[Contract] ${contract}.${method}()`, {
      contract,
      method,
      args,
      result,
    });
  }
}

/**
 * Child logger with persistent context
 */
class ChildLogger {
  constructor(
    private parent: Logger,
    private context: Record<string, any>
  ) {}

  private mergeContext(data?: Record<string, any>): Record<string, any> {
    return { ...this.context, ...data };
  }

  debug(message: string, data?: Record<string, any>): void {
    this.parent.debug(message, this.mergeContext(data));
  }

  info(message: string, data?: Record<string, any>): void {
    this.parent.info(message, this.mergeContext(data));
  }

  warn(message: string, data?: Record<string, any>): void {
    this.parent.warn(message, this.mergeContext(data));
  }

  error(message: string, error?: Error, data?: Record<string, any>): void {
    this.parent.error(message, error, this.mergeContext(data));
  }
}

// Export singleton instance
export const logger = new Logger();

// Export types
export type { LogEntry, ChildLogger };

