import { getSupabaseAdmin } from './supabase.js';

export type ProfileRecord = {
  uid?: string;
  email?: string;
  displayName?: string;
  display_name?: string;
  photoURL?: string;
  avatar_url?: string;
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
  createdAt?: string;
  created_at?: string;
  updatedAt?: string;
  updated_at?: string;
};

/**
 * Reads a user profile directly from the `documents` table without requiring a
 * tenant context. Safe to call before `tenantMiddleware` runs.
 */
export async function getOwnProfile(uid: string): Promise<ProfileRecord> {
  const supabaseAdmin = getSupabaseAdmin();
  const { data, error } = await supabaseAdmin
    .from('documents')
    .select('data')
    .eq('collection', 'users')
    .eq('id', uid)
    .maybeSingle<{ data: ProfileRecord | null }>();

  if (error) throw error;
  return (data?.data as ProfileRecord) || {};
}

/**
 * Upserts a user profile directly in the `documents` table and, when
 * displayName/photoURL are provided, also syncs to Supabase auth user_metadata.
 * Does NOT require tenant context.
 */
export async function upsertOwnProfile(
  uid: string,
  email: string | undefined,
  patch: { displayName?: string; photoURL?: string }
): Promise<ProfileRecord> {
  const supabaseAdmin = getSupabaseAdmin();
  const now = new Date().toISOString();

  // 1. Sync display_name / avatar_url to Supabase auth metadata (source of truth for UI)
  const authMetadata: Record<string, unknown> = {};
  if (patch.displayName) authMetadata.display_name = patch.displayName;
  if (patch.photoURL) authMetadata.avatar_url = patch.photoURL;

  if (Object.keys(authMetadata).length > 0) {
    const { error: authErr } = await supabaseAdmin.auth.admin.updateUserById(uid, {
      user_metadata: authMetadata,
    });
    if (authErr) throw authErr;
  }

  // 2. Build the profile patch for the `documents` table
  const profilePatch: Record<string, unknown> = {
    updatedAt: now,
    updated_at: now,
  };

  if (patch.displayName) {
    profilePatch.displayName = patch.displayName;
    profilePatch.display_name = patch.displayName;
  }
  if (patch.photoURL) {
    profilePatch.photoURL = patch.photoURL;
    profilePatch.avatar_url = patch.photoURL;
  }

  // 3. Fetch the existing row directly (no tenant filter needed)
  const { data: existing, error: fetchErr } = await supabaseAdmin
    .from('documents')
    .select('data')
    .eq('collection', 'users')
    .eq('id', uid)
    .maybeSingle<{ data: ProfileRecord | null }>();
  if (fetchErr) throw fetchErr;

  if (existing?.data) {
    // Update existing row
    const { error: updateErr } = await supabaseAdmin
      .from('documents')
      .update({
        data: { ...(existing.data as Record<string, unknown>), ...profilePatch },
        updated_at: now,
      })
      .eq('collection', 'users')
      .eq('id', uid);
    if (updateErr) throw updateErr;
  } else {
    // Insert new row (user signed up via Supabase Auth but hasn't been seeded)
    const { error: insertErr } = await supabaseAdmin.from('documents').upsert(
      {
        collection: 'users',
        id: uid,
        data: {
          uid,
          email,
          ...profilePatch,
          createdAt: now,
          created_at: now,
        },
        created_at: now,
        updated_at: now,
      },
      { onConflict: 'collection,id' }
    );
    if (insertErr) throw insertErr;
  }

  // 4. Also sync to the `profiles` table if displayName changed (belt-and-suspenders)
  if (patch.displayName) {
    await supabaseAdmin
      .from('profiles')
      .update({ display_name: patch.displayName, updated_at: now })
      .eq('id', uid);
  }

  return { uid, ...(existing?.data as ProfileRecord), ...profilePatch };
}
