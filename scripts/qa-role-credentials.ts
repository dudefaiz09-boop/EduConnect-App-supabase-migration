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

function credentialNames(role: QaRole) {
  const prefix = envPrefix(role);
  return {
    email: `${prefix}_EMAIL`,
    password: `${prefix}_PASSWORD`,
  };
}

function parseRequiredRoles(env: NodeJS.ProcessEnv = process.env) {
  if (env.WEB_QA_REQUIRE_ALL_ROLES === 'true') return [...QA_ROLES];

  const raw = env.WEB_QA_REQUIRED_ROLES;
  if (!raw) return ['admin'] satisfies QaRole[];

  const roles = raw
    .split(',')
    .map((role) => role.trim())
    .filter(Boolean);

  return roles.filter((role): role is QaRole => QA_ROLES.includes(role as QaRole));
}

export function invalidRequiredRoleNames(env: NodeJS.ProcessEnv = process.env) {
  if (env.WEB_QA_REQUIRE_ALL_ROLES === 'true' || !env.WEB_QA_REQUIRED_ROLES) return [];

  return env.WEB_QA_REQUIRED_ROLES.split(',')
    .map((role) => role.trim())
    .filter(Boolean)
    .filter((role) => !QA_ROLES.includes(role as QaRole));
}

export function missingCredentialNames(
  env: NodeJS.ProcessEnv = process.env,
  requiredRoles: readonly QaRole[] = parseRequiredRoles(env)
) {
  return requiredRoles.flatMap((role) => {
    const names = credentialNames(role);
    return [names.email, names.password].filter((name) => !env[name]);
  });
}

export function incompleteCredentialNames(env: NodeJS.ProcessEnv = process.env) {
  return QA_ROLES.flatMap((role) => {
    const names = credentialNames(role);
    const hasEmail = Boolean(env[names.email]);
    const hasPassword = Boolean(env[names.password]);

    if (hasEmail === hasPassword) return [];
    return [names.email, names.password].filter((name) => !env[name]);
  });
}

export function configuredRoles(env: NodeJS.ProcessEnv = process.env) {
  return QA_ROLES.filter((role) => {
    const names = credentialNames(role);
    return Boolean(env[names.email] && env[names.password]);
  });
}

export function skippedRoles(env: NodeJS.ProcessEnv = process.env) {
  return QA_ROLES.filter((role) => {
    const prefix = envPrefix(role);
    return !env[`${prefix}_EMAIL`] && !env[`${prefix}_PASSWORD`];
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

export function credentialChecklist() {
  return QA_ROLES.map((role) => {
    const names = credentialNames(role);
    return {
      role,
      email: names.email,
      password: names.password,
    };
  });
}

function printCredentialChecklist() {
  console.error('Expected role credential variable pairs:');
  for (const item of credentialChecklist()) {
    console.error(`- ${item.role}: ${item.email}, ${item.password}`);
  }
}

export function main(env: NodeJS.ProcessEnv = process.env) {
  const invalidRequiredRoles = invalidRequiredRoleNames(env);
  if (invalidRequiredRoles.length > 0) {
    console.error(`Invalid WEB_QA_REQUIRED_ROLES values: ${invalidRequiredRoles.join(', ')}`);
    console.error(`Allowed roles: ${QA_ROLES.join(', ')}`);
    printCredentialChecklist();
    return 1;
  }

  const incomplete = incompleteCredentialNames(env);
  if (incomplete.length > 0) {
    console.error('Role QA credential pairs must be complete when a role is configured.');
    console.error(`Missing environment variables: ${incomplete.join(', ')}`);
    console.error(
      'Set both WEB_QA_<ROLE>_EMAIL and WEB_QA_<ROLE>_PASSWORD, or leave both unset to skip that role.'
    );
    printCredentialChecklist();
    return 1;
  }

  const requiredRoles = parseRequiredRoles(env);
  const missing = missingCredentialNames(env, requiredRoles);
  if (missing.length > 0) {
    console.error(`Role QA requires credentials for: ${requiredRoles.join(', ')}.`);
    console.error(`Missing environment variables: ${missing.join(', ')}`);
    console.error(
      'Set required WEB_QA_<ROLE>_EMAIL and WEB_QA_<ROLE>_PASSWORD variables, or run qa:pr for admin-only PR smoke coverage.'
    );
    printCredentialChecklist();
    return 1;
  }

  const configured = configuredRoles(env);
  const skipped = skippedRoles(env);

  console.log(
    `Role QA credentials configured for ${configured.length} roles: ${configured.join(', ')}`
  );
  if (skipped.length > 0) {
    console.warn(`Role QA will skip roles without credentials: ${skipped.join(', ')}`);
    console.warn(
      'Set WEB_QA_REQUIRE_ALL_ROLES=true or WEB_QA_REQUIRED_ROLES=role,role to make missing role credentials fail preflight.'
    );
  }
  return 0;
}
