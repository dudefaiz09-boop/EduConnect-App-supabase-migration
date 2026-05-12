import pino from 'pino';

/**
 * STRUCTURED LOGGING FOR ENTERPRISE OBSERVABILITY
 * - GCP-aligned severity levels
 * - Child loggers for request/tenant tracing
 * - Standardized error reporting
 */

export interface LogContext {
  userId?: string;
  requestId?: string;
  tenantId?: string;
  classId?: string;
  path?: string;
  method?: string;
  [key: string]: any;
}

const baseLogger = pino({
  level: process.env.LOG_LEVEL || 'info',
  formatters: {
    level: (label) => {
      return { severity: label.toUpperCase() }; // Align with Cloud Logging
    },
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});

export const logger = {
  info: (msg: string, context?: LogContext) => baseLogger.info(context || {}, msg),
  error: (msg: string, err?: Error | unknown, context?: LogContext) => {
    const errorData =
      err instanceof Error
        ? {
            message: err.message,
            stack: err.stack,
            name: err.name,
          }
        : { err };
    baseLogger.error({ ...context, ...errorData }, msg);
  },
  warn: (msg: string, context?: LogContext) => baseLogger.warn(context || {}, msg),
  debug: (msg: string, context?: LogContext) => baseLogger.debug(context || {}, msg),

  /**
   * Creates a contextual child logger (e.g., for a specific request or tenant)
   */
  withContext: (context: LogContext) => baseLogger.child(context),
};

/**
 * TELEMETRY HELPERS
 */
export const telemetry = {
  trackPerformance: (name: string, durationMs: number, context?: LogContext) => {
    logger.info(`Performance Metric: ${name}`, {
      ...context,
      metricType: 'performance',
      metricName: name,
      durationMs,
    });
  },

  trackBusinessEvent: (name: string, context?: LogContext) => {
    logger.info(`Business Event: ${name}`, {
      ...context,
      metricType: 'business_event',
      eventName: name,
    });
  },
};

export * from './monitoring.js';
