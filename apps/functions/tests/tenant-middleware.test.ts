import type { Request, Response, NextFunction } from 'express';
import { tenantMiddleware } from '../src/middleware/tenant.js';
import { runWithContext } from '../src/lib/context.js';

const maybeSingle = jest.fn();
const eq = jest.fn(() => ({ maybeSingle }));
const select = jest.fn(() => ({ eq }));
const from = jest.fn(() => ({ select }));

jest.mock('../src/lib/supabase.js', () => ({
  getSupabaseAdmin: jest.fn(() => ({ from })),
}));

type TestUser = NonNullable<Request['user']>;

function user(patch: Partial<TestUser> = {}): TestUser {
  return {
    uid: 'user-1',
    email: 'user@example.test',
    role: 'student',
    roles: ['student'],
    schoolId: 'tenant-a',
    isAdmin: false,
    isSuperAdmin: false,
    managedTenantIds: [],
    permissions: {},
    classIds: [],
    subjectIds: [],
    sectionIds: [],
    linkedStudentIds: [],
    assignedModules: [],
    status: 'active',
    ...patch,
  };
}

function request(input: { headers?: Record<string, string>; user?: TestUser } = {}) {
  return {
    headers: input.headers || {},
    user: input.user,
    path: '/api/attendance',
  } as Request;
}

function response() {
  return {} as Response;
}

function run(req: Request) {
  return runWithContext(
    {
      correlationId: 'tenant-test-correlation',
      requestId: 'tenant-test-request',
      startedAt: Date.now(),
    },
    () =>
      new Promise<unknown>((resolve) => {
        tenantMiddleware(req, response(), ((error?: unknown) => resolve(error)) as NextFunction);
      })
  );
}

describe('tenant middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    maybeSingle.mockResolvedValue({ data: { status: 'active' }, error: null });
  });

  it('requires an authenticated user before resolving a tenant', async () => {
    const error = await run(request());

    expect(error).toMatchObject({
      code: 'AUTH_MISSING',
      statusCode: 401,
    });
    expect(from).not.toHaveBeenCalled();
  });

  it('rejects non-admin tenant header overrides', async () => {
    const error = await run(
      request({
        headers: { 'x-school-id': 'tenant-b' },
        user: user({ schoolId: 'tenant-a' }),
      })
    );

    expect(error).toMatchObject({
      code: 'TENANT_MISMATCH',
      statusCode: 403,
    });
    expect(from).not.toHaveBeenCalled();
  });

  it('requires a tenant when the user has no assigned school', async () => {
    const error = await run(request({ user: user({ schoolId: null }) }));

    expect(error).toMatchObject({
      code: 'TENANT_REQUIRED',
      statusCode: 400,
    });
    expect(from).not.toHaveBeenCalled();
  });

  it('rejects unknown tenants from the tenant registry', async () => {
    maybeSingle.mockResolvedValueOnce({ data: null, error: null });

    const error = await run(request({ user: user({ schoolId: 'tenant-missing' }) }));

    expect(error).toMatchObject({
      code: 'TENANT_NOT_FOUND',
      statusCode: 403,
    });
  });

  it('rejects inactive tenants from the tenant registry', async () => {
    maybeSingle.mockResolvedValueOnce({ data: { status: 'inactive' }, error: null });

    const error = await run(request({ user: user({ schoolId: 'tenant-inactive' }) }));

    expect(error).toMatchObject({
      code: 'TENANT_INACTIVE',
      statusCode: 403,
    });
  });

  it('binds the assigned tenant for a normal user', async () => {
    const req = request({ user: user({ schoolId: 'tenant-normal' }) });

    const error = await run(req);

    expect(error).toBeUndefined();
    expect(req.tenantId).toBe('tenant-normal');
    expect(from).toHaveBeenCalledWith('tenants');
    expect(eq).toHaveBeenCalledWith('id', 'tenant-normal');
  });

  it('allows a super admin to switch to a requested tenant', async () => {
    const req = request({
      headers: { 'x-school-id': 'tenant-managed' },
      user: user({
        schoolId: 'tenant-a',
        isAdmin: true,
        isSuperAdmin: true,
        managedTenantIds: ['tenant-managed'],
      }),
    });

    const error = await run(req);

    expect(error).toBeUndefined();
    expect(req.tenantId).toBe('tenant-managed');
    expect(eq).toHaveBeenCalledWith('id', 'tenant-managed');
  });
});

describe('tenant middleware production hardening', () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    maybeSingle.mockResolvedValue({ data: { status: 'active' }, error: null });
    process.env = { ...OLD_ENV, NODE_ENV: 'production' };
  });

  afterAll(() => {
    process.env = OLD_ENV;
  });

  it('still binds the assigned tenant for a normal user in production', async () => {
    const req = request({ user: user({ schoolId: 'tenant-normal' }) });

    const error = await run(req);

    expect(error).toBeUndefined();
    expect(req.tenantId).toBe('tenant-normal');
  });

  it('uses a production-specific error message when tenant is missing', async () => {
    const error = await run(request({ user: user({ schoolId: null }) }));

    expect(error).toMatchObject({
      code: 'TENANT_REQUIRED',
      statusCode: 400,
      message:
        'Tenant context is required. Provide x-school-id header or ensure user token includes a schoolId claim.',
    });
  });

  it('still rejects mismatched tenant headers in production', async () => {
    const error = await run(
      request({
        headers: { 'x-school-id': 'tenant-b' },
        user: user({ schoolId: 'tenant-a' }),
      })
    );

    expect(error).toMatchObject({
      code: 'TENANT_MISMATCH',
      statusCode: 403,
    });
  });
});
