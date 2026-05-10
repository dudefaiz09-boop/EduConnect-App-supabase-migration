import { Request, Response, NextFunction } from 'express';
import { AiService } from './ai.service.js';

export class AiController {
  static async queryChatbot(req: Request, res: Response, next: NextFunction) {
    try {
      const { query } = req.body;
      const user = req.user;
      
      if (!user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      
      const response = await AiService.getChatbotResponse(user.uid, user.roles[0] || 'student', query);
      
      res.json({ success: true, response });
    } catch (error) {
      next(error);
    }
  }

  static async getPerformanceTips(req: Request, res: Response, next: NextFunction) {
    try {
      const { studentId, records } = req.body;
      const tips = await AiService.getPerformanceSuggestions(studentId, records);
      res.json({ success: true, tips });
    } catch (error) {
      next(error);
    }
  }
}
