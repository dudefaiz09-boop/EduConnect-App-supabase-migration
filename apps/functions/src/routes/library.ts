import { Router } from 'express';
import { db } from '../lib/documents.js';
import { checkPermission } from '../middleware/auth.js';
import { createNotification } from '../lib/notifications.js';
import { logger } from '@educonnect/logger';

const router: Router = Router();

type LibraryResource = {
  title: string;
  subject: string;
  grade: string;
  fileUrl: string;
  tags?: string[];
  tenantId?: string;
  schoolId?: string | null;
  availableCopies?: number;
  borrowedCount?: number;
};

type BorrowRecord = {
  resourceId: string;
  studentId: string;
  studentName: string;
  borrowedAt: string;
  status: 'borrowed' | 'returned';
  returnedAt?: string | null;
  tenantId?: string;
  schoolId?: string | null;
};

function hasLibraryAccess(user: NonNullable<Express.Request['user']>) {
  return user.isAdmin || user.permissions.manageLibrary || user.roles.includes('librarian');
}

function requireUser(req: Express.Request, res: Express.Response) {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized' });
    return null;
  }
  return req.user;
}

async function safeLibraryNotification(input: Parameters<typeof createNotification>[0]) {
  try {
    await createNotification(input);
  } catch (error) {
    logger.warn({ err: error, title: input.title }, 'Library notification could not be created');
  }
}

router.get('/borrow/history/:uid', async (req, res, next) => {
  try {
    const user = requireUser(req, res);
    if (!user) return;
    if (!hasLibraryAccess(user) && req.params.uid !== user.uid) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const snapshot = await db.collection('borrowRecords')
      .where('tenantId', '==', req.tenantId)
      .where('studentId', '==', req.params.uid)
      .get();
    res.json(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  } catch (error) {
    next(error);
  }
});

router.get('/resources', async (req, res, next) => {
  try {
    const snapshot = await db.collection('library')
      .where('tenantId', '==', req.tenantId)
      .get();
    res.json(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
  } catch (error) {
    next(error);
  }
});

router.get('/books', async (req, res, next) => {
  try {
    const snapshot = await db.collection('library')
      .where('tenantId', '==', req.tenantId)
      .get();
    res.json(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
  } catch (error) {
    next(error);
  }
});

router.post('/upload', checkPermission('manageLibrary'), async (req, res, next) => {
  try {
    const user = requireUser(req, res);
    if (!user) return;

    const title = String(req.body.title || '').trim();
    const subject = String(req.body.subject || '').trim();
    const grade = String(req.body.grade || '').trim();
    const fileUrl = String(req.body.fileUrl || '').trim();
    const tags = Array.isArray(req.body.tags) ? req.body.tags.map(String).filter(Boolean) : [];

    if (!title || !subject || !grade || !fileUrl) {
      return res.status(400).json({ error: 'title, subject, grade, and fileUrl are required' });
    }

    const now = new Date().toISOString();
    const resource: LibraryResource & Record<string, unknown> = {
      tenantId: req.tenantId,
      schoolId: user.schoolId,
      title,
      subject,
      grade,
      fileUrl,
      tags,
      availableCopies: Number(req.body.availableCopies || 1),
      borrowedCount: 0,
      uploadedBy: user.uid,
      uploadedAt: now,
      updatedAt: now,
    };

    const ref = await db.collection('library').add(resource);
    await safeLibraryNotification({
      title: `New library resource: ${title}`,
      message: `${subject} resource for grade ${grade} is now available.`,
      type: 'system',
      href: '/library',
      targetRoles: ['student', 'teacher'],
      schoolId: user.schoolId,
      tenantId: req.tenantId,
      actorId: user.uid,
      metadata: { resourceId: ref.id, subject, grade },
    });

    res.status(201).json({ id: ref.id, ...resource });
  } catch (error) {
    next(error);
  }
});

router.post('/borrow', async (req, res, next) => {
  try {
    const user = requireUser(req, res);
    if (!user) return;

    const resourceId = String(req.body.resourceId || '').trim();
    if (!resourceId) return res.status(400).json({ error: 'resourceId is required' });

    const resourceRef = db.collection('library').doc(resourceId);
    const resourceSnapshot = await resourceRef.get();
    if (!resourceSnapshot.exists) return res.status(404).json({ error: 'Resource not found' });

    const resource = resourceSnapshot.data() as LibraryResource;
    const activeBorrows = await db
      .collection('borrowRecords')
      .where('tenantId', '==', req.tenantId)
      .where('studentId', '==', user.uid)
      .where('resourceId', '==', resourceId)
      .where('status', '==', 'borrowed')
      .get();

    if (activeBorrows.docs.length > 0) {
      return res.status(409).json({ error: 'Resource is already borrowed by this user' });
    }

    const now = new Date().toISOString();
    const borrowRecord: BorrowRecord & Record<string, unknown> = {
      tenantId: req.tenantId,
      schoolId: user.schoolId,
      resourceId,
      studentId: user.uid,
      studentName: user.displayName || user.email || 'Student',
      borrowedAt: now,
      status: 'borrowed',
      returnedAt: null,
    };

    const recordRef = await db.collection('borrowRecords').add(borrowRecord);
    await resourceRef.update({
      borrowedCount: Number(resource.borrowedCount || 0) + 1,
      updatedAt: now,
    });

    await safeLibraryNotification({
      title: 'Library resource borrowed',
      message: `${resource.title || 'A resource'} was added to your library history.`,
      type: 'system',
      href: '/library',
      targetUserIds: [user.uid],
      schoolId: user.schoolId,
      tenantId: req.tenantId,
      actorId: user.uid,
      metadata: { resourceId, borrowRecordId: recordRef.id },
    });

    res.status(201).json({ id: recordRef.id, ...borrowRecord });
  } catch (error) {
    next(error);
  }
});

router.post('/return', async (req, res, next) => {
  try {
    const user = requireUser(req, res);
    if (!user) return;

    const recordId = String(req.body.recordId || '').trim();
    if (!recordId) return res.status(400).json({ error: 'recordId is required' });

    const recordRef = db.collection('borrowRecords').doc(recordId);
    const recordSnapshot = await recordRef.get();
    if (!recordSnapshot.exists) return res.status(404).json({ error: 'Borrow record not found' });

    const record = recordSnapshot.data() as BorrowRecord;
    if (!hasLibraryAccess(user) && record.studentId !== user.uid) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    if (record.status === 'returned') {
      return res.json({ success: true, id: recordId, status: 'returned' });
    }

    const now = new Date().toISOString();
    await recordRef.update({ status: 'returned', returnedAt: now, updatedAt: now, updatedBy: user.uid });

    const resourceRef = db.collection('library').doc(record.resourceId);
    const resourceSnapshot = await resourceRef.get();
    const resource = resourceSnapshot.exists ? (resourceSnapshot.data() as LibraryResource) : null;
    if (resource) {
      await resourceRef.update({
        borrowedCount: Math.max(Number(resource.borrowedCount || 1) - 1, 0),
        updatedAt: now,
      });
    }

    await safeLibraryNotification({
      title: 'Library resource returned',
      message: `${resource?.title || 'Your borrowed resource'} was marked as returned.`,
      type: 'system',
      href: '/library',
      targetUserIds: [record.studentId],
      schoolId: user.schoolId,
      tenantId: req.tenantId,
      actorId: user.uid,
      metadata: { resourceId: record.resourceId, borrowRecordId: recordId },
    });

    res.json({ success: true, id: recordId, status: 'returned' });
  } catch (error) {
    next(error);
  }
});

export default router;
