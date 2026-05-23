export type QaRoute = {
  name: string;
  path: string;
  authRequired?: boolean;
};

export const publicRoutes: QaRoute[] = [
  { name: 'login', path: '/auth/login' },
  { name: 'register', path: '/auth/register' },
  { name: 'forgot-password', path: '/auth/forgot-password' },
];

export const protectedRoutes: QaRoute[] = [
  { name: 'dashboard', path: '/', authRequired: true },
  { name: 'announcements', path: '/announcements', authRequired: true },
  { name: 'attendance', path: '/attendance', authRequired: true },
  { name: 'assignments', path: '/assignments', authRequired: true },
  { name: 'chat', path: '/chat', authRequired: true },
  { name: 'library', path: '/library', authRequired: true },
  { name: 'fees', path: '/fees', authRequired: true },
  { name: 'performance', path: '/performance', authRequired: true },
  { name: 'students', path: '/students', authRequired: true },
  { name: 'teachers', path: '/teachers', authRequired: true },
];

export const smokeRoutes: QaRoute[] = publicRoutes.concat(protectedRoutes);
export const screenshotRoutes: QaRoute[] = publicRoutes.concat(protectedRoutes);
