import React, { createContext, useContext, useEffect, useState } from 'react';
import type { Session, User as SupabaseUser } from '@supabase/supabase-js';
import {
  ROLES,
  getAuthErrorMessage,
  getUserRole,
  hasPermission,
  type Role,
} from '@educonnect/shared';
import { authProfileService, setMobileTenantId } from '../lib/api-client';
import { ENV } from '../config/env';
import { supabase } from '../lib/supabase';

interface MobileUser {
  uid: string;
  email?: string | null;
  displayName?: string | null;
  getIdToken: () => Promise<string | null>;
}

interface AuthContextType {
  user: MobileUser | null;
  loading: boolean;
  profileReady: boolean;
  profileError: string | null;
  schoolId: string | null;
  classId: string | null;
  classIds: string[];
  subjectIds: string[];
  sectionIds: string[];
  linkedStudentIds: string[];
  assignedModules: string[];
  managedTenantIds: string[];
  role: Role;
  roles: string[];
  permissions: Record<string, boolean>;
  isAdmin: boolean;
  isTeacher: boolean;
  isStudent: boolean;
  isParent: boolean;
  isSuperAdmin: boolean;
  canManageAttendance: boolean;
  canManageAssignments: boolean;
  canManageLibrary: boolean;
  canManageFees: boolean;
  canManagePerformance: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (args: { displayName: string; email: string; password: string }) => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  profileReady: false,
  profileError: null,
  schoolId: null,
  classId: null,
  classIds: [],
  subjectIds: [],
  sectionIds: [],
  linkedStudentIds: [],
  assignedModules: [],
  managedTenantIds: [],
  role: ROLES.STUDENT,
  roles: [],
  permissions: {},
  isAdmin: false,
  isTeacher: false,
  isStudent: false,
  isParent: false,
  isSuperAdmin: false,
  canManageAttendance: false,
  canManageAssignments: false,
  canManageLibrary: false,
  canManageFees: false,
  canManagePerformance: false,
  login: async () => {},
  register: async () => {},
  sendPasswordReset: async () => {},
  updatePassword: async () => {},
  logout: async () => {},
});

export const useAuth = () => useContext(AuthContext);

function toMobileUser(user: SupabaseUser, accessToken: string | null): MobileUser {
  return {
    uid: user.id,
    email: user.email,
    displayName: user.user_metadata?.display_name || user.email,
    getIdToken: async () => accessToken,
  };
}

function toStringArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === 'string');
  if (typeof value === 'string' && value.trim()) return [value.trim()];
  return [];
}

function firstString(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value;
  }
  return null;
}

