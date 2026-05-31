import { readFileSync } from 'node:fs';
import { join } from 'node:path';

function read(path: string) {
  return readFileSync(join(process.cwd(), path), 'utf8');
}

describe('production hardening guardrails', () => {
  it('restricts assignment submissions to student actors', () => {
    const routes = read('apps/functions/src/features/assignments/assignments.routes.ts');
    const submitRoute = routes.slice(
      routes.indexOf("['/:id/submit', '/submit']"),
      routes.indexOf("'/recheck'")
    );

    expect(submitRoute).toContain("['/:id/submit', '/submit']");
    expect(submitRoute).toContain("requireRole('student')");
    expect(submitRoute).toContain('validate(submitAssignmentSchema)');
  });

  it('rolls back Supabase Auth users when managed user provisioning fails mid-flight', () => {
    const source = read('apps/functions/src/lib/user-management.ts');
    const createManagedUser = source.slice(
      source.indexOf('export async function createManagedUser')
    );

    expect(createManagedUser).toContain('try {');
    expect(createManagedUser).toContain('catch (error)');
    expect(createManagedUser).toContain('auth.deleteUser(userRecord.uid)');
    expect(createManagedUser).toContain(".from('documents').delete()");
    expect(createManagedUser).toContain(".from('user_tenants').delete()");
  });

  it('standardizes workspace Node version on 22', () => {
    const rootPackage = JSON.parse(read('package.json'));
    const mobilePackage = JSON.parse(read('apps/mobile/package.json'));

    expect(read('.nvmrc').trim()).toBe('22');
    expect(read('.node-version').trim()).toBe('22');
    expect(rootPackage.engines.node).toBe('>=22');
    expect(mobilePackage.engines.node).toBe('>=22');
  });
});
