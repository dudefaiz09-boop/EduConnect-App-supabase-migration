import { Request, Response, NextFunction } from 'express';
import { logger } from '@educonnect/logger';
import { AiService } from './ai.service.js';
import { AiContextService } from './ai-context.service.js';
import { getAiRuntimeStatus } from '../../lib/ai.js';

function isAiUnavailable() {
  const status = getAiRuntimeStatus() as { enabled: boolean; configuredProvider?: string };
  return !status.enabled && status.configuredProvider !== 'offline';
}

function sendAiUnavailable(res: Response) {
  const status = getAiRuntimeStatus();

  return res.status(503).json({
    error: 'AI_NOT_CONFIGURED',
    message:
      'AI assistant is unavailable because no AI provider API key is configured. Set OPENROUTER_API_KEY or GEMINI_API_KEY on the API server, or set AI_PROVIDER=offline only for deterministic offline demos.',
    status,
  });
}

function handleAiError(error: unknown, res: Response, next: NextFunction) {
  const errRecord = error && typeof error === 'object' ? error as Record<string, unknown> : {};
  if (errRecord.status === 502 || (typeof errRecord.message === 'string' && errRecord.message.includes('AI provider'))) {
    return res.status(502).json({
      error: 'AI_PROVIDER_ERROR',
      message: 'AI provider request failed',
      details: errRecord.message,
    });
  }

  next(error);
}

export class AiController {
  static async getStatus(req: Request, res: Response, next: NextFunction) {
    try {
      res.json(getAiRuntimeStatus());
    } catch (error) {
      next(error);
    }
  }

  static async publicQueryChatbot(req: Request, res: Response, next: NextFunction) {
    try {
      if (isAiUnavailable()) {
        return sendAiUnavailable(res);
      }

      const { query, mode } = req.body || {};
      const tenantId = req.tenantId || (req.headers['x-school-id'] as string | undefined);
      if (!tenantId) {
        logger.warn({}, '[AI] Missing tenant header (x-school-id) for public query');
        return res.status(400).json({
          error: 'Tenant Context Required',
          message: 'x-school-id header is required for AI chat.',
        });
      }

      if (typeof query !== 'string' || query.trim().length === 0 || query.length > 2000) {
        logger.warn({ queryLength: query?.length, mode }, '[AI] Validation failure');
        return res.status(400).json({
          error: 'Invalid AI query',
          message: 'query must be a non-empty string under 2000 characters.',
        });
      }

      const { id, response } = await AiService.getChatbotResponse(
        `tenant:${tenantId}:ai-user`,
        'student',
        query.trim(),
        mode
      );

      res.json({ success: true, id, response, timestamp: new Date().toISOString() });
    } catch (error: unknown) {
      return handleAiError(error, res, next);
    }
  }

  static async queryChatbot(req: Request, res: Response, next: NextFunction) {
    try {
      if (isAiUnavailable()) {
        return sendAiUnavailable(res);
      }

      const { query, mode } = req.body;
      const user = req.user;

      if (!user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const userId = user.uid;
      const role = user.role || user.roles?.[0] || 'student';

      const { id, response } = await AiService.getChatbotResponse(userId, role, query, mode);

      res.json({ success: true, id, response, timestamp: new Date().toISOString() });
    } catch (error: unknown) {
      return handleAiError(error, res, next);
    }
  }

  static async contextQueryChatbot(req: Request, res: Response, next: NextFunction) {
    try {
      if (isAiUnavailable()) {
        return sendAiUnavailable(res);
      }

      const { query, mode, modules: requestedModules } = req.body;

      // 1. Resolve user context
      const userContext = await AiContextService.resolveAiUserContext(req);

      // 2. Infer modules and prepare query
      const inferred = AiContextService.inferModulesFromQuery(query);
      const finalModules = Array.from(new Set([...inferred, ...(requestedModules || [])]));

      // 3. Fetch data context
      const context = await AiContextService.getModuleContext(userContext, finalModules as any);

      // 4. Generate AI response
      const { id, response } = await AiService.getChatbotResponse(
        userContext.uid,
        userContext.role || 'student',
        query,
        mode,
        context
      );

      res.json({ success: true, id, response, timestamp: new Date().toISOString() });
    } catch (error: unknown) {
      return handleAiError(error, res, next);
    }
  }

  static async getPerformanceTips(req: Request, res: Response, next: NextFunction) {
    try {
      if (isAiUnavailable()) {
        return sendAiUnavailable(res);
      }

      const { studentId, records } = req.body;
      const tips = await AiService.getPerformanceSuggestions(studentId, records);
      res.json({ success: true, tips });
    } catch (error) {
      next(error);
    }
  }

  static async getHistory(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.params.userId;
      const user = req.user;
      const canReadHistory =
        user?.uid === userId ||
        user?.isAdmin ||
        user?.isSuperAdmin ||
        user?.roles?.includes('admin') ||
        user?.roles?.includes('principal');

      if (!canReadHistory) {
        return res.status(403).json({
          error: 'AI_HISTORY_FORBIDDEN',
          message: 'You can only read your own AI chat history.',
        });
      }

      const history = await AiService.getHistory(userId);
      res.json(history);
    } catch (error) {
      next(error);
    }
  }

  static async saveFeedback(req: Request, res: Response, next: NextFunction) {
    try {
      const { logId, feedback } = req.body;
      if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      await AiService.saveFeedback(logId, feedback, req.user);
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  }
}
