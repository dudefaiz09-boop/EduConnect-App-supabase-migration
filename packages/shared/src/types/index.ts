import type { ModuleKey, PermissionKey, Role } from '../roles.js';

export interface UserContext {
  uid: string;
  email?: string;
  displayName?: string;
  role?: string;
  roles: string[];
  isAdmin: boolean;
  isSuperAdmin?: boolean;
  managedTenantIds?: string[];
  classId?: string | null;
  classIds: string[];
  subjectIds?: string[];
  sectionIds?: string[];
  linkedStudentIds: string[];
  assignedModules?: string[];
  permissions: Record<string, boolean>;
  permissionKeys?: PermissionKey[];
  schoolId: string | null;
  status?: 'active' | 'inactive';
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  authorId: string;
  authorName?: string;
  targetClasses: string[];
  visibility: 'school' | 'class' | 'public' | 'private';
  createdAt: string; // ISO String for JSON compatibility
}

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
  correlationId?: string;
}
