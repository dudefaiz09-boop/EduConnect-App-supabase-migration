import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import admin from 'firebase-admin';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const firebaseConfig = JSON.parse(fs.readFileSync(path.join(__dirname, 'firebase-applet-config.json'), 'utf8'));

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: firebaseConfig.projectId,
  });
}

const db = admin.firestore();

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3000;

  app.use(express.json());

  // API Middleware for auth and permissions
  app.use(async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const idToken = authHeader.split('Bearer ')[1];
      try {
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        (req as any).user = {
          uid: decodedToken.uid,
          roles: decodedToken.roles || [],
          isAdmin: decodedToken.isAdmin || false,
          permissions: decodedToken.permissions || {}
        };
      } catch (error) {
        console.error('Error verifying token:', error);
      }
    }
    next();
  });

  // Permission Check Helper
  const checkPermission = (perm: string) => (req: any, res: any, next: any) => {
    const user = req.user;
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    if (user.isAdmin && user.permissions[perm]) return next();
    res.status(403).json({ error: 'Forbidden: Missing permission ' + perm });
  };

  // Example API route: Set User Permissions (Financial Admin only)
  app.post('/api/roles', checkPermission('financialOps'), async (req, res) => {
    const { uid, roles, isAdmin, permissions } = req.body;
    try {
      await admin.auth().setCustomUserClaims(uid, { roles, isAdmin, permissions });
      await admin.firestore().collection('users').doc(uid).update({ roles, isAdmin, permissions });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', project: firebaseConfig.projectId });
  });

  // Vite integration
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
