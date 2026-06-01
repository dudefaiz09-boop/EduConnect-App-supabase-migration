import {
  QA_ROLES,
  configuredRoles,
  credentialSummary,
  incompleteCredentialNames,
  invalidRequiredRoleNames,
  main,
  missingCredentialNames,
  skippedRoles,
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
  let consoleWarn: jest.SpyInstance;

  beforeEach(() => {
    consoleLog = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    consoleWarn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    consoleLog.mockRestore();
    consoleError.mockRestore();
    consoleWarn.mockRestore();
  });

  it('reports missing required role credential variable names without exposing values', () => {
    expect(missingCredentialNames({ WEB_QA_ADMIN_EMAIL: 'admin@example.test' })).toEqual(
      expect.arrayContaining(['WEB_QA_ADMIN_PASSWORD'])
    );
    expect(missingCredentialNames({ WEB_QA_ADMIN_EMAIL: 'admin@example.test' })).not.toContain(
      'WEB_QA_STAFF_PASSWORD'
    );
  });

  it('passes when required admin credentials are present and optional roles are absent', () => {
    const env = {
      WEB_QA_ADMIN_EMAIL: 'admin@example.test',
      WEB_QA_ADMIN_PASSWORD: 'correct-horse-battery-staple',
    };

    expect(main(env)).toBe(0);
    expect(configuredRoles(env)).toEqual(['admin']);
    expect(skippedRoles(env)).toContain('staff');
  });

  it('can require every role when WEB_QA_REQUIRE_ALL_ROLES is true', () => {
    const env = credentialsForAllRoles();

    expect(missingCredentialNames(env)).toEqual([]);
    expect(main({ ...env, WEB_QA_REQUIRE_ALL_ROLES: 'true' })).toBe(0);
  });

  it('fails when WEB_QA_REQUIRED_ROLES includes an invalid role name', () => {
    const env = {
      WEB_QA_ADMIN_EMAIL: 'admin@example.test',
      WEB_QA_ADMIN_PASSWORD: 'correct-horse-battery-staple',
      WEB_QA_REQUIRED_ROLES: 'admin,counselor',
    };

    expect(invalidRequiredRoleNames(env)).toEqual(['counselor']);
    expect(main(env)).toBe(1);
  });

  it('fails all-role mode when any role credential pair is missing', () => {
    const env = credentialsForAllRoles();
    delete env.WEB_QA_STAFF_EMAIL;
    delete env.WEB_QA_STAFF_PASSWORD;

    expect(missingCredentialNames({ ...env, WEB_QA_REQUIRE_ALL_ROLES: 'true' })).toEqual(
      expect.arrayContaining(['WEB_QA_STAFF_EMAIL', 'WEB_QA_STAFF_PASSWORD'])
    );
    expect(main({ ...env, WEB_QA_REQUIRE_ALL_ROLES: 'true' })).toBe(1);
  });

  it('passes when every role has email and password credentials', () => {
    const env = credentialsForAllRoles();

    expect(main(env)).toBe(0);
    expect(configuredRoles(env)).toEqual([...QA_ROLES]);
  });

  it('fails when a configured role credential pair is incomplete', () => {
    const env = credentialsForAllRoles();
    delete env.WEB_QA_STAFF_PASSWORD;

    expect(incompleteCredentialNames(env)).toEqual(['WEB_QA_STAFF_PASSWORD']);
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
