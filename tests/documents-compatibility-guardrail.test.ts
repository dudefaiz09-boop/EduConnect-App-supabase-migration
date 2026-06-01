import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = process.cwd();

function read(path: string) {
  return readFileSync(join(root, path), 'utf8');
}

function listSourceFiles(dir: string): string[] {
  const absDir = join(root, dir);
  return readdirSync(absDir).flatMap((entry) => {
    const absPath = join(absDir, entry);
    const relPath = relative(root, absPath).replace(/\\/g, '/');
    const stat = statSync(absPath);

    if (stat.isDirectory()) {
      if (['dist', 'build', 'node_modules'].includes(entry)) return [];
      return listSourceFiles(relPath);
    }

    return /\.(ts|tsx|js|cjs|mjs)$/.test(entry) ? [relPath] : [];
  });
}

function directDocumentClients(dir: string) {
  return listSourceFiles(dir)
    .filter((path) => read(path).includes(".from('documents')"))
    .sort();
}

describe('documents compatibility guardrail', () => {
  it('keeps direct frontend documents access inside the web compatibility adapter', () => {
    expect(directDocumentClients('apps/web/src')).toEqual(['apps/web/src/lib/documents.ts']);
    expect(directDocumentClients('apps/admin-console/src')).toEqual([]);
  });

  it('keeps backend direct documents clients explicitly allowlisted', () => {
    expect(directDocumentClients('apps/functions')).toEqual([
      'apps/functions/scripts/seed-demo-extras.ts',
      'apps/functions/scripts/seed-supabase.ts',
      'apps/functions/scripts/verify-demo-seed.ts',
      'apps/functions/src/features/documents/documents.controller.ts',
      'apps/functions/src/features/users/users.repository.ts',
      'apps/functions/src/lib/documents.ts',
      'apps/functions/src/lib/identity-profile.ts',
      'apps/functions/src/lib/profile-service.ts',
    ]);
  });

  it('documents the retirement plan and active compatibility collections', () => {
    const plan = read('docs/DOCUMENTS_COMPATIBILITY_RETIREMENT_PLAN.md');

    [
      'users',
      'schools',
      'assignments',
      'submissions',
      'attendance',
      'fees',
      'payments',
      'library',
      'borrowRecords',
      'notifications',
      'uploadSessions',
      'attachments',
    ].forEach((collection) => {
      expect(plan).toContain(collection);
    });

    expect(plan).toContain('Do not add new direct frontend Supabase `documents` queries');
    expect(plan).toContain('Every normalized replacement needs tenant-scoped tests');
  });
});
