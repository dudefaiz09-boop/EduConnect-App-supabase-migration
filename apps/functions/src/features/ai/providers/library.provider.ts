import { db } from '../../../lib/documents.js';
import { AiUserContext, AiModule } from '../ai-context.service.js';
import { AiContextProvider } from './base.provider.js';

export class LibraryProvider implements AiContextProvider {
  module: AiModule = 'library';

  async getContext(context: AiUserContext): Promise<string | null> {
    const { uid, role, tenantId } = context;

    if (role === 'student' || role === 'teacher' || role === 'librarian') {
      const snap = await db
        .collection('library')
        .where('tenantId', '==', tenantId)
        .where('studentId', '==', uid) // Assumes teachers/students use studentId for checkouts
        .get();
      return `[Library] You have ${snap.size} books currently issued.`;
    }

    if (['admin', 'principal'].includes(role)) {
        const snap = await db.collection('library').where('tenantId', '==', tenantId).limit(5).get();
        return `[Library Overview] Recent borrowing records count: ${snap.size}.`;
    }

    return null;
  }
}
