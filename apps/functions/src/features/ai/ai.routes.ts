import { Router } from 'express';
import { AiController } from './ai.controller.js';
import { validate } from '../../middleware/validate.js';
import { chatbotQuerySchema, aiSuggestionSchema } from './ai.validation.js';

const router: Router = Router();

router.post('/query', validate(chatbotQuerySchema), AiController.queryChatbot);
router.post('/suggestions', validate(aiSuggestionSchema), AiController.getPerformanceTips);

export default router;
