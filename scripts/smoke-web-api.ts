const DEFAULT_API_BASE_URL = 'http://localhost:8080/api';
const rawBaseUrl = process.env.API_BASE_URL || DEFAULT_API_BASE_URL;
const baseUrl = rawBaseUrl.replace(/\/+$/, '');
const tenantId = process.env.SMOKE_TENANT_ID || 'tenant-a';
const token = process.env.SMOKE_ACCESS_TOKEN || '';
const usingDefaultBaseUrl = !process.env.API_BASE_URL;

type SmokeCase = {
  name: string;
  path: string;
  headers?: Record<string, string>;
  expect: number[];
};

const cases: SmokeCase[] = [
  { name: 'health', path: '/health', expect: [200] },
  { name: 'ai status', path: '/ai/status', expect: [200] },
  {
    name: 'notifications auth/tenant surface',
    path: '/notifications',
    headers: token ? { Authorization: `Bearer ${token}`, 'x-school-id': tenantId } : {},
    expect: token ? [200, 401, 403] : [400, 401],
  },
  {
    name: 'announcements auth/tenant surface',
    path: '/announcements',
    headers: token ? { Authorization: `Bearer ${token}`, 'x-school-id': tenantId } : {},
    expect: token ? [200, 401, 403] : [400, 401],
  },
];

let failed = false;
let printedBaseUrlGuidance = false;

function errorMessage(error: unknown) {
  if (!(error instanceof Error)) {
    return String(error);
  }

  const details = [error.message];
  const cause = error.cause;
  if (cause instanceof Error) {
    details.push(`cause=${cause.message}`);
    const causeRecord = cause as NodeJS.ErrnoException;
    for (const key of ['code', 'errno', 'syscall', 'hostname', 'address', 'port'] as const) {
      const value = causeRecord[key];
      if (value !== undefined) {
        details.push(`${key}=${String(value)}`);
      }
    }
  }

  return details.join('; ');
}

function printBaseUrlGuidance() {
  if (printedBaseUrlGuidance) return;
  printedBaseUrlGuidance = true;
  console.error(`[smoke:web-api] API_BASE_URL=${baseUrl}`);
  if (usingDefaultBaseUrl) {
    console.error(
      '[smoke:web-api] API_BASE_URL is not set, so the script used the local standalone default.'
    );
  }
  console.error(
    '[smoke:web-api] For deployed checks, set API_BASE_URL to an HTTPS URL ending in /api.'
  );
  console.error(
    '[smoke:web-api] For local standalone checks, build/start the functions API and keep API_BASE_URL at http://localhost:8080/api.'
  );
  console.error(
    '[smoke:web-api] For the QA harness, set API_BASE_URL=http://127.0.0.1:3000/api while scripts/start-qa-web-api.cjs is running.'
  );
}

for (const testCase of cases) {
  let response: Response;
  const url = `${baseUrl}${testCase.path}`;
  try {
    response = await fetch(url, {
      headers: testCase.headers,
      signal: AbortSignal.timeout(10_000),
    });
  } catch (error) {
    failed = true;
    console.error(`[smoke:web-api] ${testCase.name} could not reach ${url}.`);
    console.error(`[smoke:web-api] ${errorMessage(error)}`);
    printBaseUrlGuidance();
    continue;
  }

  if (!testCase.expect.includes(response.status)) {
    failed = true;
    console.error(
      `[smoke:web-api] ${testCase.name} expected ${testCase.expect.join('/')} but got ${
        response.status
      }`
    );
  } else {
    console.log(`[smoke:web-api] ${testCase.name}: ${response.status}`);
  }
}

if (failed) {
  process.exitCode = 1;
}
