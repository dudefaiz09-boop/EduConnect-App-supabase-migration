import { Router } from 'express';
import { db } from '../lib/firebase.js';
import { ai, GEMINI_MODEL } from '../lib/ai.js';
import { FieldValue } from 'firebase-admin/firestore';

const router: Router = Router();

router.post('/query', async (req, res, next) => {
  try {
    const { query, userId, role } = req.body;

    const promptText = `Role: ${role}. Query: ${query}`;
    
    const result = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: [{ role: 'user', parts: [{ text: promptText }] }]
    });

    const responseText = result.text;
    
    const logRef = await db.collection('chatbotLogs').add({
      userId, role, query, response: responseText, timestamp: FieldValue.serverTimestamp()
    });

    res.json({ id: logRef.id, response: responseText, timestamp: new Date().toISOString() });
  } catch (error) {
    next(error);
  }
});

export default router;
