import {
  QA_ROLES,
  credentialSummary,
  main,
  missingCredentialNames,
} from '../scripts/qa-role-credentials.ts';

function credentialsForAllRoles() {
  return QA_ROLES.reduce<Record<string, string>>((env, role) => {
    const prefix = `WEB_QA_${role.toUpperCase().replace(/-/g, '_')}`;
    env[`${prefix}_EMAIL`] = `${role}@example.test`;
    env[`${prefix}_PASSWORD`] = 'correct-horse-battery-staple';
    return env;
  }, {});
}

describe('QA role credential preflight', () => {
  let consoleLog: jest.SpyInstance;
  let consoleError: jest.SpyInstance;

  beforeEach(() => {
    consoleLog = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    consoleLog.mockRestore();
    consoleError.mockRestore();
  });

  it('reports missing role credential variable names without exposing values', () => {
    expect(missingCredentialNames({ WEB_QA_ADMIN_EMAIL: 'admin@example.test' })).toEqual(
      expect.arrayContaining([
        'WEB_QA_ADMIN_PASSWORD',
        'WEB_QA_PRINCIPAL_EMAIL',
        'WEB_QA_PRINCIPAL_PASSWORD',
      ])
    );
  });

  it('passes only when every role has email and password credentials', () => {
    const env = credentialsForAllRoles();

    expect(missingCredentialNames(env)).toEqual([]);
    expect(main(env)).toBe(0);
  });

  it('fails when any role credential pair is incomplete', () => {
    const env = credentialsForAllRoles();
    delete env.WEB_QA_STAFF_PASSWORD;

    expect(main(env)).toBe(1);
  });

  it('summarizes configured roles without returning secret values', () => {
    const env = credentialsForAllRoles();

    expect(credentialSummary(env)).toContainEqual({
      role: 'admin',
      hasEmail: true,
      hasPassword: true,
    });
    expect(JSON.stringify(credentialSummary(env))).not.toContain('correct-horse-battery-staple');
  });
});
