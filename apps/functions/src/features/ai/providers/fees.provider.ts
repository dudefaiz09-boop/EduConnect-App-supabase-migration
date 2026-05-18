import { db } from '../../../lib/documents.js';
import { AiUserContext, AiModule } from '../ai-context.service.js';
import { AiContextProvider } from './base.provider.js';

export class FeesProvider implements AiContextProvider {
  module: AiModule = 'fees';

  async getContext(context: AiUserContext): Promise<string | null> {
    const { uid, role, tenantId, linkedStudentIds } = context;

    if (['admin', 'principal', 'accountant'].includes(role)) {
      const snap = await db.collection('fees').where('tenantId', '==', tenantId).limit(5).get();
      return `[Fees Overview] Recent records count: ${snap.size}.`;
    }

    if (role === 'student') {
      const snap = await db
        .collection('fees')
        .where('tenantId', '==', tenantId)
        .where('studentId', '==', uid)
        .get();
      const list = snap.docs.map(
        (d: any) => `${d.data().amountDue} due on ${d.data().dueDate}`
      );
      return `[Your Fees] ${list.join('; ') || 'No pending fees.'}`;
    }

    if (role === 'parent') {
        if (linkedStudentIds.length === 0) return null;
        const studentFees: string[] = [];
        for (const studentId of linkedStudentIds) {
            const studentDoc = await db.collection('users').doc(studentId).get();
            const sName = (studentDoc.data() || {}).displayName || studentId;

            const snap = await db
              .collection('fees')
              .where('tenantId', '==', tenantId)
              .where('studentId', '==', studentId)
              .get();
            const list = snap.docs.map(
              (d: any) => `${d.data().amountDue} due on ${d.data().dueDate}`
            );
            if (list.length > 0) studentFees.push(`${sName}: ${list.join('; ')}`);
        }
        return `[Children Fees]\n${studentFees.join('\n') || 'No pending fees found.'}`;
    }

    return null;
  }
}
