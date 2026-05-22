import { z } from 'zod';

const nonEmptyString = z.string().trim().min(1);

export const performanceReportParamsSchema = z
  .object({
    classId: nonEmptyString,
  })
  .strict();

export const studentPerformanceParamsSchema = z
  .object({
    studentId: nonEmptyString,
  })
  .strict();

export const performanceUploadRecordSchema = z
  .object({
    studentId: nonEmptyString,
    classId: nonEmptyString,
    subject: nonEmptyString,
    term: nonEmptyString,
    score: z.coerce.number().min(0).max(100),
    grade: nonEmptyString,
  })
  .strict();

export const performanceUploadSchema = z
  .object({
    records: z
      .array(performanceUploadRecordSchema)
      .min(1, 'At least one performance record is required.'),
  })
  .strict();