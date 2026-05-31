import { LibraryRepository } from '../src/features/library/library.repository.js';

const resourceDocRef = {
  get: jest.fn(),
  update: jest.fn(),
};

const borrowDocRef = {
  get: jest.fn(),
  update: jest.fn(),
};

const collectionRefs = {
  library: {
    doc: jest.fn(() => resourceDocRef),
  },
  borrowRecords: {
    doc: jest.fn(() => borrowDocRef),
    where: jest.fn(),
    get: jest.fn(),
  },
};

const rpc = jest.fn();

jest.mock('../src/lib/documents.js', () => ({
  db: {
    collection: jest.fn((name: 'library' | 'borrowRecords') => collectionRefs[name]),
  },
}));

jest.mock('../src/lib/supabase.js', () => ({
  getSupabaseAdmin: jest.fn(() => ({ rpc })),
}));

jest.mock('../src/lib/notifications.js', () => ({
  createNotification: jest.fn().mockResolvedValue(undefined),
}));

function resource(overrides: Record<string, unknown> = {}) {
  return {
    tenantId: 'tenant-a',
    schoolId: 'tenant-a',
    title: 'Physics',
    subject: 'Science',
    grade: '10',
    type: 'ebook',
    visibility: 'all',
    availableCopies: 1,
    borrowedCount: 0,
    status: 'active',
    ...overrides,
  };
}

function borrowRecord(overrides: Record<string, unknown> = {}) {
  return {
    tenantId: 'tenant-a',
    schoolId: 'tenant-a',
    resourceId: 'resource-1',
    studentId: 'student-1',
    status: 'borrowed',
    ...overrides,
  };
}

const student = {
  uid: 'student-1',
  email: 'student@example.com',
  role: 'student',
  roles: ['student'],
  schoolId: 'tenant-a',
};

describe('library borrow safety', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resourceDocRef.get.mockResolvedValue({
      exists: true,
      data: () => resource(),
    });
    borrowDocRef.get.mockResolvedValue({
      exists: true,
      data: () => borrowRecord(),
    });
    rpc.mockResolvedValue({
      data: {
        id: 'borrow-1',
        ...borrowRecord({
          borrowedAt: '2026-05-31T00:00:00.000Z',
          dueAt: '2026-06-14T00:00:00.000Z',
          returnedAt: null,
        }),
      },
      error: null,
    });
  });

  it('uses the atomic borrow RPC instead of read-then-increment updates', async () => {
    const result = await LibraryRepository.borrow('resource-1', student, 'tenant-a', student);

    expect(rpc).toHaveBeenCalledWith(
      'borrow_library_resource_document',
      expect.objectContaining({
        p_resource_id: 'resource-1',
        p_tenant_id: 'tenant-a',
        p_student_id: 'student-1',
        p_student_name: 'student@example.com',
      })
    );
    expect(resourceDocRef.update).not.toHaveBeenCalled();
    expect(collectionRefs.borrowRecords.get).not.toHaveBeenCalled();
    expect(result).toMatchObject({ id: 'borrow-1', status: 'borrowed' });
  });

  it('maps atomic no-copy failures to the existing API error', async () => {
    rpc.mockResolvedValue({
      data: null,
      error: { message: 'LIBRARY_NO_COPIES_AVAILABLE' },
    });

    await expect(
      LibraryRepository.borrow('resource-1', student, 'tenant-a', student)
    ).rejects.toMatchObject({
      message: 'No copies available for borrowing',
      statusCode: 409,
    });
  });

  it('uses the atomic return RPC instead of read-then-decrement updates', async () => {
    rpc.mockResolvedValue({
      data: { success: true, id: 'borrow-1', status: 'returned' },
      error: null,
    });

    const result = await LibraryRepository.return('borrow-1', student, 'tenant-a');

    expect(rpc).toHaveBeenCalledWith(
      'return_library_resource_document',
      expect.objectContaining({
        p_record_id: 'borrow-1',
        p_tenant_id: 'tenant-a',
        p_actor_id: 'student-1',
      })
    );
    expect(borrowDocRef.update).not.toHaveBeenCalled();
    expect(resourceDocRef.update).not.toHaveBeenCalled();
    expect(result).toEqual({ success: true, id: 'borrow-1', status: 'returned' });
  });

  it('maps atomic duplicate borrow failures to the existing API error', async () => {
    rpc.mockResolvedValue({
      data: null,
      error: { message: 'LIBRARY_ALREADY_BORROWED' },
    });

    await expect(
      LibraryRepository.borrow('resource-1', student, 'tenant-a', student)
    ).rejects.toMatchObject({
      message: 'Resource is already borrowed by this user',
      statusCode: 409,
    });
  });
});
