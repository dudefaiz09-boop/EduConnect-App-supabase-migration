import { readFileSync } from 'node:fs';
import { join } from 'node:path';

function read(path: string) {
  return readFileSync(join(process.cwd(), path), 'utf8');
}

describe('AI auth hardening guardrails', () => {
  it('keeps the basic AI query route behind protected auth middleware', () => {
    const app = read('apps/functions/src/app.ts');

    expect(app).not.toContain("publicRouter.post('/ai/query'");
    expect(app).toContain("publicRouter.post('/ai/public-query'");
    expect(app).toContain("protectedRouter.use('/ai', aiRoutes)");
  });

  it('does not trust client-supplied role headers for protected AI context', () => {
    const controller = read('apps/functions/src/features/ai/ai.controller.ts');
    const contextService = read('apps/functions/src/features/ai/ai-context.service.ts');

    expect(controller).not.toContain("req.headers['x-user-role']");
    expect(contextService).not.toContain("headers['x-user-role']");
    expect(contextService).toContain("const role = user?.role || user?.roles?.[0] || 'student'");
  });

  it('requires users to own AI history unless they are privileged staff', () => {
    const controller = read('apps/functions/src/features/ai/ai.controller.ts');
    const getHistory = controller.slice(controller.indexOf('static async getHistory'));

    expect(getHistory).toContain('user?.uid === userId');
    expect(getHistory).toContain('user?.isAdmin');
    expect(getHistory).toContain("user?.roles?.includes('principal')");
    expect(getHistory).toContain('AI_HISTORY_FORBIDDEN');
  });
});
