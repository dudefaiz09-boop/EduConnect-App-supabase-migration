import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseAdmin } from './supabase.js';

export type ProfileRecord = {
  uid?: string;
  id?: string;
  email?: string;
  displayName?: string;
  display_name?: string;
  photoURL?: string;
  avatar_url?: string;
  schoolId?: string;
  school_id?: string;
  tenantId?: string;
  tenant_id?: string;
  defaultTenantId?: string;
  classId?: string | null;
  classIds?: string[];
  class_ids?: string[];
  subjectIds?: string[];
  subject_ids?: string[];
  sectionIds?: string[];
  section_ids?: string[];
  linkedStudentIds?: string[];
  linked_student_ids?: string[];
  assignedModules?: string[];
  assigned_modules?: string[];
  is_super_admin?: boolean;
  isSuperAdmin?: boolean;
  managed_tenant_ids?: string[];
  managedTenantIds?: string[];
  roles?: string[];
  role?: string;
  isAdmin?: boolean;
  permissions?: Record<string, boolean>;
  disabled?: boolean;
  status?: string;
  createdAt?: string;
  created_at?: string;
  updatedAt?: string;
  updated_at?: string;
};

type ProfileRow = {
  id: string;
  school_id: string;
  email: string;
  display_name: string | null;
  role: string;
  roles: string[] | null;
  assigned_modules: string[] | null;
  permissions: Record<string, boolean> | null;
  class_ids: string[] | null;
  subject_ids: string[] | null;
  section_ids: string[] | null;
  linked_student_ids: string[] | null;
  is_super_admin?: boolean | null;
  managed_tenant_ids?: string[] | null;
  status: string;
  created_at: string;
  updated_at: string;
};

function compactStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string' && item.length > 0)
    : [];
}

export function normalizeProfileRow(row: ProfileRow): ProfileRecord {
  const roles = compactStringArray(row.roles);
  const classIds = compactStringArray(row.class_ids);
  const subjectIds = compactStringArray(row.subject_ids);
  const sectionIds = compactStringArray(row.section_ids);
  const linkedStudentIds = compactStringArray(row.linked_student_ids);
  const assignedModules = compactStringArray(row.assigned_modules);
  const managedTenantIds = compactStringArray(row.managed_tenant_ids);
  const displayName = row.display_name || row.email;

  return {
    id: row.id,
    uid: row.id,
    email: row.email,
    displayName,
    display_name: displayName,
    schoolId: row.school_id,
    school_id: row.school_id,
    tenantId: row.school_id,
    tenant_id: row.school_id,
    role: row.role,
    roles,
    isAdmin: row.role === 'admin' || roles.includes('admin'),
    isSuperAdmin: !!row.is_super_admin,
    is_super_admin: !!row.is_super_admin,
    managedTenantIds,
    managed_tenant_ids: managedTenantIds,
    classId: classIds[0] || null,
    classIds,
    class_ids: classIds,
    subjectIds,
    subject_ids: subjectIds,
    sectionIds,
    section_ids: sectionIds,
    linkedStudentIds,
    linked_student_ids: linkedStudentIds,
    assignedModules,
    assigned_modules: assignedModules,
    permissions: row.permissions || {},
    status: row.status,
    createdAt: row.created_at,
    created_at: row.created_at,
    updatedAt: row.updated_at,
    updated_at: row.updated_at,
  };
}

async function readProfileRow(supabase: SupabaseClient, uid: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', uid)
    .maybeSingle<ProfileRow>();

  if (error) throw error;
  return data ? normalizeProfileRow(data) : null;
}

async function readLegacyUserDocument(supabase: SupabaseClient, uid: string) {
  const { data, error } = await supabase
    .from('documents')
    .select('data')
    .eq('collection', 'users')
    .eq('id', uid)
    .maybeSingle<{ data: ProfileRecord | null }>();

  if (error) throw error;
  return data?.data || null;
}

export async function getProfileNormalizedFirst(uid: string): Promise<ProfileRecord> {
  const supabase = getSupabaseAdmin();
  const normalized = await readProfileRow(supabase, uid);
  const legacy = await readLegacyUserDocument(supabase, uid);

  if (!normalized) return legacy || {};
  return {
    ...(legacy || {}),
    ...normalized,
    photoURL: legacy?.photoURL || legacy?.avatar_url || normalized.photoURL,
    avatar_url: legacy?.avatar_url || legacy?.photoURL || normalized.avatar_url,
  };
}
