import { Router } from 'express';
import { db } from '../lib/firebase.js';
import { checkPermission } from '../middleware/auth.js';

const router: Router = Router();

router.get('/student/:uid', async (req, res, next) => {
  try {
    const snapshot = await db.collection('fees')
      .where('studentId', '==', req.params.uid)
      .get();
    res.json(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  } catch (error) {
    next(error);
  }
});

export default router;
