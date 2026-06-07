import 'dotenv/config';
import { logger } from '@educonnect/logger';
import { getConfig } from './lib/config.js';
import app from './app.js';

process.on('unhandledRejection', (reason) => {
  logger.error({ err: reason }, 'UNHANDLED_REJECTION — process exiting');
  process.exit(1);
});

process.on('uncaughtException', (err) => {
  logger.fatal({ err }, 'UNCAUGHT_EXCEPTION — process exiting');
  process.exit(1);
});

const env = getConfig();
const PORT = env.PORT || 3000;

async function startServer() {
  const server = app.listen(PORT, '0.0.0.0', () => {
    logger.info({ env: env.NODE_ENV, port: PORT }, 'Server running');
  });

  const shutdown = (signal: string) => {
    logger.info({ signal }, 'Shutting down gracefully');
    server.close(() => {
      logger.info({ signal }, 'Server closed');
      process.exit(0);
    });
    setTimeout(() => {
      logger.error({ signal }, 'Forced shutdown after timeout');
      process.exit(1);
    }, 10_000).unref();
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

if (process.env.NODE_ENV !== 'test') {
  startServer();
}

export { app };
