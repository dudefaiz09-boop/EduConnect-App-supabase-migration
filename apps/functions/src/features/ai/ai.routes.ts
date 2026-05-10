import { Router } from 'express';
import { AiController } from './ai.controller';
import { validate } from '../../middleware/validate';
import { chatbotQuerySchema, aiSuggestionSchema } from './ai.validation';

const router = Router();

router.post('/query', validate(chatbotQuerySchema), AiController.queryChatbot);
router.post('/suggestions', validate(aiSuggestionSchema), AiController.getPerformanceTips);

export default router;
