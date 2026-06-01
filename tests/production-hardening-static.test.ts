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
    const rollbackCreatedUser = source.slice(
      source.indexOf('async function rollbackCreatedUser'),
      source.indexOf('async function countActiveAdmins')
    );

    expect(createManagedUser).toContain('try {');
    expect(createManagedUser).toContain('catch (error)');
    expect(createManagedUser).toContain('rollbackCreatedUser(userRecord.uid');
    expect(rollbackCreatedUser).toContain('auth.deleteUser(uid)');
    expect(rollbackCreatedUser).toContain('userRef.delete()');
    expect(rollbackCreatedUser).toContain(".from('profiles').delete()");
    expect(rollbackCreatedUser).toContain(".from('user_tenants').delete()");
  });

  it('authorizes requested tenants before creating managed users', () => {
    const repository = read('apps/functions/src/features/users/users.repository.ts');
    const createMethod = repository.slice(repository.indexOf('static async create'));

    expect(createMethod).toContain('requestedTenantId');
    expect(createMethod).toContain('typeof data.tenantId');
    expect(createMethod).toContain('typeof data.schoolId');
    expect(createMethod).toContain('assertCanManageTenant(req, requestedTenantId)');
    expect(createMethod).toContain('tenantId: requestedTenantId');
  });

  it('defaults new backend uploads to Firebase Storage', () => {
    const storageIndex = read('apps/functions/src/lib/storage/index.ts');
    const config = read('apps/functions/src/lib/config.ts');

    expect(storageIndex).toContain("process.env.STORAGE_PROVIDER || 'firebase'");
    expect(config).toContain(
      "STORAGE_PROVIDER: z.enum(['firebase', 'supabase']).default('firebase')"
    );
  });

  it('does not leave broad authenticated Supabase Storage object policies in the latest migration', () => {
    const migration = read('supabase/migrations/20260531010000_harden_storage_object_policies.sql');

    expect(migration).toContain('drop policy if exists "authenticated select educonnect files"');
    expect(migration).toContain('drop policy if exists "authenticated delete educonnect files"');
    expect(migration).toContain('private.auth_profile_school_id()');
    expect(migration).toContain('private.auth_managed_tenant_ids()');
    expect(migration).not.toContain("using (bucket_id = 'educonnect-uploads');");
  });

  it('standardizes workspace Node version on 22', () => {
    const rootPackage = JSON.parse(read('package.json'));
    const mobilePackage = JSON.parse(read('apps/mobile/package.json'));

    expect(read('.nvmrc').trim()).toBe('22');
    expect(read('.node-version').trim()).toBe('22');
    expect(rootPackage.engines.node).toBe('>=22');
    expect(mobilePackage.engines.node).toBe('>=22');
  });

  it('fails API smoke monitoring closed against real HTTPS deployments', () => {
    const workflow = read('.github/workflows/api-smoke.yml');

    expect(workflow).toContain('API_BASE_URL is required for API smoke checks');
    expect(workflow).toContain('exit 1');
    expect(workflow).toContain('https://*/api');
    expect(workflow).toContain('API_BASE_URL must be an HTTPS URL ending in /api');
    expect(workflow).not.toContain('skipping smoke test');
    expect(workflow).not.toContain('http://localhost*/api');
    expect(workflow).not.toContain('http://127.*/api');
  });
});
