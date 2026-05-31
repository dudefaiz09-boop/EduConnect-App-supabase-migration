import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const migrationPath = join(
  process.cwd(),
  'supabase/migrations/20260531000000_identity_tenant_rls_and_sources.sql'
);

function read(path: string) {
  return readFileSync(join(process.cwd(), path), 'utf8');
}

describe('identity and tenant migration hardening', () => {
  const migration = readFileSync(migrationPath, 'utf8');

  it('replaces broad profile and tenant policies with role-scoped reads', () => {
    expect(migration).toContain('create policy "role scoped profiles read"');
    expect(migration).toContain('create policy "role scoped tenants read"');
    expect(migration).toContain('create policy "role scoped user_tenants read"');
    expect(migration).toContain('private.auth_active_tenant_ids()');
    expect(migration).toContain("private.auth_has_any_role(array['admin', 'principal'])");
  });

  it('does not allow tenant-wide reads of legacy user documents', () => {
    const usersStart = migration.indexOf("collection = 'users'");
    const usersEnd = migration.indexOf("collection in ('announcements'", usersStart);
    const usersPolicy = migration.slice(usersStart, usersEnd);

    expect(usersPolicy).toContain('id = auth.uid()::text');
    expect(usersPolicy).toContain("private.document_has_any_role(data, array['student'])");
    expect(usersPolicy).toContain("private.document_text_array(data, 'classIds')");
    expect(usersPolicy).toContain('private.auth_profile_linked_student_ids()');
    expect(usersPolicy).not.toMatch(
      /collection = 'users'[\s\S]+or private\.auth_same_school\(coalesce\(data ->> 'tenantId', data ->> 'schoolId'\)\)/
    );
  });

  it('keeps notifications filtered by target audience instead of only tenant', () => {
    const notificationsStart = migration.indexOf("collection = 'notifications'");
    const notificationsEnd = migration.indexOf("collection = 'conversations'", notificationsStart);
    const notificationsPolicy = migration.slice(notificationsStart, notificationsEnd);

    expect(notificationsPolicy).toContain("private.document_text_array(data, 'targetRoles')");
    expect(notificationsPolicy).toContain("private.document_text_array(data, 'targetClasses')");
    expect(notificationsPolicy).toContain("data -> 'targetUserIds'");
    expect(notificationsPolicy).toContain("data -> 'archivedBy'");
  });
});

describe('normalized identity sources', () => {
  it('prefers profiles for API profile lookup', () => {
    const source = read('apps/functions/src/lib/identity-profile.ts');

    expect(source).toContain(".from('profiles')");
    expect(source).toContain(".eq('collection', 'users')");
    expect(source.indexOf(".from('profiles')")).toBeLessThan(
      source.indexOf(".eq('collection', 'users')")
    );
  });

  it('lists users and tenants from normalized tables', () => {
    const source = read('apps/functions/src/features/users/users.repository.ts');

    expect(source).toContain(".from('profiles')");
    expect(source).toContain(".from('tenants')");
    expect(source).not.toContain(".collection('schools')");
  });

  it('checks active tenants against the tenants table', () => {
    const source = read('apps/functions/src/middleware/tenant.ts');

    expect(source).toContain(".from('tenants')");
    expect(source).toContain(".select('status')");
    expect(source).not.toContain(".eq('collection', 'tenants')");
  });

  it('lets the web auth context read profiles before the compatibility document', () => {
    const source = read('apps/web/src/contexts/AuthContext.tsx');

    expect(source.indexOf(".from('profiles')")).toBeLessThan(
      source.indexOf(".eq('collection', 'users')")
    );
  });
});
