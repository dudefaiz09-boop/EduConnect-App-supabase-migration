import { ROLES } from '../constants/index.js';

export type ChatPermissionActor = {
  uid: string;
  role?: string;
  roles?: readonly string[];
  classId?: string | null;
  classIds?: readonly string[];
  linkedStudentIds?: readonly string[];
  linkedStudentClassIds?: readonly string[];
  schoolId?: string | null;
  tenantId?: string | null;
  isAdmin?: boolean;
  isSuperAdmin?: boolean;
};

export type ChatPermissionTarget = {
  uid: string;
  role?: string;
  roles?: readonly string[];
  classId?: string | null;
  classIds?: readonly string[];
  linkedStudentIds?: readonly string[];
  schoolId?: string | null;
  tenantId?: string | null;
};

export type ChatPermissionResult = {
  allowed: boolean;
  reason?: string;
};

function getEffectiveRole(target: { role?: string; roles?: readonly string[] }): string {
  return target.role || target.roles?.[0] || '';
}

function getAllRoles(user: { role?: string; roles?: readonly string[] }): string[] {
  const roleSet = new Set<string>();
  if (user.role) roleSet.add(user.role);
  if (user.roles) user.roles.forEach((r) => r && roleSet.add(r));
  return Array.from(roleSet);
}

function getEffectiveClassIds(target: {
  classId?: string | null;
  classIds?: readonly string[];
}): string[] {
  const ids = target.classIds ? [...target.classIds] : [];
  if (target.classId && !ids.includes(target.classId)) ids.push(target.classId);
  return ids.filter(Boolean);
}

const LEADERSHIP_ROLES = new Set<string>([ROLES.ADMIN, ROLES.PRINCIPAL, 'president']);

function checkRole(
  actorRole: string,
  actor: ChatPermissionActor,
  target: ChatPermissionTarget,
  targetRole: string,
  targetClassIds: string[],
  actorClassIds: string[]
): ChatPermissionResult | null {
  if (actorRole === ROLES.ADMIN || actorRole === ROLES.PRINCIPAL || actor.isAdmin) {
    return { allowed: true, reason: 'Admin/Principal access' };
  }

  if (actorRole === ROLES.STUDENT) {
    if (targetRole === ROLES.TEACHER && targetClassIds.some((c) => actorClassIds.includes(c)))
      return { allowed: true, reason: 'Class Teacher' };
    if (LEADERSHIP_ROLES.has(targetRole)) return { allowed: true, reason: 'Administration' };
    return { allowed: false };
  }

  if (actorRole === ROLES.PARENT) {
    const parentClassIds = Array.from(
      new Set([...actorClassIds, ...(actor.linkedStudentClassIds || [])])
    );
    if (targetRole === ROLES.TEACHER && targetClassIds.some((c) => parentClassIds.includes(c)))
      return { allowed: true, reason: "Child's Teacher" };
    if (LEADERSHIP_ROLES.has(targetRole)) return { allowed: true, reason: 'Administration' };
    return { allowed: false };
  }

  if (actorRole === ROLES.TEACHER) {
    if (targetRole === ROLES.STUDENT && targetClassIds.some((c) => actorClassIds.includes(c)))
      return { allowed: true, reason: 'Your Student' };
    if (targetRole === ROLES.PARENT) {
      const targetChildClassIds = getEffectiveClassIds(target);
      const hasLinkedChildInClass = targetChildClassIds.some((c) => actorClassIds.includes(c));
      if (hasLinkedChildInClass) return { allowed: true, reason: "Student's Parent" };
    }
    if (
      targetRole === ROLES.PRINCIPAL ||
      targetRole === ROLES.ADMIN ||
      targetRole === ROLES.TEACHER
    )
      return { allowed: true, reason: 'Colleague' };
    return { allowed: false };
  }

  if (actorRole === ROLES.LIBRARIAN) {
    if (targetRole === ROLES.ADMIN || targetRole === ROLES.PRINCIPAL || targetRole === 'president')
      return { allowed: true, reason: 'Administration' };
    if (targetRole === ROLES.STUDENT || targetRole === ROLES.PARENT)
      return { allowed: true, reason: 'Library Services' };
    return { allowed: false };
  }

  if (actorRole === ROLES.ACCOUNTANT) {
    if (targetRole === ROLES.ADMIN || targetRole === ROLES.PRINCIPAL || targetRole === 'president')
      return { allowed: true, reason: 'Administration' };
    if (targetRole === ROLES.STUDENT || targetRole === ROLES.PARENT)
      return { allowed: true, reason: 'Fee Management' };
    return { allowed: false };
  }

  return null;
}

export function canMessageUser(
  actor: ChatPermissionActor,
  target: ChatPermissionTarget
): ChatPermissionResult {
  const roles = getAllRoles(actor);
  if (roles.length === 0) return { allowed: false };

  const targetRole = getEffectiveRole(target);
  const targetClassIds = getEffectiveClassIds(target);
  const actorClassIds = getEffectiveClassIds(actor);

  for (const actorRole of roles) {
    const result = checkRole(actorRole, actor, target, targetRole, targetClassIds, actorClassIds);
    if (result === null) continue;
    if (result.allowed) return result;
  }

  return { allowed: false };
}
