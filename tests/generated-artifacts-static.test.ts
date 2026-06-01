import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

function trackedFiles() {
  return execFileSync('git', ['ls-files'], {
    cwd: process.cwd(),
    encoding: 'utf8',
  })
    .split(/\r?\n/)
    .filter(Boolean)
    .map((file) => file.replace(/\\/g, '/'));
}

function read(path: string) {
  return readFileSync(join(process.cwd(), path), 'utf8');
}

describe('generated artifact guardrails', () => {
  it('does not commit package source build artifacts beside TypeScript source', () => {
    const generatedPackageArtifacts = trackedFiles().filter((file) =>
      /^packages\/[^/]+\/src\/.*\.(?:d\.ts|js|js\.map)$/.test(file)
    );

    expect(generatedPackageArtifacts).toEqual([]);
  });

  it('does not commit local TypeScript build info or Android diagnostic logs', () => {
    const generatedLocalArtifacts = trackedFiles().filter(
      (file) =>
        file.endsWith('.tsbuildinfo') || file === 'apps/mobile/android/full-educonnect-log.txt'
    );

    expect(generatedLocalArtifacts).toEqual([]);
  });

  it('ignores generated package artifacts and local build metadata', () => {
    const gitignore = read('.gitignore');

    expect(gitignore).toContain('*.tsbuildinfo');
    expect(gitignore).toContain('apps/mobile/android/full-educonnect-log.txt');
    expect(gitignore).toContain('packages/*/src/**/*.d.ts');
    expect(gitignore).toContain('packages/*/src/**/*.js');
    expect(gitignore).toContain('packages/*/src/**/*.js.map');
  });
});
