import { Router } from 'express';
import { db } from '../lib/firebase.js';
import { checkPermission } from '../middleware/auth.js';
import { logger } from '@educonnect/logger';
import { ai, GEMINI_MODEL } from '../lib/ai.js';

const router: Router = Router();

// List assignments
router.get('/', async (req, res, next) => {
  try {
    const snapshot = await db.collection('assignments').get();
    res.json(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  } catch (error) {
    next(error);
  }
});

// Create assignment
router.post('/', checkPermission('manageAssignments'), async (req, res, next) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    const assignment = {
      ...req.body,
      createdBy: req.user.uid,
      createdAt: new Date().toISOString()
    };
    const docRef = await db.collection('assignments').add(assignment);
    res.json({ id: docRef.id, ...assignment });
  } catch (error) {
    next(error);
  }
});

// Grade with AI
router.post('/:id/grade', checkPermission('manageAssignments'), async (req, res, next) => {
  try {
    const { submission } = req.body;
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    const promptText = `Grade this student submission: ${submission}. Provide score (0-10) and feedback.`;
    
    const result = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: [{ role: 'user', parts: [{ text: promptText }] }]
    });

    const responseText = result.text || '';
    const aiResult = JSON.parse(responseText.replace(/```json|```/g, "").trim() || '{}');

    await db.collection('submissions').add({
      assignmentId: req.params.id,
      gradedBy: req.user.uid,
      aiResult,
      timestamp: new Date().toISOString()
    });

    res.json(aiResult);
  } catch (error) {
    next(error);
  }
});

// Submit assignment
router.post('/:id/submit', async (req, res, next) => {
  try {
    const { content } = req.body;
    const assignmentId = req.params.id;
    const user = req.user;

    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const docId = `${assignmentId}_${user.uid}`;
    const submissionRef = db.collection('submissions').doc(docId);

    const submissionData = {
      assignmentId,
      studentId: user.uid,
      studentName: user.displayName || 'Student',
      content,
      status: 'submitted',
      submittedAt: new Date().toISOString(),
    };

    await submissionRef.set(submissionData);

    // Trigger AI Grading
    try {
      const prompt = `Grade this student submission: ${content}. Respond in JSON: { "score": number, "feedback": "string" }`;
      const result = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: [{ role: 'user', parts: [{ text: prompt }] }]
      });
      
      const responseText = result.text || '';
      const aiResult = JSON.parse(responseText.replace(/```json|```/g, "").trim() || '{}');
      await submissionRef.update({
        aiGrade: aiResult,
        status: 'graded'
      });
    } catch (aiError) {
      logger.error({ err: aiError, uid: user.uid }, 'AI evaluation failed');
    }

    res.json({ success: true, id: docId });
  } catch (error) {
    next(error);
  }
});

export default router;
