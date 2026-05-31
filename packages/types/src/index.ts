export interface UserContext {
  uid: string;
  email?: string;
  displayName?: string;
  role: string;
  roles: string[];
  isAdmin: boolean;
  isSuperAdmin?: boolean;
  managedTenantIds?: string[];
  schoolId: string | null;
  classId: string | null;
  classIds: string[];
  subjectIds: string[];
  sectionIds: string[];
  linkedStudentIds: string[];
  assignedModules: string[];
  permissions: Record<string, boolean>;
  status: 'active' | 'inactive';
}

// Note: Express.Request augmentation is in apps/functions/src/middleware/auth.ts
// to avoid duplicate UserContext definitions. Keep this file for
// AttendanceRecord and Announcement types used by shared-analytics.

export interface Announcement {
  id: string;
  title: string;
  content: string;
  authorId: string;
  targetClasses: string[];
  visibility: 'public' | 'private';
  createdAt: any; // Simplified to any for monorepo portability
}

export interface AttendanceRecord {
  id?: string;
  studentId: string;
  classId: string;
  date: string;
  status: 'present' | 'absent' | 'late';
  markedBy: string;
  updatedAt: any; // Simplified to any for monorepo portability
}
