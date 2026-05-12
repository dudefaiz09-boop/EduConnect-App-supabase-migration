import { logger, LogContext } from './index.js';

/**
 * INCIDENT & DEPLOYMENT MONITORING
 * Provides high-level visibility into system health.
 */
export class Monitoring {
  /**
   * Reports critical errors to observability platform (e.g. Sentry)
   */
  static reportError(err: Error, context?: LogContext) {
    logger.error('CRITICAL_EXCEPTION', err, {
      ...context,
      monitoring: true,
    });

    // Placeholder for Sentry/DataDog integration
    // Sentry.captureException(err, { extra: context });
  }

  /**
   * Tracks deployment lifecycle events
   */
  static trackDeployment(version: string, environment: string) {
    logger.info('DEPLOYMENT_EVENT', {
      version,
      environment,
      metricType: 'deployment',
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Tracks active system incidents
   */
  static trackIncident(id: string, severity: 'critical' | 'major' | 'minor', description: string) {
    logger.warn('SYSTEM_INCIDENT', {
      incidentId: id,
      severity,
      description,
      metricType: 'incident',
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Health Check utility
   */
  static healthCheck(): Record<string, any> {
    return {
      status: 'healthy',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      memoryUsage: process.memoryUsage(),
    };
  }
}
