import { Router } from 'express';
import { db } from '../lib/firebase.js';
import { checkPermission } from '../middleware/auth.js';

const router: Router = Router();

router.get('/:classId', checkPermission('viewAttendance'), async (req, res, next) => {
  try {
    const { classId } = req.params;
    const snapshot = await db.collection('attendance')
      .where('classId', '==', classId)
      .get();
    res.json(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
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
      updatedAt: new Date().toISOString()
    });
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

export default router;
