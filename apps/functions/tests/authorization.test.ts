import {
  actorHasRole,
  isSchoolAdmin,
  isLeadership,
  getActorClassIds,
  assertCanAccessStudent,
  assertCanAccessClass,
  assertCanManageClass,
  assertStudentsBelongToClass,
} from '../src/lib/authorization.js';

function mockDoc(exists: boolean, data: Record<string, unknown> = {}) {
  return {
    exists,
    data: jest.fn(() => data),
    get ref() {
      return { id: data.uid || 'unknown' };
    },
  };
}

function mockQuerySnapshot(docs: Array<{ id: string; data: Record<string, unknown> }>) {
  return {
    docs: docs.map((d) => ({
      id: d.id,
      data: jest.fn(() => d.data),
    })),
  };
}

function makeActor(overrides: Record<string, unknown> = {}) {
  return {
    uid: 'actor-1',
    role: 'student',
    roles: ['student'],
    classId: '10A',
    classIds: ['10A'],
    linkedStudentIds: [],
    isAdmin: false,
    isSuperAdmin: false,
    schoolId: 'tenant-a',
    ...overrides,
  };
}

const mockDocRef = { get: jest.fn() };
const mockCollectionRef = {
  doc: jest.fn(() => mockDocRef),
  where: jest.fn(),
  get: jest.fn(),
};
mockCollectionRef.where.mockReturnValue(mockCollectionRef);

jest.mock('../src/lib/documents.js', () => ({
  db: { collection: jest.fn(() => mockCollectionRef) },
}));

import { db } from '../src/lib/documents.js';

async function expectReject(fn: () => Promise<unknown>, match: string | RegExp) {
  let error: Error | null = null;
  try {
    await fn();
  } catch (e) {
    error = e as Error;
  }
  expect(error).not.toBeNull();
  if (error) {
    expect(error.message).toMatch(match);
  }
}

const userDocs = new Map<string, Record<string, unknown>>();
let classDocs: Array<{ id: string; data: Record<string, unknown> }> = [];

beforeEach(() => {
  jest.clearAllMocks();
  userDocs.clear();
  classDocs = [];

  const collectionRef = db.collection();

  collectionRef.doc.mockImplementation((id: string) => {
    const data = userDocs.get(id);
    return {
      get: jest.fn().mockResolvedValue(mockDoc(!!data, data || {})),
    };
  });

  collectionRef.where.mockReturnValue(collectionRef);
  collectionRef.get.mockImplementation(() => Promise.resolve(mockQuerySnapshot(classDocs)));
});

function setupUserDoc(uid: string, data: Record<string, unknown>) {
  userDocs.set(uid, data);
}

function setupClasses(classes: Array<{ id: string; data: Record<string, unknown> }>) {
  classDocs = classes;
}

describe('actorHasRole', () => {
  it('returns true for primary role', () => {
    expect(actorHasRole(makeActor({ role: 'teacher' }), 'teacher')).toBe(true);
  });

  it('returns true for role in roles array', () => {
    expect(actorHasRole(makeActor({ roles: ['teacher', 'librarian'] }), 'librarian')).toBe(true);
  });

  it('returns false when role is absent', () => {
    expect(actorHasRole(makeActor({ role: 'student' }), 'admin')).toBe(false);
  });
});

describe('isSchoolAdmin', () => {
  it('returns true for isAdmin', () => {
    expect(isSchoolAdmin(makeActor({ isAdmin: true }))).toBe(true);
  });

  it('returns true for isSuperAdmin', () => {
    expect(isSchoolAdmin(makeActor({ isSuperAdmin: true }))).toBe(true);
  });

  it('returns true for admin role', () => {
    expect(isSchoolAdmin(makeActor({ role: 'admin', roles: ['admin'] }))).toBe(true);
  });

  it('returns true for super_admin role', () => {
    expect(isSchoolAdmin(makeActor({ role: 'super_admin', roles: ['super_admin'] }))).toBe(true);
  });

  it('returns false for teacher', () => {
    expect(isSchoolAdmin(makeActor({ role: 'teacher', roles: ['teacher'] }))).toBe(false);
  });
});

