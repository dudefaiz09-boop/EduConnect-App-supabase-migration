import { AssignmentAnalytics } from '../calculator.js';
import type {
  Assignment as Assign,
  AssignmentSubmission as Submission,
} from '@educonnect/shared-education';

// Alias to avoid TypeScript dual-type-resolution issues in workspace test files
type Assignment = Assign & { id: string };
type AssignmentSubmission = Submission;

function makeAssignment(overrides: Partial<Assignment> = {}): Assignment {
  return {
    ...overrides,
    id: 'assign-1',
    schoolId: 'school-1',
    title: 'Test Assignment',
    description: 'A test assignment',
    dueDate: '2026-06-15T23:59:59Z',
    classId: 'class-1',
    targetClasses: ['class-1'],
    status: 'published',
    attachments: [],
    teacherId: 'teacher-1',
    pointsPossible: 100,
    allowResubmissions: true,
    isArchived: false,
  } as Assignment;
}

function makeSubmission(overrides: Partial<AssignmentSubmission> = {}): AssignmentSubmission {
  return {
    ...overrides,
    id: `sub-${Math.random()}`,
    schoolId: 'school-1',
    assignmentId: 'assign-1',
    studentId: 'student-1',
    studentName: 'Student One',
    status: 'submitted',
    content: 'My answer',
    attachments: [],
    submittedAt: '2026-06-14T10:00:00Z',
    grade: null,
    feedback: null,
    teacherComments: [],
    checkedByAI: false,
    recheckedByTeacher: false,
  } as AssignmentSubmission;
}

describe('AssignmentAnalytics.calculateStats', () => {
  it('uses the provided totalStudents value', () => {
    const assignment = makeAssignment();
    const submissions = [makeSubmission(), makeSubmission(), makeSubmission()];
    const stats = AssignmentAnalytics.calculateStats(assignment, submissions, 30);
    expect(stats.totalStudents).toBe(30);
  });

  it('calculates submissionRate as submittedCount / totalStudents', () => {
    const assignment = makeAssignment();
    const submissions = Array.from({ length: 5 }, () => makeSubmission());
    const stats = AssignmentAnalytics.calculateStats(assignment, submissions, 10);
    expect(stats.submittedCount).toBe(5);
    expect(stats.totalStudents).toBe(10);
    expect(stats.submissionRate).toBe(0.5);
  });

  it('returns 0 submissionRate when totalStudents is 0', () => {
    const assignment = makeAssignment();
    const submissions = [makeSubmission()];
    const stats = AssignmentAnalytics.calculateStats(assignment, submissions, 0);
    expect(stats.submissionRate).toBe(0);
  });

  it('counts graded submissions correctly', () => {
    const assignment = makeAssignment();
    const submissions = [
      makeSubmission({ status: 'graded', grade: '85' }),
      makeSubmission({ status: 'returned', grade: '90' }),
      makeSubmission({ status: 'submitted' }),
    ];
    const stats = AssignmentAnalytics.calculateStats(assignment, submissions, 10);
    expect(stats.gradedCount).toBe(2);
  });

  it('calculates avgScore from graded submissions', () => {
    const assignment = makeAssignment();
    const submissions = [
      makeSubmission({ status: 'graded', grade: '80' }),
      makeSubmission({ status: 'returned', grade: '90' }),
      makeSubmission({ status: 'submitted', grade: '70' }),
    ];
    const stats = AssignmentAnalytics.calculateStats(assignment, submissions, 10);
    expect(stats.avgScore).toBe(85);
  });

  it('returns undefined avgScore when no graded submissions have scores', () => {
    const assignment = makeAssignment();
    const submissions = [makeSubmission({ status: 'submitted', grade: null })];
    const stats = AssignmentAnalytics.calculateStats(assignment, submissions, 10);
    expect(stats.avgScore).toBeUndefined();
  });

  it('detects late submissions', () => {
    const assignment = makeAssignment({ dueDate: '2026-06-10T23:59:59Z' });
    const submissions = [
      makeSubmission({ submittedAt: '2026-06-09T12:00:00Z' }),
      makeSubmission({ submittedAt: '2026-06-12T12:00:00Z' }),
      makeSubmission({ submittedAt: undefined }),
    ];
    const stats = AssignmentAnalytics.calculateStats(assignment, submissions, 10);
    expect(stats.lateSubmissionCount).toBe(1);
  });

  it('includes assignment metadata in the result', () => {
    const assignment = makeAssignment({ title: 'Math HW', dueDate: '2026-07-01T00:00:00Z' });
    const stats = AssignmentAnalytics.calculateStats(assignment, [], 25);
    expect(stats.assignmentId).toBe('assign-1');
    expect(stats.title).toBe('Math HW');
    expect(stats.dueDate).toBe('2026-07-01T00:00:00Z');
  });
});
