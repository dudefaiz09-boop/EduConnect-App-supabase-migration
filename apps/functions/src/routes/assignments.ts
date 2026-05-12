import { Router } from 'express';
import { db } from '../lib/firebase.js';
import { checkPermission } from '../middleware/auth.js';
import { logger } from '@educonnect/logger';
import { ai, GEMINI_MODEL } from '../lib/ai.js';

const router: Router = Router();

// List assignments
router.get('/:classId?', async (req, res, next) => {
  try {
    const classId = req.params.classId || req.query.classId as string;
    let query: any = db.collection('assignments');
    
    if (classId) {
      query = query.where('targetClasses', 'array-contains', classId);
    }
    
    const snapshot = await query.get();
    res.json(snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() })));
  } catch (error) {
    next(error);
  }
});

// Create assignment
router.post(['/', '/create'], checkPermission('manageAssignments'), async (req, res, next) => {
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

// Submit assignment (Handle both /:id/submit and /submit with id in body)
router.post(['/:id/submit', '/submit'], async (req, res, next) => {
  try {
    const { content, assignmentId: bodyId } = req.body;
    const assignmentId = req.params.id || bodyId;
    const user = req.user;

    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    if (!assignmentId) return res.status(400).json({ error: 'assignmentId is required' });

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