describe('isLeadership', () => {
  it('returns true for admin', () => {
    expect(isLeadership(makeActor({ role: 'admin', roles: ['admin'] }))).toBe(true);
  });

  it('returns true for principal', () => {
    expect(isLeadership(makeActor({ role: 'principal', roles: ['principal'] }))).toBe(true);
  });

  it('returns true for president (legacy)', () => {
    expect(isLeadership(makeActor({ role: 'president', roles: ['president'] }))).toBe(true);
  });

  it('returns false for teacher', () => {
    expect(isLeadership(makeActor({ role: 'teacher', roles: ['teacher'] }))).toBe(false);
  });

  it('returns false for student', () => {
    expect(isLeadership(makeActor({ role: 'student', roles: ['student'] }))).toBe(false);
  });

  it('returns false for parent', () => {
    expect(isLeadership(makeActor({ role: 'parent', roles: ['parent'] }))).toBe(false);
  });
});

describe('getActorClassIds', () => {
  it('uses classIds array', () => {
    expect(getActorClassIds(makeActor({ classIds: ['10A', '10B'] }))).toEqual(['10A', '10B']);
  });

  it('falls back to classId string', () => {
    expect(getActorClassIds(makeActor({ classId: '10A', classIds: undefined }))).toEqual(['10A']);
  });

  it('removes duplicates', () => {
    expect(
      getActorClassIds(makeActor({ classId: '10A', classIds: ['10A', '10A', '10B'] }))
    ).toEqual(['10A', '10B']);
  });

  it('filters empty values', () => {
    expect(getActorClassIds(makeActor({ classId: '', classIds: ['', '10A'] }))).toEqual(['10A']);
  });
});

describe('assertCanAccessStudent', () => {
  it('admin is allowed', async () => {
    const admin = makeActor({ role: 'admin', roles: ['admin'] });
    await expect(assertCanAccessStudent(admin, 'student-1', 'tenant-a')).resolves.toBeUndefined();
  });

  it('principal is allowed', async () => {
    const principal = makeActor({ role: 'principal', roles: ['principal'] });
    await expect(
      assertCanAccessStudent(principal, 'student-1', 'tenant-a')
    ).resolves.toBeUndefined();
  });

  it('student can access own record', async () => {
    const student = makeActor({ uid: 'student-1', role: 'student', roles: ['student'] });
    await expect(assertCanAccessStudent(student, 'student-1', 'tenant-a')).resolves.toBeUndefined();
  });

  it('parent can access linked student', async () => {
    const parent = makeActor({
      role: 'parent',
      roles: ['parent'],
      linkedStudentIds: ['student-1'],
    });
    await expect(assertCanAccessStudent(parent, 'student-1', 'tenant-a')).resolves.toBeUndefined();
  });

  it('teacher can access student in same class', async () => {
    setupUserDoc('student-1', {
      role: 'student',
      classIds: ['10A'],
      tenantId: 'tenant-a',
    });
    const teacher = makeActor({ role: 'teacher', roles: ['teacher'], classIds: ['10A'] });
    await expect(assertCanAccessStudent(teacher, 'student-1', 'tenant-a')).resolves.toBeUndefined();
  });

  it('staff can access student in same class', async () => {
    setupUserDoc('student-1', {
      role: 'student',
      classIds: ['10A'],
      tenantId: 'tenant-a',
    });
    const staff = makeActor({ role: 'staff', roles: ['staff'], classIds: ['10A'] });
    await expect(assertCanAccessStudent(staff, 'student-1', 'tenant-a')).resolves.toBeUndefined();
  });

  it('unrelated teacher is denied', async () => {
    setupUserDoc('student-1', {
      role: 'student',
      classIds: ['10B'],
      tenantId: 'tenant-a',
    });
    const teacher = makeActor({ role: 'teacher', roles: ['teacher'], classIds: ['10A'] });
    await expectReject(
      () => assertCanAccessStudent(teacher, 'student-1', 'tenant-a'),
      /cannot access this student/
    );
  });

  it('parent is denied for unlinked student', async () => {
    setupUserDoc('student-2', {
      role: 'student',
      classIds: ['10A'],
      tenantId: 'tenant-a',
    });
    const parent = makeActor({
      role: 'parent',
      roles: ['parent'],
      linkedStudentIds: ['student-1'],
    });
    await expectReject(
      () => assertCanAccessStudent(parent, 'student-2', 'tenant-a'),
      /cannot access this student/
    );
  });

  it('cross-tenant student is denied', async () => {
    setupUserDoc('student-1', {
      role: 'student',
      classIds: ['10A'],
      tenantId: 'tenant-b',
      schoolId: 'tenant-b',
    });
    const teacher = makeActor({ role: 'teacher', roles: ['teacher'], classIds: ['10A'] });
    await expectReject(
      () => assertCanAccessStudent(teacher, 'student-1', 'tenant-a'),
      /outside the active tenant/
    );
  });
});

