import { createManagedUser, updateManagedUser, writeAuditLog } from '../../lib/user-management.js';
import { auth, db } from '../../lib/documents.js';
import { normalizeProfileRow } from '../../lib/identity-profile.js';
import { AppError } from '../../middleware/error.js';
import type { Request } from 'express';

type Actor = { uid: string; email?: string; schoolId?: string | null };
type ManagedUserInput = Record<string, unknown> & {
  tenantId?: unknown;
  schoolId?: unknown;
};

function canManageTenant(req: Request, tenantId?: string | null) {
  if (!tenantId) return false;
  if (tenantId === req.tenantId) return true;
  return Boolean(req.user!.isSuperAdmin && req.user!.managedTenantIds?.includes(tenantId));
}

function assertCanManageTenant(req: Request, tenantId?: string | null) {
  if (!canManageTenant(req, tenantId)) throw new AppError('Tenant access denied', 403);
}

export class UsersRepository {
  static async list(
    query: { tenantId?: string; role?: string; status?: string; search?: string; limit?: number },
    req: Request
  ) {
    const requestedTenantId = query.tenantId || req.tenantId;
    if (!requestedTenantId) throw new AppError('Tenant context required', 400);
    assertCanManageTenant(req, requestedTenantId);
    const supabaseAdmin = auth.getSupabaseAdmin();
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('school_id', requestedTenantId);
    if (error) throw error;
    let users = (data || []).map((row) => normalizeProfileRow(row as any));
    const requestedRole = query.role;
    if (requestedRole)
      users = users.filter((p) => {
        const roles = Array.isArray(p.roles) ? p.roles : [];
        return p.role === requestedRole || roles.includes(requestedRole);
      });
    if (query.status) users = users.filter((p) => p.status === query.status);
    if (query.search) {
      const q = query.search.toLowerCase();
      users = users.filter((p) =>
        `${p.displayName || ''} ${p.email || ''} ${p.role || ''}`.toLowerCase().includes(q)
      );
    }
    return users.slice(0, query.limit || 100);
  }

  static async listTenants(req: Request) {
    const allowedTenantIds = req.user!.isSuperAdmin
      ? req.user!.managedTenantIds || []
      : req.tenantId
        ? [req.tenantId]
        : [];
    if (allowedTenantIds.length === 0) return [];
    const supabaseAdmin = auth.getSupabaseAdmin();
    const { data, error } = await supabaseAdmin
      .from('tenants')
      .select('id,name,slug,status,metadata')
      .in('id', allowedTenantIds);
    if (error) throw error;
    return data || [];
  }

  static async getAuditLogs(query: { targetUid?: string; limit?: number }, tenantId: string) {
    const snapshot = await db.collection('auditLogs').where('tenantId', '==', tenantId).get();
    let logs = snapshot.docs.map((doc) => ({ id: doc.id, ...(doc.data() as any) }));
    if (query.targetUid) logs = logs.filter((log) => log.targetUid === query.targetUid);
    logs = logs.sort(
      (a, b) =>
        new Date(String(a.timestamp || a.createdAt || 0)).getTime() -
        new Date(String(b.timestamp || b.createdAt || 0)).getTime()
    );
    return logs.slice(0, query.limit || 100);
  }

  static async updateOwnProfile(
    uid: string,
    data: { displayName?: string; photoURL?: string },
    _email?: string
  ) {
    const supabaseAdmin = auth.getSupabaseAdmin();
    const updateData: Record<string, unknown> = {};
    if (data.displayName) updateData.display_name = data.displayName;
    if (data.photoURL) updateData.avatar_url = data.photoURL;
    await supabaseAdmin.auth.admin.updateUserById(uid, { user_metadata: updateData });
    const userRef = db.collection('users').doc(uid);
    const snapshot = await userRef.get();
    if (snapshot.exists) {
      const before = snapshot.data() || {};
      const after = {
        ...before,
        ...(data.displayName ? { displayName: data.displayName } : {}),
        ...(data.photoURL ? { photoURL: data.photoURL } : {}),
        updatedAt: new Date().toISOString(),
      };
      await userRef.update(after);
      const displayName = typeof after.displayName === 'string' ? after.displayName : undefined;
      const updatedAt =
        typeof after.updatedAt === 'string' ? after.updatedAt : new Date().toISOString();
      await supabaseAdmin
        .from('profiles')
        .upsert({ id: uid, display_name: displayName, updated_at: updatedAt });
    }
  }

  static async create(data: ManagedUserInput, req: Request, actor: Actor) {
    const requestedTenantId =
      typeof data.tenantId === 'string'
        ? data.tenantId
        : typeof data.schoolId === 'string'
          ? data.schoolId
          : req.tenantId;
    assertCanManageTenant(req, requestedTenantId);

    return createManagedUser(
      {
        ...data,
        tenantId: requestedTenantId,
      },
      actor
    );
  }

  static async bulkImport(users: any[], req: Request, actor: Actor) {
    const results = [];
    for (const user of users) {
      try {
        const targetTenantId = user.tenantId || req.tenantId;
        assertCanManageTenant(req, targetTenantId);
        const profile = await createManagedUser({ ...user, tenantId: targetTenantId }, actor);
        results.push({ success: true, uid: profile.uid, email: profile.email });
      } catch (error) {
        results.push({
          success: false,
          email: user.email,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
    return results;
  }

  static async update(uid: string, data: any, actor: Actor) {
    return updateManagedUser(uid, data, actor);
  }

  static async deactivate(uid: string, actor: Actor) {
    return updateManagedUser(uid, { status: 'inactive' }, actor, 'user_deactivated');
  }

  static async deleteRequest(uid: string, actor: Actor) {
    const profile = await updateManagedUser(uid, { status: 'inactive' }, actor, 'user_deactivated');
    await writeAuditLog({
      action: 'user_delete_requested',
      targetUid: uid,
      performedBy: actor.uid,
      details: `Delete requested; ${profile.email || uid} was deactivated instead`,
      before: profile,
      after: profile,
      schoolId: profile.schoolId,
    });
    return profile;
  }
}
