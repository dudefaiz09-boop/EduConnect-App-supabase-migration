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

function getEffectiveClassIds(target: {
  classId?: string | null;
  classIds?: readonly string[];
}): string[] {
  const ids = target.classIds ? [...target.classIds] : [];
  if (target.classId && !ids.includes(target.classId)) ids.push(target.classId);
  return ids.filter(Boolean);
}

const LEADERSHIP_ROLES = new Set<string>([ROLES.ADMIN, ROLES.PRINCIPAL, 'president']);

export function canMessageUser(
  actor: ChatPermissionActor,
  target: ChatPermissionTarget
): ChatPermissionResult {
  const actorRole = actor.role || actor.roles?.[0] || '';
  if (!actorRole) return { allowed: false };

  if (actorRole === ROLES.ADMIN || actorRole === ROLES.PRINCIPAL || actor.isAdmin) {
    return { allowed: true, reason: 'Admin/Principal access' };
  }

  const targetRole = getEffectiveRole(target);
  const targetClassIds = getEffectiveClassIds(target);
  const actorClassIds = getEffectiveClassIds(actor);

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
      const hasLinkedChildInClass =
        targetChildClassIds.some((c) => actorClassIds.includes(c)) ||
        (target.linkedStudentIds?.length ?? 0) > 0;
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

  return { allowed: false };
}
