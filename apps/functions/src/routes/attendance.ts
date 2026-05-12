import { Router } from 'express';
import { db } from '../lib/firebase.js';
import { checkPermission } from '../middleware/auth.js';

const router: Router = Router();

router.get('/:classId?', checkPermission('viewAttendance'), async (req, res, next) => {
  try {
    const classId = req.params.classId || (req.query.classId as string);
    const date = req.query.date as string;

    if (!classId) {
      return res.status(400).json({ error: 'classId is required' });
    }

    let query: any = db.collection('attendance').where('classId', '==', classId);

    if (date) {
      query = query.where('date', '==', date);
    }

    const snapshot = await query.get();
    res.json(snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() })));
  } catch (error) {
    next(error);
  }
});

router.post('/mark', checkPermission('markAttendance'), async (req, res, next) => {
  try {
    const { classId, date, records } = req.body;
    const docId = `${classId}_${date}`;
    await db.collection('attendance').doc(docId).set({
      classId,
      date,
      records,
      updatedAt: new Date().toISOString(),
    });
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

export default router;
