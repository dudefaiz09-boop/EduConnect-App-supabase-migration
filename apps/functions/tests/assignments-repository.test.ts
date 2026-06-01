const assignmentDocGet = jest.fn();
const submissionSet = jest.fn();

const mockDb = {
  collection: jest.fn((name: string) => {
    if (name === 'assignments') {
      return {
        doc: jest.fn(() => ({
          get: assignmentDocGet,
        })),
      };
    }

    if (name === 'submissions') {
      return {
        doc: jest.fn(() => ({
          set: submissionSet,
          update: jest.fn(),
          get: jest.fn(),
        })),
      };
    }

    return { doc: jest.fn(), where: jest.fn(), add: jest.fn() };
  }),
};

const createNotification = jest.fn();

jest.mock('../src/lib/documents.js', () => ({
  db: mockDb,
}));

jest.mock('../src/lib/notifications.js', () => ({
  createNotification,
}));

jest.mock('../src/lib/ai.js', () => ({
  isAiEnabled: jest.fn(() => false),
  generateSafeContent: jest.fn(),
}));

jest.mock('../src/lib/supabase.js', () => ({
  getSupabaseAdmin: jest.fn(),
}));

import { AssignmentsRepository } from '../src/features/assignments/assignments.repository.js';

const student = {
  uid: 'student-1',
  email: 'student@example.test',
  schoolId: 'tenant-a',
};

function assignment(data: Record<string, unknown>) {
  return {
    exists: true,
    data: () => data,
  };
}

describe('assignments repository submissions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('requires an assignment id for submissions', async () => {
    await expect(
      AssignmentsRepository.submit(undefined, { content: 'Done' }, student, 'tenant-a')
    ).rejects.toThrow('assignmentId is required');

    expect(assignmentDocGet).not.toHaveBeenCalled();
  });

  it('blocks submissions to assignments from another tenant', async () => {
    assignmentDocGet.mockResolvedValueOnce(
      assignment({ tenantId: 'tenant-b', title: 'Other tenant work' })
    );

    await expect(
      AssignmentsRepository.submit('assignment-1', { content: 'Done' }, student, 'tenant-a')
    ).rejects.toThrow('Tenant access denied');

    expect(submissionSet).not.toHaveBeenCalled();
  });

  it('stores tenant-scoped student submissions and notifies the teacher', async () => {
    assignmentDocGet.mockResolvedValueOnce(
      assignment({
        tenantId: 'tenant-a',
        title: 'Math homework',
        createdBy: 'teacher-1',
      })
    );

    await expect(
      AssignmentsRepository.submit('assignment-1', { content: 'Done' }, student, 'tenant-a')
    ).resolves.toEqual({ success: true, id: 'assignment-1_student-1' });

    expect(submissionSet).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 'tenant-a',
        schoolId: 'tenant-a',
        assignmentId: 'assignment-1',
        studentId: 'student-1',
        content: 'Done',
        status: 'submitted',
      })
    );
    expect(createNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'assignment',
        targetUserIds: ['teacher-1'],
        tenantId: 'tenant-a',
        metadata: expect.objectContaining({
          assignmentId: 'assignment-1',
          submissionId: 'assignment-1_student-1',
          studentId: 'student-1',
        }),
      })
    );
  });
});
