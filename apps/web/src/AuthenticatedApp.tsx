import React, { Suspense, lazy, useState } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Calendar,
  MessageSquare,
  Bell,
  Library,
  BookOpen,
  CreditCard,
  BarChart3,
  LogOut,
  Menu,
  GraduationCap,
  Baby,
  Shield,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';
import { ModuleGuard } from './components/ModuleGuard';
import { ModuleErrorBoundary } from './components/ModuleErrorBoundary';
import { canAccessModule, type ModuleKey } from '@educonnect/shared';
import { CommandPalette } from './components/saas/CommandPalette';
import { NotificationDropdown } from './components/saas/NotificationDropdown';
import { ThemeToggle } from './components/saas/ThemeToggle';
import { GlobalChatbot } from './components/saas/GlobalChatbot';
import { ProfileModal } from './components/saas/ProfileModal';
import { LoadingSpinner } from './components/ui/LoadingSpinner';
import { useAuth } from './contexts/AuthContext';

const DashboardPage = lazy(() =>
  import('./pages/Dashboard').then((m) => ({ default: m.DashboardPage }))
);
const AnnouncementsPage = lazy(() =>
  import('./pages/Announcements').then((m) => ({ default: m.AnnouncementsPage }))
);
const AttendancePage = lazy(() =>
  import('./pages/Attendance').then((m) => ({ default: m.AttendancePage }))
);
const UsersPage = lazy(() => import('./pages/Users').then((m) => ({ default: m.UsersPage })));
const StudentsPage = lazy(() =>
  import('./pages/Students').then((m) => ({ default: m.StudentsPage }))
);
const TeachersPage = lazy(() =>
  import('./pages/Teachers').then((m) => ({ default: m.TeachersPage }))
);
const AssignmentsPage = lazy(() =>
  import('./pages/Assignments').then((m) => ({ default: m.AssignmentsPage }))
);
const ChatPage = lazy(() => import('./pages/Chat').then((m) => ({ default: m.ChatPage })));
const LibraryPage = lazy(() => import('./pages/Library').then((m) => ({ default: m.LibraryPage })));
const FeesPage = lazy(() => import('./pages/Fees').then((m) => ({ default: m.FeesPage })));
const PerformancePage = lazy(() =>
  import('./pages/Performance').then((m) => ({ default: m.PerformancePage }))
);
const ParentPortal = lazy(() =>
  import('./pages/ParentPortal').then((m) => ({ default: m.ParentPortal }))
);

const NotFoundPage = () => (
  <div className="flex min-h-[60vh] items-center justify-center p-6">
    <div className="max-w-md text-center">
      <h1 className="text-4xl font-black text-slate-950 dark:text-white">404</h1>
      <p className="mt-2 text-sm font-semibold text-slate-500 dark:text-slate-400">
        This EduConnect module or page does not exist.
      </p>
      <Link
        to="/"
        className="mt-6 inline-flex rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white hover:bg-blue-700"
      >
        Go to dashboard
      </Link>
    </div>
  </div>
);

const SidebarLink = ({
  to,
  icon: Icon,
  label,
  active,
  onNavigate,
}: {
  to: string;
  icon: React.ElementType;
  label: string;
  active: boolean;
  onNavigate?: () => void;
}) => (
  <Link
    to={to}
    onClick={onNavigate}
    className={cn(
      'flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200',
      active
        ? 'bg-blue-600 text-white shadow-lg shadow-blue-200'
        : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
    )}
  >
    <Icon size={20} className="shrink-0" />
    <span className="font-medium truncate">{label}</span>
  </Link>
);

