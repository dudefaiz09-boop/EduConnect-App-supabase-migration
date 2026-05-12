import { z } from 'zod';

export const TimestampValueSchema = z.union([
  z.object({ toDate: z.function().returns(z.date()) }),
  z.string(),
  z.number(),
  z.null()
]);

export const UserProfileSchema = z.object({
  uid: z.string(),
  displayName: z.string(),
  email: z.string().email(),
  roles: z.array(z.string()),
  classId: z.string().optional(),
  section: z.string().optional(),
  subjects: z.array(z.string()).optional(),
  classes: z.array(z.string()).optional(),
  createdAt: TimestampValueSchema.optional(),
  linkedParentIds: z.array(z.string()).optional(),
});

export const ChatLogSchema = z.object({
  id: z.string(),
  query: z.string(),
  response: z.string(),
  timestamp: TimestampValueSchema,
  feedback: z.enum(['helpful', 'not_helpful']).nullable(),
});

export const AuditLogSchema = z.object({
  id: z.string(),
  action: z.string(),
  details: z.string(),
  timestamp: TimestampValueSchema,
  performedBy: z.string(),
});

export type TimestampValue = z.infer<typeof TimestampValueSchema>;
export type UserProfile = z.infer<typeof UserProfileSchema>;
export type ChatLog = z.infer<typeof ChatLogSchema>;
export type AuditLog = z.infer<typeof AuditLogSchema>;

// Alias for specific page usages to avoid massive refactors right now,
// but sharing the single source of truth across mobile and web.
export type StudentProfile = UserProfile;
export type TeacherProfile = UserProfile;
export interface BulkImportResult {
  success: boolean;
  message?: string;
}