function readSessionContext(user: SupabaseUser) {
  const appMetadata = user.app_metadata || {};
  const userMetadata = user.user_metadata || {};
  const isLocalAdmin = user.email?.toLowerCase() === 'admin@educonnect.test';
  const roles = [
    ...toStringArray(appMetadata.roles),
    ...toStringArray(appMetadata.role),
    ...toStringArray(userMetadata.roles),
    ...toStringArray(userMetadata.role),
  ];
  const normalizedRoles = Array.from(new Set(roles));

  if (isLocalAdmin && normalizedRoles.length === 0) {
    normalizedRoles.push(ROLES.ADMIN);
  }

  return {
    assignedModules: toStringArray(appMetadata.assignedModules || userMetadata.assignedModules),
    classId: firstString(appMetadata.classId, userMetadata.classId),
    classIds: toStringArray(appMetadata.classIds || userMetadata.classIds),
    isSuperAdmin:
      appMetadata.isSuperAdmin === true ||
      appMetadata.is_super_admin === true ||
      userMetadata.isSuperAdmin === true ||
      isLocalAdmin,
    linkedStudentIds: toStringArray(appMetadata.linkedStudentIds || userMetadata.linkedStudentIds),
    managedTenantIds: toStringArray(appMetadata.managedTenantIds || userMetadata.managedTenantIds),
    permissions:
      typeof appMetadata.permissions === 'object' && appMetadata.permissions
        ? (appMetadata.permissions as Record<string, boolean>)
        : {},
    roles: normalizedRoles,
    schoolId:
      firstString(
        appMetadata.schoolId,
        appMetadata.tenantId,
        appMetadata.defaultTenantId,
        userMetadata.schoolId,
        userMetadata.tenantId,
        userMetadata.defaultTenantId
      ) || (isLocalAdmin ? 'default-school' : null),
    sectionIds: toStringArray(appMetadata.sectionIds || userMetadata.sectionIds),
    subjectIds: toStringArray(appMetadata.subjectIds || userMetadata.subjectIds),
  };
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<MobileUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [classId, setClassId] = useState<string | null>(null);
  const [classIds, setClassIds] = useState<string[]>([]);
  const [subjectIds, setSubjectIds] = useState<string[]>([]);
  const [sectionIds, setSectionIds] = useState<string[]>([]);
  const [linkedStudentIds, setLinkedStudentIds] = useState<string[]>([]);
  const [assignedModules, setAssignedModules] = useState<string[]>([]);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [managedTenantIds, setManagedTenantIds] = useState<string[]>([]);
  const [roles, setRoles] = useState<string[]>([]);
  const [permissions, setPermissions] = useState<Record<string, boolean>>({});

  const clearProfileState = () => {
    setSchoolId(null);
    setMobileTenantId(null);
    setClassId(null);
    setClassIds([]);
    setSubjectIds([]);
    setSectionIds([]);
    setLinkedStudentIds([]);
    setAssignedModules([]);
    setIsSuperAdmin(false);
    setManagedTenantIds([]);
    setRoles([]);
    setPermissions({});
    setProfileError(null);
  };

  const applySession = async (session: Session | null) => {
    if (!session?.user) {
      setUser(null);
      clearProfileState();
      setLoading(false);
      return;
    }

    setUser(toMobileUser(session.user, session.access_token));
    setProfileError(null);

    try {
      const profile = await authProfileService.getProfile();
      const appMetadata = session.user.app_metadata || {};
      const sessionContext = readSessionContext(session.user);

      if (profile.disabled || profile.status === 'disabled' || appMetadata.disabled === true) {
        await supabase.auth.signOut();
        setUser(null);
        clearProfileState();
        return;
      }

      const nextSchoolId =
        profile.schoolId ||
        profile.tenantId ||
        profile.defaultTenantId ||
        sessionContext.schoolId ||
        null;
      const nextIsSuperAdmin =
        !!profile.is_super_admin || !!profile.isSuperAdmin || sessionContext.isSuperAdmin;
      const nextManagedTenantIds =
        profile.managed_tenant_ids ||
        profile.managedTenantIds ||
        sessionContext.managedTenantIds ||
        [];
      const nextRoles =
        toStringArray(profile.roles).length > 0
          ? toStringArray(profile.roles)
          : toStringArray(profile.role).length > 0
            ? toStringArray(profile.role)
            : sessionContext.roles;
      const nextClassId = profile.classId || sessionContext.classId || null;
      const nextClassIds =
        toStringArray(profile.classIds).length > 0
          ? toStringArray(profile.classIds)
          : sessionContext.classIds.length > 0
            ? sessionContext.classIds
            : nextClassId
              ? [nextClassId]
              : [];
      setSchoolId(nextSchoolId);
      setMobileTenantId(nextSchoolId);
      setClassId(nextClassId);
      setClassIds(nextClassIds);
      setSubjectIds(
        toStringArray(profile.subjectIds).length
          ? toStringArray(profile.subjectIds)
          : sessionContext.subjectIds
      );
      setSectionIds(
        toStringArray(profile.sectionIds).length
          ? toStringArray(profile.sectionIds)
          : sessionContext.sectionIds
      );
      setLinkedStudentIds(
        toStringArray(profile.linkedStudentIds).length
          ? toStringArray(profile.linkedStudentIds)
          : sessionContext.linkedStudentIds
      );
      setAssignedModules(
        toStringArray(profile.assignedModules).length
          ? toStringArray(profile.assignedModules)
          : sessionContext.assignedModules
      );
      setIsSuperAdmin(nextIsSuperAdmin);
      setManagedTenantIds(nextManagedTenantIds);
      setRoles(nextRoles);
      setPermissions(profile.permissions || sessionContext.permissions);

      if (nextRoles.length === 0 || (!nextSchoolId && !nextIsSuperAdmin)) {
        setProfileError(
          'Profile metadata is incomplete. Sign out and sign in again after the school profile is repaired.'
        );
      }

      if (__DEV__) {
        console.info('[Auth] Loaded mobile profile context:', {
          apiBaseUrl: ENV.API_BASE_URL,
          userId: session.user.id,
          email: session.user.email,
          tenantId: nextSchoolId,
          role: nextRoles[0] || null,
          roles: nextRoles,
          classId: nextClassId,
          classIds: nextClassIds,
          linkedStudentIds: profile.linkedStudentIds || appMetadata.linkedStudentIds || [],
          assignedModules: profile.assignedModules || appMetadata.assignedModules || [],
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown profile error';
      const sessionContext = readSessionContext(session.user);
      setSchoolId(sessionContext.schoolId);
      setMobileTenantId(sessionContext.schoolId);
      setClassId(sessionContext.classId);
      setClassIds(sessionContext.classIds);
      setSubjectIds(sessionContext.subjectIds);
      setSectionIds(sessionContext.sectionIds);
      setLinkedStudentIds(sessionContext.linkedStudentIds);
      setAssignedModules(sessionContext.assignedModules);
      setIsSuperAdmin(sessionContext.isSuperAdmin);
      setManagedTenantIds(sessionContext.managedTenantIds);
      setRoles(sessionContext.roles);
      setPermissions(sessionContext.permissions);
      setProfileError(message);
      console.error('[Auth] Failed to fetch API profile:', {
        apiBaseUrl: ENV.API_BASE_URL,
        userId: session.user.id,
        email: session.user.email,
        message,
        fallbackContext: {
          role: sessionContext.roles[0] || null,
          tenantId: sessionContext.schoolId,
          classId: sessionContext.classId,
        },
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    supabase.auth
      .getSession()
      .then(({ data }) => applySession(data.session))
      .catch((err) => {
        console.error(
          '[Auth] Initial session fetch failed (likely wrong API URL or offline):',
          (err as Error).message
        );
        setLoading(false);
      });

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      void applySession(session);
    });

    return () => {
      data.subscription.unsubscribe();
    };
    // applySession is intentionally scoped to this provider's current state setters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw new Error(getAuthErrorMessage(error));
    if (!data.session) throw new Error('Sign in did not return a valid session. Please try again.');
  };

  const register = async ({
    displayName,
    email,
    password,
  }: {
    displayName: string;
    email: string;
    password: string;
  }) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: 'educonnect://auth/callback',
        data: {
          display_name: displayName,
        },
      },
    });
    if (error) throw new Error(getAuthErrorMessage(error));
  };

  const sendPasswordReset = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'educonnect://auth/reset-password',
    });
    if (error) throw new Error(getAuthErrorMessage(error));
  };

  const updatePassword = async (password: string) => {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw new Error(getAuthErrorMessage(error));
  };

  const logout = async () => {
    clearProfileState();
    await supabase.auth.signOut({ scope: 'global' });
  };

  const profileReady = Boolean(roles.length > 0 && (schoolId || isSuperAdmin));
  const role = roles.length > 0 ? getUserRole(roles) : ROLES.STAFF;
  const permissionUser = {
    roles: role ? [role] : [],
    isAdmin: roles.includes(ROLES.ADMIN) || isSuperAdmin,
    permissions,
  };
  const isAdmin = roles.includes(ROLES.ADMIN) || isSuperAdmin;
  const isTeacher = roles.includes(ROLES.TEACHER);
  const isStudent = roles.includes(ROLES.STUDENT);
  const isParent = roles.includes(ROLES.PARENT);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        profileReady,
        profileError,
        schoolId,
        classId,
        classIds,
        subjectIds,
        sectionIds,
        linkedStudentIds,
        assignedModules,
        managedTenantIds,
        role,
        roles,
        permissions,
        isAdmin,
        isSuperAdmin,
        isTeacher,
        isStudent,
        isParent,
        canManageAttendance: hasPermission(permissionUser, 'markAttendance'),
        canManageAssignments: Boolean(permissions.manageAssignments || isTeacher || isAdmin),
        canManageLibrary: hasPermission(permissionUser, 'manageLibrary'),
        canManageFees: hasPermission(permissionUser, 'manageFees'),
        canManagePerformance: hasPermission(permissionUser, 'viewReports'),
        login,
        register,
        sendPasswordReset,
        updatePassword,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
