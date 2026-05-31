import { DEFAULT_ROLE_PERMISSIONS, hasPermission } from '@educonnect/shared';

describe('default role permissions', () => {
  it('gives principals expected oversight permissions', () => {
    expect(DEFAULT_ROLE_PERMISSIONS.principal).toEqual(
      expect.arrayContaining([
        'viewStudents',
        'manageStudents',
        'manageTeachers',
        'viewAttendance',
        'viewAssignments',
        'viewFees',
        'viewFinancials',
        'viewReports',
      ])
    );
  });

  it('gives teachers expected classroom read permissions', () => {
    expect(DEFAULT_ROLE_PERMISSIONS.teacher).toEqual(
      expect.arrayContaining(['viewStudents', 'viewAssignments', 'viewAttendance'])
    );
  });

  it('gives operational roles the student visibility used by their workflows', () => {
    expect(DEFAULT_ROLE_PERMISSIONS.librarian).toContain('viewStudents');
    expect(DEFAULT_ROLE_PERMISSIONS.staff).toEqual(
      expect.arrayContaining(['viewStudents', 'viewAttendance'])
    );
  });

  it('uses defaults when an actor has no explicit permission map', () => {
    expect(hasPermission({ role: 'principal' }, 'manageStudents')).toBe(true);
    expect(hasPermission({ role: 'teacher' }, 'viewStudents')).toBe(true);
    expect(hasPermission({ role: 'staff' }, 'viewAttendance')).toBe(true);
  });
});
