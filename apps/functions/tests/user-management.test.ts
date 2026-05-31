const mockUserDoc = {
  get: jest.fn(),
  set: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};

const mockAuditCollection = {
  add: jest.fn(),
};

const mockUsersCollection = {
  doc: jest.fn(() => mockUserDoc),
  get: jest.fn(),
};

const mockDb = {
  collection: jest.fn((name: string) => {
    if (name === 'auditLogs') return mockAuditCollection;
    return mockUsersCollection;
  }),
};

const mockAuth = {
  createUser: jest.fn(),
  setCustomUserClaims: jest.fn(),
  deleteUser: jest.fn(),
  getSupabaseAdmin: jest.fn(),
};

jest.mock('../src/lib/documents.js', () => ({
  auth: mockAuth,
  db: mockDb,
}));

jest.mock('../src/lib/context.js', () => ({
  getTenantId: jest.fn(() => 'tenant-a'),
}));

import { createManagedUser, updateManagedUser } from '../src/lib/user-management.js';

function actor() {
  return { uid: 'admin-1', email: 'admin@example.test', schoolId: 'tenant-a' };
}

function payload() {
  return {
    email: 'teacher@example.test',
    password: 'change-me-now',
    displayName: 'Teacher One',
    role: 'teacher',
    tenantId: 'tenant-a',
  };
}

function supabaseWithErrors(errors: Record<string, unknown> = {}) {
  return {
    from: jest.fn((table: string) => ({
      upsert: jest.fn().mockResolvedValue({ error: errors[table] || null }),
    })),
  };
}

describe('managed user provisioning', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuth.createUser.mockResolvedValue({
      uid: 'auth-user-1',
      email: 'teacher@example.test',
      displayName: 'Teacher One',
    });
    mockAuth.setCustomUserClaims.mockResolvedValue(undefined);
    mockAuth.deleteUser.mockResolvedValue(undefined);
    mockAuth.getSupabaseAdmin.mockReturnValue(supabaseWithErrors());
    mockUserDoc.get.mockResolvedValue({ exists: true, data: () => ({}) });
    mockUserDoc.set.mockResolvedValue(undefined);
    mockUserDoc.update.mockResolvedValue(undefined);
    mockUserDoc.delete.mockResolvedValue(undefined);
    mockAuditCollection.add.mockResolvedValue({ id: 'audit-1' });
    mockUsersCollection.get.mockResolvedValue({ docs: [] });
  });

  it('rolls back the created Auth user when claim provisioning fails', async () => {
    mockAuth.setCustomUserClaims.mockRejectedValueOnce(new Error('claims failed'));

    await expect(createManagedUser(payload(), actor())).rejects.toThrow('claims failed');

    expect(mockAuth.deleteUser).toHaveBeenCalledWith('auth-user-1');
    expect(mockUserDoc.delete).toHaveBeenCalled();
    expect(mockAuditCollection.add).not.toHaveBeenCalled();
  });

  it('fails and rolls back when user_tenants sync returns a Supabase error', async () => {
    mockAuth.getSupabaseAdmin.mockReturnValue(
      supabaseWithErrors({
        user_tenants: { message: 'duplicate tenant link', code: '23505', status: 500 },
      })
    );

    await expect(createManagedUser(payload(), actor())).rejects.toThrow(
      'user_tenants sync failed: duplicate tenant link'
    );

    expect(mockAuth.deleteUser).toHaveBeenCalledWith('auth-user-1');
    expect(mockUserDoc.delete).toHaveBeenCalled();
    expect(mockAuditCollection.add).not.toHaveBeenCalled();
  });

  it('surfaces normalized profile sync failures during managed user updates', async () => {
    mockUserDoc.get.mockResolvedValue({
      exists: true,
      data: () => ({
        uid: 'teacher-1',
        email: 'teacher@example.test',
        displayName: 'Teacher One',
        role: 'teacher',
        roles: ['teacher'],
        tenantId: 'tenant-a',
        schoolId: 'tenant-a',
        status: 'active',
      }),
    });
    mockAuth.getSupabaseAdmin.mockReturnValue(
      supabaseWithErrors({
        profiles: { message: 'profile write failed', status: 500 },
      })
    );

    await expect(
      updateManagedUser('teacher-1', { displayName: 'Teacher Updated' }, actor())
    ).rejects.toThrow('profiles sync failed: profile write failed');

    expect(mockAuditCollection.add).not.toHaveBeenCalled();
  });
});
