export const QA_ROLES = [
  'admin',
  'principal',
  'teacher',
  'student',
  'parent',
  'librarian',
  'accountant',
  'staff',
] as const;

export type QaRole = (typeof QA_ROLES)[number];

function envPrefix(role: QaRole) {
  return `WEB_QA_${role.toUpperCase().replace(/-/g, '_')}`;
}

export function missingCredentialNames(env: NodeJS.ProcessEnv = process.env) {
  return QA_ROLES.flatMap((role) => {
    const prefix = envPrefix(role);
    const required = [`${prefix}_EMAIL`, `${prefix}_PASSWORD`];
    return required.filter((name) => !env[name]);
  });
}

export function credentialSummary(env: NodeJS.ProcessEnv = process.env) {
  return QA_ROLES.map((role) => {
    const prefix = envPrefix(role);
    return {
      role,
      hasEmail: Boolean(env[`${prefix}_EMAIL`]),
      hasPassword: Boolean(env[`${prefix}_PASSWORD`]),
    };
  });
}

export function main(env: NodeJS.ProcessEnv = process.env) {
  const missing = missingCredentialNames(env);

  if (missing.length > 0) {
    console.error('Role QA requires credentials for every role.');
    console.error(`Missing environment variables: ${missing.join(', ')}`);
    console.error(
      'Set the missing WEB_QA_<ROLE>_EMAIL and WEB_QA_<ROLE>_PASSWORD variables, or run qa:pr for admin-only PR smoke coverage.'
    );
    return 1;
  }

  console.log(`Role QA credentials configured for ${QA_ROLES.length} roles.`);
  return 0;
}