describe('assertCanAccessClass', () => {
  it('leadership is allowed', async () => {
    const admin = makeActor({ role: 'admin', roles: ['admin'] });
    await expect(assertCanAccessClass(admin, '10A', 'tenant-a')).resolves.toBeUndefined();
  });

  it('teacher is allowed for assigned class', async () => {
    setupClasses([]);
    const teacher = makeActor({ role: 'teacher', roles: ['teacher'], classIds: ['10A'] });
    await expect(assertCanAccessClass(teacher, '10A', 'tenant-a')).resolves.toBeUndefined();
  });

  it('student is allowed for own class', async () => {
    const student = makeActor({ role: 'student', roles: ['student'], classIds: ['10A'] });
    await expect(assertCanAccessClass(student, '10A', 'tenant-a')).resolves.toBeUndefined();
  });

  it('parent is allowed for linked child class', async () => {
    setupUserDoc('child-1', {
      role: 'student',
      classIds: ['10A'],
      tenantId: 'tenant-a',
    });
    const parent = makeActor({
      role: 'parent',
      roles: ['parent'],
      linkedStudentIds: ['child-1'],
    });
    await expect(assertCanAccessClass(parent, '10A', 'tenant-a')).resolves.toBeUndefined();
  });

  it('unrelated actor is denied', async () => {
    setupClasses([]);
    const student = makeActor({ role: 'student', roles: ['student'], classIds: ['10B'] });
    await expectReject(
      () => assertCanAccessClass(student, '10A', 'tenant-a'),
      /cannot access this class/
    );
  });

  it('throws if classId is missing', async () => {
    await expectReject(
      () => assertCanAccessClass(makeActor(), '', 'tenant-a'),
      /classId is required/
    );
  });
});

describe('assertCanManageClass', () => {
  it('leadership is allowed', async () => {
    const admin = makeActor({ role: 'admin', roles: ['admin'] });
    await expect(assertCanManageClass(admin, '10A', 'tenant-a')).resolves.toBeUndefined();
  });

  it('allows teachers and staff to manage assigned classes under current route semantics', async () => {
    const teacher = makeActor({ role: 'teacher', roles: ['teacher'], classIds: ['10A'] });
    await expect(assertCanManageClass(teacher, '10A', 'tenant-a')).resolves.toBeUndefined();
  });

  it('student is denied', async () => {
    const student = makeActor({ role: 'student', roles: ['student'] });
    await expectReject(
      () => assertCanManageClass(student, '10A', 'tenant-a'),
      /cannot manage this class/
    );
  });
});

describe('assertStudentsBelongToClass', () => {
  it('allows when all students are in the class', async () => {
    setupUserDoc('student-1', {
      role: 'student',
      classIds: ['10A'],
      tenantId: 'tenant-a',
    });
    setupUserDoc('student-2', {
      role: 'student',
      classIds: ['10A'],
      tenantId: 'tenant-a',
    });
    await expect(
      assertStudentsBelongToClass(['student-1', 'student-2'], '10A', 'tenant-a')
    ).resolves.toBeUndefined();
  });

  it('rejects when any student is outside the class', async () => {
    setupUserDoc('student-1', {
      role: 'student',
      classIds: ['10A'],
      tenantId: 'tenant-a',
    });
    setupUserDoc('student-3', {
      role: 'student',
      classIds: ['10B'],
      tenantId: 'tenant-a',
    });
    await expectReject(
      () => assertStudentsBelongToClass(['student-1', 'student-3'], '10A', 'tenant-a'),
      /outside the requested class/
    );
  });
});
