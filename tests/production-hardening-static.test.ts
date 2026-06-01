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

  it('does not call class-scoped attendance endpoints without a selected class', () => {
    const source = read('apps/web/src/pages/Attendance.tsx');
    const markingLoader = source.slice(
      source.indexOf('const loadMarkingData'),
      source.indexOf('const loadHistory')
    );
    const reportsStart = source.indexOf('const loadReports');
    const reportsLoader = source.slice(
      reportsStart,
      source.indexOf('useEffect(() => {', reportsStart)
    );

    expect(source).toContain('userDocuments.forEach((profile)');
    expect(markingLoader.indexOf('if (!selectedClass)')).toBeLessThan(
      markingLoader.indexOf('`/api/attendance?classId=${selectedClass}')
    );
    expect(reportsLoader.indexOf('if (!selectedClass)')).toBeLessThan(
      reportsLoader.indexOf('`/api/attendance/report/${selectedClass}`')
    );
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

  it('keeps deployment docs generic and aligned with normalized tenant lookup', () => {
    const deploymentDocs = [
      read('README.md'),
      read('docs/API_DEPLOYMENT_CHECKLIST.md'),
      read('apps/web/.env.example'),
      read('apps/web/src/lib/env.ts'),
    ].join('\n');
    const tenantDocs = read('docs/AUTH_TENANT_MIDDLEWARE.md');
    const tenantMiddleware = read('apps/functions/src/middleware/tenant.ts');

    expect(deploymentDocs).toContain('https://your-api-project.vercel.app/api');
    expect(deploymentDocs).not.toContain('educonnect-api-sigma.vercel.app');
    expect(deploymentDocs).not.toContain('educonnect-web-iota.vercel.app');
    expect(tenantDocs).toContain('public.tenants.id = tenantId');
    expect(tenantDocs).not.toContain('documents/tenants');
    expect(tenantMiddleware).toContain(".from('tenants')");
  });

  it('keeps storage docs aligned with Firebase-backed upload sessions', () => {
    const storageDocs = [
      read('PRODUCTION_READINESS_CHECKLIST.md'),
      read('RELEASE_GUIDE.md'),
      read('docs/SUPABASE_ENV_SETUP.md'),
      read('docs/WEB_ENVIRONMENT.md'),
      read('IBM_BOB_AUDIT_FINDINGS.md'),
    ].join('\n');
    const lhciServer = read('scripts/lhci-start-server.cjs');
    const turboConfig = read('turbo.json');
    const playwrightConfig = read('playwright.config.ts');

    expect(storageDocs).toContain('File upload via backend-signed Firebase Storage sessions');
    expect(storageDocs).toContain('legacy Supabase Storage reads/deletes');
    expect(storageDocs).not.toContain('File upload via Supabase Storage');
    expect(storageDocs).not.toContain('VITE_SUPABASE_UPLOADS_BUCKET');
    expect(lhciServer).not.toContain('VITE_SUPABASE_UPLOADS_BUCKET');
    expect(turboConfig).not.toContain('VITE_SUPABASE_UPLOADS_BUCKET');
    expect(playwrightConfig).not.toContain('VITE_SUPABASE_UPLOADS_BUCKET');
  });

  it('registers new tenants through trusted backend before onboarding tenant admins', () => {
    const adminConsole = read('apps/admin-console/src/App.tsx');
    const app = read('apps/functions/src/app.ts').replace(/\r\n/g, '\n');
    const repository = read('apps/functions/src/features/users/users.repository.ts');

    expect(adminConsole).toContain("apiUrl(apiBase, '/users/tenants')");
    expect(adminConsole).toContain("apiUrl(apiBase, '/users/global')");
    expect(adminConsole).toContain("apiUrl(apiBase, '/auth/profile')");
    expect(adminConsole).toContain("apiUrl(apiBase, '/users/create')");
    expect(adminConsole).toContain("apiUrl(apiBase, '/health')");
    expect(adminConsole).toContain("'X-School-Id': newSchoolId");
    expect(adminConsole).not.toContain(".from('documents')");
    expect(adminConsole).not.toContain("supabase.from('documents').insert");
    expect(adminConsole).not.toContain("supabase.from('tenants').insert");
    expect(app).toContain("protectedRouter.get('/users/tenants'");
    expect(app).toContain("'/users/global'");
    expect(app).toContain("protectedRouter.post(\n  '/users/tenants'");
    const tenantCreateRoute = app.slice(
      app.indexOf("protectedRouter.post(\n  '/users/tenants'"),
      app.indexOf('protectedRouter.use(tenantMiddleware)')
    );
    expect(tenantCreateRoute).toContain('tenantProvisioningLimiter');
    expect(tenantCreateRoute).toContain('idempotencyMiddleware');
    expect(tenantCreateRoute).toContain("requirePermission('manageUsers')");
    expect(app.indexOf("protectedRouter.get('/users/tenants'")).toBeLessThan(
      app.indexOf('protectedRouter.use(tenantMiddleware)')
    );
    expect(app.indexOf("'/users/global'")).toBeLessThan(
      app.indexOf('protectedRouter.use(tenantMiddleware)')
    );
    expect(app.indexOf("protectedRouter.post(\n  '/users/tenants'")).toBeLessThan(
      app.indexOf('protectedRouter.use(tenantMiddleware)')
    );
    expect(repository).toContain('Only super admins can create tenants');
    expect(repository).toContain('Only super admins can list all users');
    expect(repository).toContain('return Boolean(req.user!.isSuperAdmin)');
    expect(repository).toContain(".from('tenants')");
    expect(repository).toContain(".from('documents').upsert");
    expect(read('apps/functions/src/middleware/tenant.ts')).toContain(
      'Super admin global tenant switch'
    );
  });
});
