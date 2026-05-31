import { canAccessModule, hasPermission } from '../packages/shared/src/roles.ts';

describe('Assignment module access control', () => {
  it('grants assignment access to teachers by default', () => {
    expect(canAccessModule('teacher', 'assignments')).toBe(true);
  });

  it('grants assignment access to students by default', () => {
    expect(canAccessModule('student', 'assignments')).toBe(true);
  });

  it('grants assignment access to admins by default', () => {
    expect(canAccessModule('admin', 'assignments')).toBe(true);
  });

  it('denies assignment access to accountants by default', () => {
    expect(canAccessModule('accountant', 'assignments')).toBe(false);
  });

  it('grants assignment access via assignedModules override', () => {
    expect(canAccessModule('accountant', 'assignments', ['assignments'])).toBe(true);
  });

  it('grants all permissions to admin users', () => {
    expect(hasPermission({ roles: ['admin'] }, 'manageAssignments')).toBe(true);
  });

  it('denies manageAssignments to students by default', () => {
    expect(hasPermission({ roles: ['student'] }, 'manageAssignments')).toBe(false);
  });

  it('grants manageAssignments to teachers by default', () => {
    expect(hasPermission({ roles: ['teacher'] }, 'manageAssignments')).toBe(true);
  });
});
