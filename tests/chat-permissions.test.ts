import { canMessageUser } from '../packages/shared/src/permissions/chat.ts';
import type {
  ChatPermissionActor,
  ChatPermissionTarget,
} from '../packages/shared/src/permissions/chat.ts';

function actor(overrides: Partial<ChatPermissionActor> = {}): ChatPermissionActor {
  return {
    uid: 'actor-1',
    role: 'student',
    classIds: [],
    linkedStudentIds: [],
    ...overrides,
  };
}

function target(overrides: Partial<ChatPermissionTarget> = {}): ChatPermissionTarget {
  return {
    uid: 'target-1',
    role: 'student',
    classIds: [],
    linkedStudentIds: [],
    ...overrides,
  };
}

describe('canMessageUser', () => {
  describe('admin / principal', () => {
    it('admin can message anyone', () => {
      const result = canMessageUser(actor({ role: 'admin' }), target({ role: 'student' }));
      expect(result.allowed).toBe(true);
      expect(result.reason).toMatch(/admin/i);
    });

    it('principal can message anyone', () => {
      const result = canMessageUser(actor({ role: 'principal' }), target({ role: 'student' }));
      expect(result.allowed).toBe(true);
      expect(result.reason).toMatch(/admin/i);
    });

    it('isAdmin bypass works', () => {
      const result = canMessageUser(
        actor({ role: 'teacher', isAdmin: true }),
        target({ role: 'student' })
      );
      expect(result.allowed).toBe(true);
    });

    it('president (legacy) cannot message via general rules', () => {
      const result = canMessageUser(actor({ role: 'president' }), target({ role: 'student' }));
      expect(result.allowed).toBe(false);
    });
  });

  describe('student', () => {
    it('can message own teacher in shared class', () => {
      const result = canMessageUser(
        actor({ role: 'student', classIds: ['10A'] }),
        target({ role: 'teacher', classIds: ['10A'] })
      );
      expect(result.allowed).toBe(true);
      expect(result.reason).toBe('Class Teacher');
    });

    it('cannot message teacher in unrelated class', () => {
      const result = canMessageUser(
        actor({ role: 'student', classIds: ['10B'] }),
        target({ role: 'teacher', classIds: ['10A'] })
      );
      expect(result.allowed).toBe(false);
    });

    it('can message principal', () => {
      const result = canMessageUser(actor({ role: 'student' }), target({ role: 'principal' }));
      expect(result.allowed).toBe(true);
    });

    it('can message admin', () => {
      const result = canMessageUser(actor({ role: 'student' }), target({ role: 'admin' }));
      expect(result.allowed).toBe(true);
    });

    it('cannot message another student', () => {
      const result = canMessageUser(
        actor({ role: 'student', classIds: ['10A'] }),
        target({ role: 'student', classIds: ['10A'] })
      );
      expect(result.allowed).toBe(false);
    });

    it('cannot message unknown role', () => {
      const result = canMessageUser(actor({ role: 'student' }), target({ role: 'staff' }));
      expect(result.allowed).toBe(false);
    });
  });

  describe('parent', () => {
    it('can message linked child teacher', () => {
      const result = canMessageUser(
        actor({ role: 'parent', linkedStudentClassIds: ['10A'] }),
        target({ role: 'teacher', classIds: ['10A'] })
      );
      expect(result.allowed).toBe(true);
      expect(result.reason).toBe("Child's Teacher");
    });

    it('cannot message unrelated teacher', () => {
      const result = canMessageUser(
        actor({ role: 'parent', linkedStudentClassIds: ['10B'] }),
        target({ role: 'teacher', classIds: ['10A'] })
      );
      expect(result.allowed).toBe(false);
    });

    it('can message principal', () => {
      const result = canMessageUser(actor({ role: 'parent' }), target({ role: 'principal' }));
      expect(result.allowed).toBe(true);
    });

    it('can message admin', () => {
      const result = canMessageUser(actor({ role: 'parent' }), target({ role: 'admin' }));
      expect(result.allowed).toBe(true);
    });

    it('cannot message librarian', () => {
      const result = canMessageUser(actor({ role: 'parent' }), target({ role: 'librarian' }));
      expect(result.allowed).toBe(false);
    });
  });

  describe('teacher', () => {
    it('can message own student', () => {
      const result = canMessageUser(
        actor({ role: 'teacher', classIds: ['10A'] }),
        target({ role: 'student', classIds: ['10A'] })
      );
      expect(result.allowed).toBe(true);
      expect(result.reason).toBe('Your Student');
    });

    it('cannot message unrelated student', () => {
      const result = canMessageUser(
        actor({ role: 'teacher', classIds: ['10B'] }),
        target({ role: 'student', classIds: ['10A'] })
      );
      expect(result.allowed).toBe(false);
    });

    it('can message principal', () => {
      const result = canMessageUser(actor({ role: 'teacher' }), target({ role: 'principal' }));
      expect(result.allowed).toBe(true);
    });

    it('can message admin', () => {
      const result = canMessageUser(actor({ role: 'teacher' }), target({ role: 'admin' }));
      expect(result.allowed).toBe(true);
    });

    it('can message another teacher', () => {
      const result = canMessageUser(actor({ role: 'teacher' }), target({ role: 'teacher' }));
      expect(result.allowed).toBe(true);
      expect(result.reason).toBe('Colleague');
    });

    it('denies teacher messaging parent when linked student is outside teacher classes', () => {
      const result = canMessageUser(
        actor({ role: 'teacher', classIds: ['10B'] }),
        target({ role: 'parent', classIds: ['10A'], linkedStudentIds: ['student-1'] })
      );
      expect(result.allowed).toBe(false);
    });

    it('allows teacher messaging parent when linked child is in teacher class', () => {
      const result = canMessageUser(
        actor({ role: 'teacher', classIds: ['10A'] }),
        target({ role: 'parent', classIds: ['10A'], linkedStudentIds: ['student-1'] })
      );
      expect(result.allowed).toBe(true);
    });
  });

  describe('librarian', () => {
    it('can message admin', () => {
      const result = canMessageUser(actor({ role: 'librarian' }), target({ role: 'admin' }));
      expect(result.allowed).toBe(true);
    });

    it('can message principal', () => {
      const result = canMessageUser(actor({ role: 'librarian' }), target({ role: 'principal' }));
      expect(result.allowed).toBe(true);
    });

    it('can message student', () => {
      const result = canMessageUser(actor({ role: 'librarian' }), target({ role: 'student' }));
      expect(result.allowed).toBe(true);
      expect(result.reason).toBe('Library Services');
    });

    it('can message parent', () => {
      const result = canMessageUser(actor({ role: 'librarian' }), target({ role: 'parent' }));
      expect(result.allowed).toBe(true);
    });

    it('cannot message teacher', () => {
      const result = canMessageUser(actor({ role: 'librarian' }), target({ role: 'teacher' }));
      expect(result.allowed).toBe(false);
    });

    it('cannot message accountant', () => {
      const result = canMessageUser(actor({ role: 'librarian' }), target({ role: 'accountant' }));
      expect(result.allowed).toBe(false);
    });
  });

  describe('accountant', () => {
    it('can message admin', () => {
      const result = canMessageUser(actor({ role: 'accountant' }), target({ role: 'admin' }));
      expect(result.allowed).toBe(true);
    });

    it('can message principal', () => {
      const result = canMessageUser(actor({ role: 'accountant' }), target({ role: 'principal' }));
      expect(result.allowed).toBe(true);
    });

    it('can message student', () => {
      const result = canMessageUser(actor({ role: 'accountant' }), target({ role: 'student' }));
      expect(result.allowed).toBe(true);
      expect(result.reason).toBe('Fee Management');
    });

    it('can message parent', () => {
      const result = canMessageUser(actor({ role: 'accountant' }), target({ role: 'parent' }));
      expect(result.allowed).toBe(true);
    });

    it('cannot message teacher', () => {
      const result = canMessageUser(actor({ role: 'accountant' }), target({ role: 'teacher' }));
      expect(result.allowed).toBe(false);
    });

    it('cannot message librarian', () => {
      const result = canMessageUser(actor({ role: 'accountant' }), target({ role: 'librarian' }));
      expect(result.allowed).toBe(false);
    });
  });

  describe('staff', () => {
    it('cannot message anyone by default (no specific rules)', () => {
      const result = canMessageUser(actor({ role: 'staff' }), target({ role: 'student' }));
      expect(result.allowed).toBe(false);
    });
  });

  describe('multi-role actor', () => {
    it('teacher+librarian can message student (librarian allows it)', () => {
      const result = canMessageUser(
        actor({ role: 'teacher', roles: ['teacher', 'librarian'], classIds: ['10B'] }),
        target({ role: 'student', classIds: ['10A'] })
      );
      expect(result.allowed).toBe(true);
      expect(result.reason).toBe('Library Services');
    });

    it('teacher+parent can message principal (parent allows admin messaging)', () => {
      const result = canMessageUser(
        actor({ role: 'teacher', roles: ['teacher', 'parent'] }),
        target({ role: 'principal' })
      );
      expect(result.allowed).toBe(true);
    });

    it('student+parent uses union of permissions', () => {
      const result = canMessageUser(
        actor({
          role: 'student',
          roles: ['student', 'parent'],
          linkedStudentClassIds: ['10A'],
        }),
        target({ role: 'teacher', classIds: ['10A'] })
      );
      expect(result.allowed).toBe(true);
    });

    it('librarian+accountant can message student', () => {
      const result = canMessageUser(
        actor({ role: 'librarian', roles: ['librarian', 'accountant'] }),
        target({ role: 'student' })
      );
      expect(result.allowed).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('returns denied for missing actor role', () => {
      const result = canMessageUser(actor({ role: '' }), target({ role: 'student' }));
      expect(result.allowed).toBe(false);
    });

    it('uses roles[] when role is not set', () => {
      const result = canMessageUser(
        actor({ role: undefined, roles: ['teacher'], classIds: ['10A'] }),
        target({ role: 'student', classIds: ['10A'] })
      );
      expect(result.allowed).toBe(true);
    });

    it('uses classId fallback when classIds is empty', () => {
      const result = canMessageUser(
        actor({ role: 'student', classId: '10A', classIds: [] }),
        target({ role: 'teacher', classIds: ['10A'] })
      );
      expect(result.allowed).toBe(true);
    });

    it('deduplicates class IDs', () => {
      const result = canMessageUser(
        actor({ role: 'student', classIds: ['10A', '10A', '10B'] }),
        target({ role: 'teacher', classIds: ['10A'] })
      );
      expect(result.allowed).toBe(true);
    });
  });
});
