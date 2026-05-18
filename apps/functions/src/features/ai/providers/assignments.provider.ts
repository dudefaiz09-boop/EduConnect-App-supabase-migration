import { db } from '../../../lib/documents.js';
import { AiUserContext, AiModule } from '../ai-context.service.js';
import { AiContextProvider } from './base.provider.js';

export class AssignmentsProvider implements AiContextProvider {
  module: AiModule = 'assignments';

  async getContext(context: AiUserContext): Promise<string | null> {
    const { uid, role, tenantId, classId, linkedStudentIds } = context;

    if (role === 'teacher') {
      const snap = await db
        .collection('assignments')
        .where('tenantId', '==', tenantId)
        .where('createdBy', '==', uid)
        .limit(5)
        .get();
      const titles = snap.docs.map((d: any) => d.data().title).join(', ');
      return `[Your Assignments] ${titles || 'No assignments created.'}`;
    }

    if (role === 'student') {
      if (!classId) return null;
      const snap = await db
        .collection('assignments')
        .where('tenantId', '==', tenantId)
        .where('targetClasses', 'array-contains', classId)
        .limit(5)
        .get();
      const titles = snap.docs.map((d: any) => d.data().title).join(', ');
      return `[Pending Assignments] ${titles || 'No pending assignments.'}`;
    }

    if (role === 'parent') {
      if (linkedStudentIds.length === 0) return null;
      const studentAssignments: string[] = [];

      for (const studentId of linkedStudentIds) {
        const studentDoc = await db.collection('users').doc(studentId).get();
        const sData = studentDoc.data() || {};
        const sName = sData.displayName || studentId;
        const sClass = sData.classId;

        if (sClass) {
          const snap = await db
            .collection('assignments')
            .where('tenantId', '==', tenantId)
            .where('targetClasses', 'array-contains', sClass)
            .limit(3)
            .get();
          const titles = snap.docs.map((d: any) => d.data().title).join(', ');
          if (titles) studentAssignments.push(`${sName}: ${titles}`);
        }
      }
      return `[Children Assignments]\n${studentAssignments.join('\n') || 'No pending assignments found.'}`;
    }

    if (['admin', 'principal'].includes(role)) {
        const snap = await db
          .collection('assignments')
          .where('tenantId', '==', tenantId)
          .limit(10)
          .get();
        const summary = snap.docs.map((d: any) => `${d.data().title} (${d.data().targetClasses?.join(',') || 'No Class'})`).join('\n');
        return `[Recent Assignments Overview]\n${summary || 'No recent records.'}`;
    }

    return null;
  }
}
