import { Router } from 'express';
import { db } from '../lib/firebase.js';
import { checkPermission } from '../middleware/auth.js';

const router: Router = Router();

// Get all announcements
router.get('/', async (req, res, next) => {
  try {
    const snapshot = await db.collection('announcements')
      .orderBy('timestamp', 'desc')
      .get();
    
    const announcements = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(announcements);
  } catch (error) {
    next(error);
  }
});

// Create announcement (Admin/Teacher only)
router.post('/', checkPermission('manageAnnouncements'), async (req, res, next) => {
  try {
    const { title, content, targetRoles } = req.body;
    
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const announcement = {
      title,
      content,
      targetRoles,
      authorId: req.user.uid,
      authorName: req.user.displayName || 'Staff',
      timestamp: new Date().toISOString()
    };

    const docRef = await db.collection('announcements').add(announcement);
    res.json({ id: docRef.id, ...announcement });
  } catch (error) {
    next(error);
  }
});

export default router;
