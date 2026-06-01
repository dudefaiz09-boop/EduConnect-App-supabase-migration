const from = jest.fn();

const mockAuth = {
  getSupabaseAdmin: jest.fn(() => ({ from })),
};

jest.mock('../src/lib/documents.js', () => ({
  auth: mockAuth,
  db: {},
}));

import { UsersRepository } from '../src/features/users/users.repository.js';

function req(patch: Record<string, unknown> = {}) {
  return {
    user: {
      uid: 'super-admin-1',
      isSuperAdmin: true,
      permissions: { manageUsers: true },
    },
    ...patch,
  } as any;
}

function table(error: unknown = null) {
  return {
    upsert: jest.fn().mockResolvedValue({ error }),
  };
}

describe('tenant provisioning repository', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('requires a super admin to create tenants', async () => {
    await expect(
      UsersRepository.createTenant(
        { id: 'tenant-a', name: 'Tenant A', slug: 'tenant-a' },
        req({ user: { uid: 'admin-1', isSuperAdmin: false } })
      )
    ).rejects.toThrow('Only super admins can create tenants');

    expect(from).not.toHaveBeenCalled();
  });

  it('writes normalized tenants and legacy school documents for compatibility', async () => {
    const tenants = table();
    const documents = table();
    from.mockImplementation((name: string) => (name === 'tenants' ? tenants : documents));

    const result = await UsersRepository.createTenant(
      { id: 'tenant-a', name: 'Tenant A', slug: 'tenant-a' },
      req()
    );

    expect(from).toHaveBeenCalledWith('tenants');
    expect(tenants.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'tenant-a',
        name: 'Tenant A',
        slug: 'tenant-a',
        status: 'active',
      }),
      { onConflict: 'id' }
    );
    expect(from).toHaveBeenCalledWith('documents');
    expect(documents.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'schools',
        id: 'tenant-a',
        data: expect.objectContaining({
          tenantId: 'tenant-a',
          schoolId: 'tenant-a',
          name: 'Tenant A',
        }),
      }),
      { onConflict: 'collection,id' }
    );
    expect(result).toEqual(
      expect.objectContaining({
        id: 'tenant-a',
        name: 'Tenant A',
        slug: 'tenant-a',
        status: 'active',
      })
    );
  });

  it('surfaces legacy compatibility document write failures', async () => {
    from.mockImplementation((name: string) =>
      name === 'tenants' ? table() : table({ message: 'document upsert failed' })
    );

    await expect(
      UsersRepository.createTenant({ id: 'tenant-a', name: 'Tenant A', slug: 'tenant-a' }, req())
    ).rejects.toMatchObject({ message: 'document upsert failed' });
  });
});
