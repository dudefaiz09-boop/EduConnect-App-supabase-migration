import { db } from '../../../lib/documents.js';
import { AiUserContext, AiModule } from '../ai-context.service.js';
import { AiContextProvider } from './base.provider.js';

export class PerformanceProvider implements AiContextProvider {
  module: AiModule = 'performance';

  async getContext(context: AiUserContext): Promise<string | null> {
    const { uid, role, tenantId, linkedStudentIds } = context;

    if (role === 'student') {
      const snap = await db
        .collection('performance')
        .where('tenantId', '==', tenantId)
        .where('studentId', '==', uid)
        .limit(5)
        .get();
      const scores = snap.docs.map((d: any) => `${d.data().subject}: ${d.data().score}`);
      return `[Performance] Your recent scores: ${scores.join(', ') || 'No data.'}`;
    }

    if (role === 'parent') {
        if (linkedStudentIds.length === 0) return null;
        const studentPerf: string[] = [];
        for (const studentId of linkedStudentIds) {
            const studentDoc = await db.collection('users').doc(studentId).get();
            const sName = (studentDoc.data() || {}).displayName || studentId;

            const snap = await db
              .collection('performance')
              .where('tenantId', '==', tenantId)
              .where('studentId', '==', studentId)
              .limit(3)
              .get();
            const scores = snap.docs.map((d: any) => `${d.data().subject}: ${d.data().score}`);
            if (scores.length > 0) studentPerf.push(`${sName}: ${scores.join(', ')}`);
        }
        return `[Children Performance]\n${studentPerf.join('\n') || 'No recent performance records.'}`;
    }

    if (['admin', 'principal', 'teacher'].includes(role)) {
        // Teacher would ideally filter by their class, but for simplicity of context overview:
        const snap = await db.collection('performance').where('tenantId', '==', tenantId).limit(10).get();
        return `[Performance Overview] Recent records count: ${snap.size}.`;
    }

    return null;
  }
}
