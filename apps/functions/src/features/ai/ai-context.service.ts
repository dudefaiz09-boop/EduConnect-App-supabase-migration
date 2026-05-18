import { Request } from 'express';
import { db } from '../../lib/documents.js';
import { AiContextProvider } from './providers/base.provider.js';
import { FeesProvider } from './providers/fees.provider.js';
import { AttendanceProvider } from './providers/attendance.provider.js';
import { AssignmentsProvider } from './providers/assignments.provider.js';
import { PerformanceProvider } from './providers/performance.provider.js';
import { LibraryProvider } from './providers/library.provider.js';

export type AiModule = 'fees' | 'attendance' | 'assignments' | 'performance' | 'library';

export interface AiUserContext {
  uid: string;
  email?: string;
  displayName?: string;
  role: string;
  roles: string[];
  schoolId: string;
  tenantId: string;
  classId?: string | null;
  classIds: string[];
  linkedStudentIds: string[];
  permissions: Record<string, boolean>;
}

const AI_MODULE_PERMISSIONS: Record<AiModule, string[]> = {
  fees: ['admin', 'principal', 'accountant', 'parent', 'student'],
  attendance: ['admin', 'principal', 'teacher', 'parent', 'student'],
  assignments: ['admin', 'teacher', 'student', 'parent'],
  performance: ['admin', 'principal', 'teacher', 'parent', 'student'],
  library: ['admin', 'librarian', 'teacher', 'student'],
};

const PROVIDERS: Record<AiModule, AiContextProvider> = {
  fees: new FeesProvider(),
  attendance: new AttendanceProvider(),
  assignments: new AssignmentsProvider(),
  performance: new PerformanceProvider(),
  library: new LibraryProvider(),
};

export class AiContextService {
  static async resolveAiUserContext(req: Request): Promise<AiUserContext> {
    const user = req.user;
    const tenantId = req.tenantId || (req.headers['x-school-id'] as string) || 'default-school';

    if (!user) {
      console.error('[AI-Context] No user found on request');
      throw new Error('AI request failed because school context was not sent.');
    }

    const context: AiUserContext = {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      role: user.role || user.roles?.[0] || 'student',
      roles: user.roles || [],
      schoolId: user.schoolId || tenantId,
      tenantId: tenantId,
      classId: user.classId,
      classIds: user.classIds || [],
      linkedStudentIds: user.linkedStudentIds || [],
      permissions: user.permissions || {},
    };

    if (!context.role || context.schoolId === 'default-school' || !context.classId) {
      try {
        const userDoc = await db.collection('users').doc(user.uid).get();
        if (userDoc.exists) {
          const data = userDoc.data()!;
          context.role = data.role || context.role;
          context.roles = data.roles || context.roles;
          context.schoolId = data.schoolId || context.schoolId;
          context.classId = data.classId || context.classId;
          context.classIds = data.classIds || (data.classId ? [data.classId] : context.classIds);
          context.linkedStudentIds = data.linkedStudentIds || context.linkedStudentIds;
          context.permissions = data.permissions || context.permissions;
        }

        if (context.role === 'teacher' && (!context.classIds || context.classIds.length === 0)) {
          const teacherSnap = await db
            .collection('teachers')
            .where('tenantId', '==', tenantId)
            .where('userId', '==', user.uid)
            .get();
          if (teacherSnap.docs.length > 0) {
            const tData = teacherSnap.docs[0].data();
            context.classIds = tData.classIds || context.classIds;
          }
        }

        if (context.role === 'student' && !context.classId) {
          const studentSnap = await db
            .collection('students')
            .where('tenantId', '==', tenantId)
            .where('userId', '==', user.uid)
            .get();
          if (studentSnap.docs.length > 0) {
            const sData = studentSnap.docs[0].data();
            context.classId = sData.classId || context.classId;
          }
        }
      } catch (err) {
        console.error('[AI-Context] Failed to fetch extended user profile:', err);
      }
    }

    return context;
  }

  static inferModulesFromQuery(query: string): AiModule[] {
    const q = query.toLowerCase();
    const modules: AiModule[] = [];
    if (q.includes('fee') || q.includes('pay') || q.includes('due') || q.includes('collection'))
      modules.push('fees');
    if (
      q.includes('attendance') ||
      q.includes('present') ||
      q.includes('absent') ||
      q.includes('late') ||
      q.includes('yesterday') ||
      q.includes('today') ||
      q.includes('class') ||
      q.includes('was i present')
    )
      modules.push('attendance');
    if (q.includes('assignment') || q.includes('homework') || q.includes('submit'))
      modules.push('assignments');
    if (
      q.includes('grade') ||
      q.includes('score') ||
      q.includes('performance') ||
      q.includes('mark')
    )
      modules.push('performance');
    if (q.includes('book') || q.includes('library') || q.includes('read')) modules.push('library');
    return [...new Set(modules)];
  }

  static async getModuleContext(context: AiUserContext, requestedModules?: AiModule[]) {
    const modules = requestedModules || [];
    const { role } = context;

    const canAccess = (m: AiModule) => AI_MODULE_PERMISSIONS[m].includes(role);

    const providerPromises = modules
      .filter(canAccess)
      .map(m => PROVIDERS[m]?.getContext(context));

    const results = await Promise.allSettled(providerPromises);

    const contextParts = results
      .map(res => (res.status === 'fulfilled' ? res.value : null))
      .filter(Boolean);

    return contextParts.length > 0
      ? `Real-time School Context:\n${contextParts.join('\n\n')}`
      : 'No specific school records were requested or found.';
  }
}