const Layout = ({ children }: { children: React.ReactNode }) => {
  const { user, role, assignedModules, signOut } = useAuth();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  const menuItems: Array<{
    to: string;
    icon: React.ElementType;
    label: string;
    module: ModuleKey;
  }> = [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard', module: 'dashboard' },
    { to: '/announcements', icon: Bell, label: 'Announcements', module: 'announcements' },
    { to: '/attendance', icon: Calendar, label: 'Attendance', module: 'attendance' },
    { to: '/assignments', icon: BookOpen, label: 'Assignments', module: 'assignments' },
    { to: '/chat', icon: MessageSquare, label: 'Chat', module: 'chat' },
    { to: '/library', icon: Library, label: 'Library', module: 'library' },
    { to: '/fees', icon: CreditCard, label: 'Fees', module: 'fees' },
    { to: '/performance', icon: BarChart3, label: 'Performance', module: 'performance' },
    { to: '/parent-portal', icon: Baby, label: 'Parent Portal', module: 'parentPortal' },
    { to: '/students', icon: Users, label: 'Students', module: 'students' },
    { to: '/teachers', icon: GraduationCap, label: 'Teachers', module: 'teachers' },
    { to: '/all-users', icon: Shield, label: 'All Users', module: 'allUsers' },
  ];

  const handleLogout = async () => {
    setIsSigningOut(true);
    try {
      await signOut();
    } finally {
      setIsSigningOut(false);
    }
  };

  return (
    <div className="flex min-h-screen max-w-full overflow-x-hidden bg-[#f8fafc] text-slate-950 dark:bg-slate-950 dark:text-slate-100">
      <CommandPalette />
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      <aside
        className={cn(
          'fixed inset-y-0 left-0 w-72 bg-white/85 border-r border-white/80 z-40 transform lg:translate-x-0 lg:static transition-transform duration-300 ease-in-out px-4 py-6 shadow-2xl shadow-slate-200/50 backdrop-blur-xl dark:bg-slate-950/90 dark:border-slate-800 dark:shadow-none',
          'flex flex-col',
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex items-center gap-3 px-4 mb-8 shrink-0">
          <div className="w-11 h-11 bg-gradient-to-br from-blue-600 via-violet-600 to-cyan-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-200">
            <GraduationCap size={24} />
          </div>
          <div>
            <span className="block text-xl font-black text-slate-950 tracking-tight dark:text-white">
              EduConnect
            </span>
            <span className="text-[10px] font-black uppercase tracking-[0.18em] text-blue-600">
              AI ERP
            </span>
          </div>
        </div>

        <nav className="space-y-1 flex-1 overflow-y-auto pr-1">
          {menuItems
            .filter((item) => role && canAccessModule(role, item.module, assignedModules))
            .map((item) => (
              <SidebarLink
                key={item.to}
                {...item}
                active={location.pathname === item.to}
                onNavigate={() => setIsSidebarOpen(false)}
              />
            ))}
        </nav>

        <div className="pt-4 shrink-0">
          <button
            onClick={handleLogout}
            disabled={isSigningOut}
            className="hidden lg:flex items-center gap-3 w-full px-4 py-3 rounded-xl text-slate-600 hover:bg-red-50 hover:text-red-600 transition-all duration-200 dark:text-slate-300 dark:hover:bg-red-950/40"
          >
            {isSigningOut ? <LoadingSpinner className="text-red-600" /> : <LogOut size={20} />}
            <span className="font-medium">{isSigningOut ? 'Signing out...' : 'Sign Out'}</span>
          </button>
        </div>
      </aside>

      <main className="relative z-0 flex min-w-0 max-w-full flex-1 flex-col overflow-x-hidden">
        <header className="sticky top-0 z-30 flex h-16 max-w-full items-center justify-between gap-2 overflow-hidden border-b border-white/80 bg-white/75 px-3 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/75 sm:h-20 sm:px-5 lg:px-10">
          <button
            aria-label="Open navigation menu"
            onClick={() => setIsSidebarOpen(true)}
            className="shrink-0 rounded-xl p-2 text-slate-600 transition-colors hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 lg:hidden"
          >
            <Menu size={24} />
          </button>

          <button className="hidden md:flex h-11 min-w-80 items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 text-left text-sm font-semibold text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
            <span className="flex-1">Search or press command palette</span>
            <kbd className="rounded-lg bg-slate-100 px-2 py-1 text-[10px] font-black text-slate-700 dark:bg-slate-800 dark:text-slate-200">
              Ctrl K
            </kbd>
          </button>

          <div className="min-w-0 flex-1 md:hidden" />

          <div className="flex min-w-0 shrink-0 items-center justify-end gap-1.5 sm:gap-3 lg:gap-4">
            <button
              aria-label="Sign Out"
              title="Sign Out"
              onClick={handleLogout}
              disabled={isSigningOut}
              className="rounded-xl p-2 text-slate-600 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-60 dark:text-slate-300 dark:hover:bg-red-950/40 lg:hidden"
            >
              {isSigningOut ? <LoadingSpinner className="text-red-600" /> : <LogOut size={20} />}
            </button>
            <ThemeToggle />
            <NotificationDropdown />
            <div className="hidden min-w-0 max-w-36 text-right sm:block lg:max-w-48">
              <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                {user?.displayName}
              </p>
              <p className="text-xs text-slate-500 capitalize dark:text-slate-400">{role}</p>
            </div>
            <button
              onClick={() => setIsProfileModalOpen(true)}
              className="h-9 w-9 shrink-0 cursor-pointer overflow-hidden rounded-full bg-slate-200 ring-2 ring-slate-100 transition-all hover:ring-blue-400 dark:ring-slate-800 sm:h-10 sm:w-10"
            >
              <img
                src={user?.photoURL || `https://ui-avatars.com/api/?name=${user?.displayName}`}
                alt="Profile"
                className="w-full h-full object-cover"
              />
            </button>
          </div>
        </header>

        <div className="flex-1 space-y-8 overflow-auto overflow-x-hidden bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.08),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(124,58,237,0.08),transparent_30%)] p-3 dark:bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.18),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(6,182,212,0.12),transparent_30%)] sm:p-4 md:p-6 lg:p-8">
          {children}
        </div>
      </main>
      <GlobalChatbot />
      <ProfileModal open={isProfileModalOpen} onClose={() => setIsProfileModalOpen(false)} />
    </div>
  );
};

export function AuthenticatedApp() {
  return (
    <Layout>
      <ModuleErrorBoundary>
        <Suspense
          fallback={
            <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
              <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-slate-400 font-black uppercase tracking-widest text-xs">
                Loading Module...
              </p>
            </div>
          }
        >
          <Routes>
            <Route
              path="/"
              element={
                <ModuleGuard module="dashboard">
                  <DashboardPage />
                </ModuleGuard>
              }
            />
            <Route
              path="/announcements"
              element={
                <ModuleGuard module="announcements">
                  <AnnouncementsPage />
                </ModuleGuard>
              }
            />
            <Route
              path="/attendance"
              element={
                <ModuleGuard module="attendance">
                  <AttendancePage />
                </ModuleGuard>
              }
            />
            <Route
              path="/assignments"
              element={
                <ModuleGuard module="assignments">
                  <ModuleErrorBoundary>
                    <AssignmentsPage />
                  </ModuleErrorBoundary>
                </ModuleGuard>
              }
            />
            <Route
              path="/chat"
              element={
                <ModuleGuard module="chat">
                  <ChatPage />
                </ModuleGuard>
              }
            />
            <Route
              path="/library"
              element={
                <ModuleGuard module="library">
                  <LibraryPage />
                </ModuleGuard>
              }
            />
            <Route
              path="/fees"
              element={
                <ModuleGuard module="fees">
                  <FeesPage />
                </ModuleGuard>
              }
            />
            <Route
              path="/performance"
              element={
                <ModuleGuard module="performance">
                  <PerformancePage />
                </ModuleGuard>
              }
            />
            <Route
              path="/parent-portal"
              element={
                <ModuleGuard module="parentPortal">
                  <ParentPortal />
                </ModuleGuard>
              }
            />
            <Route
              path="/students"
              element={
                <ModuleGuard module="students">
                  <StudentsPage />
                </ModuleGuard>
              }
            />
            <Route
              path="/teachers"
              element={
                <ModuleGuard module="teachers">
                  <TeachersPage />
                </ModuleGuard>
              }
            />
            <Route
              path="/all-users"
              element={
                <ModuleGuard module="allUsers">
                  <UsersPage type="all" />
                </ModuleGuard>
              }
            />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </ModuleErrorBoundary>
    </Layout>
  );
}
