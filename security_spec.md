# EduConnect Firestore Security Specification

## Data Invariants

1. A user cannot have a role other than student, parent, teacher, staff, or admin.
2. A user document must have a valid UID matching the internal auth system.
3. Attendance records must reference a valid student UID.
4. Announcements must have an authorId matching a user with teacher/staff/admin role.

## The Dirty Dozen (Test Payloads)

1. **Identity Spoofing**: Attempt to create a user profile with `role: "admin"` as an unauthenticated user.
2. **Identity Spoofing**: Attempt to change another user's `role` from `student` to `admin`.
3. **Privilege Escalation**: Attempt to create an announcement as a `student`.
4. **Data Poisoning**: Write a 2MB string into an announcement's `content` field.
5. **ID Poisoning**: Inject specific characters into a document ID to bypass path variables.
6. **Orphaned Record**: Create an attendance record for a non-existent student UID.
7. **Temporal Fraud**: Set a `createdAt` timestamp to 10 years in the future.
8. **Shadow Update**: Update a record and add a `isVerified: true` field not in the schema.
9. **Private Leak**: Attempt to read the `users` collection as a student to see all emails.
10. **Terminal State**: Attempt to delete an attendance record marked as `present` after 24 hours.
11. **PII Leak**: Read a teacher's private contact info (split collection).
12. **Recursive Attack**: Trigger massive read costs by querying unbounded collections without filters.

## Verification Checklist

- [ ] User profiles are private by default.
- [ ] Roles are immutable by the user themselves.
- [ ] Write operations are strictly role-gated.
- [ ] String sizes are capped.
- [ ] Timestamps use `request.time`.
