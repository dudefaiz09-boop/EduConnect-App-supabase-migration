import { db } from '../../lib/documents.js';

type ProfileRecord = {
  schoolId?: string;
  tenantId?: string;
  defaultTenantId?: string;
  classId?: string | null;
  classIds?: string[];
  subjectIds?: string[];
  sectionIds?: string[];
  linkedStudentIds?: string[];
  assignedModules?: string[];
  is_super_admin?: boolean;
  isSuperAdmin?: boolean;
  managed_tenant_ids?: string[];
  managedTenantIds?: string[];
  roles?: string[];
  role?: string;
  permissions?: Record<string, boolean>;
  disabled?: boolean;
  status?: string;
};

export class AuthProfileRepository {
  static async getProfile(uid: string): Promise<ProfileRecord> {
    const snapshot = await db.collection('users').doc(uid).get();
    return snapshot.exists ? ((snapshot.data() || {}) as ProfileRecord) : {};
  }
}
