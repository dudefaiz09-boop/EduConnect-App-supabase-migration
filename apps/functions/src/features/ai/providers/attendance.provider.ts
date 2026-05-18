import { db } from '../../../lib/documents.js';
import { AiUserContext, AiModule } from '../ai-context.service.js';
import { AiContextProvider } from './base.provider.js';

export class AttendanceProvider implements AiContextProvider {
  module: AiModule = 'attendance';

  async getContext(context: AiUserContext): Promise<string | null> {
    const { uid, role, tenantId, classId, classIds, linkedStudentIds } = context;

    if (['admin', 'principal'].includes(role)) {
      const snap = await db
        .collection('attendance')
        .where('tenantId', '==', tenantId)
        .orderBy('date', 'desc')
        .limit(10)
        .get();
      const summary = snap.docs
        .map((d: any) => {
          const data = d.data();
          const present = data.records?.filter((r: any) => r.status === 'present').length || 0;
          const total = data.records?.length || 0;
          return `${data.date} (${data.classId}): ${present}/${total} present`;
        })
        .join('\n');
      return `[Attendance Overview]\n${summary || 'No recent records.'}`;
    }

    if (role === 'teacher') {
      const targetClasses = classIds.length > 0 ? classIds : classId ? [classId] : [];
      if (targetClasses.length > 0) {
        const snap = await db
          .collection('attendance')
          .where('tenantId', '==', tenantId)
          .where('classId', 'in', targetClasses)
          .orderBy('date', 'desc')
          .limit(10)
          .get();
        const summary = snap.docs
          .map((d: any) => {
            const data = d.data();
            const present = data.records?.filter((r: any) => r.status === 'present').length || 0;
            const total = data.records?.length || 0;
            return `${data.date} (${data.classId}): ${present}/${total} present`;
          })
          .join('\n');
        return `[Your Classes Attendance]\n${summary || 'No recent records.'}`;
      }
      return null;
    }

    if (role === 'student') {
      if (!classId) return '[Attendance] Your account is not linked to a class.';

      const snap = await db
        .collection('attendance')
        .where('tenantId', '==', tenantId)
        .where('classId', '==', classId)
        .orderBy('date', 'desc')
        .limit(5)
        .get();

      const history = snap.docs
        .map((doc: any) => {
          const data = doc.data();
          const record = data.records?.find((r: any) => r.studentId === uid);
          return record ? `${data.date}: ${record.status}` : null;
        })
        .filter(Boolean);

      return `[Your Attendance History] ${history.join(', ') || 'No records found.'}`;
    }

    if (role === 'parent') {
      if (linkedStudentIds.length === 0) return '[Attendance] No linked students found.';

      const studentRecords: string[] = [];
      for (const studentId of linkedStudentIds) {
        // Fetch student to get their class and display name
        const studentDoc = await db.collection('users').doc(studentId).get();
        const studentData = studentDoc.data() || {};
        const sName = studentData.displayName || studentId;
        const sClass = studentData.classId;

        if (sClass) {
          const snap = await db
            .collection('attendance')
            .where('tenantId', '==', tenantId)
            .where('classId', '==', sClass)
            .orderBy('date', 'desc')
            .limit(3)
            .get();

          const history = snap.docs
            .map((doc: any) => {
              const data = doc.data();
              const record = data.records?.find((r: any) => r.studentId === studentId);
              return record ? `${data.date}: ${record.status}` : null;
            })
            .filter(Boolean);

          if (history.length > 0) {
            studentRecords.push(`${sName}: ${history.join('; ')}`);
          }
        }
      }
      return `[Children Attendance]\n${studentRecords.join('\n') || 'No recent records found.'}`;
    }

    return null;
  }
}
