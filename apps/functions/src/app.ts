import express from 'express';
import compression from 'compression';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { pinoHttp } from 'pino-http';
import { logger } from '@educonnect/logger';

// Middleware
import { authMiddleware } from './middleware/auth';
import { globalErrorHandler } from './middleware/error';

// Features (Refactored)
import studentRoutes from './features/students/student.routes';
import aiRoutes from './features/ai/ai.routes';

// Legacy Routes (Pending Refactor)
import announcementsRouter from './routes/announcements';
import attendanceRouter from './routes/attendance';
import assignmentsRouter from './routes/assignments';
import libraryRouter from './routes/library';
import feesRouter from './routes/fees';
import performanceRouter from './routes/performance';
import teachersRouter from './routes/teachers';
import chatRouter from './routes/chat';

const app = express();
app.set('trust proxy', 1);

// 1. Security & Observability
app.use(pinoHttp({ logger }));
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://apis.google.com", "https://*.googleapis.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://*.googleapis.com"],
      imgSrc: ["'self'", "data:", "https://*.googleusercontent.com", "https://*.googleapis.com", "https://*.firebase.com"],
      connectSrc: ["'self'", "https://*.googleapis.com", "https://*.firebaseio.com", "https://*.cloudfunctions.net", "https://*.firebase.com", "wss://*.firebaseio.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "https://*.gstatic.com"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
}));

app.use(compression());
app.use(express.json());

// 2. Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  message: { error: 'Too many requests' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// 3. Authentication
app.use(authMiddleware);

// 4. Feature Routes
app.use('/api/students', studentRoutes);
app.use('/api/ai', aiRoutes);

// 5. Legacy Routes
app.use('/api/announcements', announcementsRouter);
app.use('/api/attendance', attendanceRouter);
app.use('/api/assignments', assignmentsRouter);
app.use('/api/library', libraryRouter);
app.use('/api/fees', feesRouter);
app.use('/api/performance', performanceRouter);
app.use('/api/teachers', teachersRouter);
app.use('/api/chat', chatRouter);

// Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 6. Global Error Handling
app.use(globalErrorHandler);

export default app;
