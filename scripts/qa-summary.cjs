#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '..');
const resultsRoot = path.join(repoRoot, 'qa', 'results');
const roles = [
  'admin',
  'principal',
  'teacher',
  'student',
  'parent',
  'librarian',
  'accountant',
  'staff',
];

function exists(filePath) {
  return fs.existsSync(filePath);
}

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
}

function listFiles(dir, predicate = () => true) {
  if (!exists(dir)) {
    return [];
  }

  return fs
    .readdirSync(dir, { withFileTypes: true })
    .flatMap((entry) => {
      const fullPath = path.join(dir, entry.name);
      return entry.isDirectory() ? listFiles(fullPath, predicate) : [fullPath];
    })
    .filter(predicate);
}

function latestFilesByRoute(files) {
  const latest = new Map();

  for (const file of files) {
    const data = readJson(file);
    if (!data) {
      continue;
    }

    const route = data.requestedUrl || data.finalDisplayedUrl || path.basename(file);
    const current = latest.get(route);
    const mtime = fs.statSync(file).mtimeMs;
    if (!current || mtime > current.mtime) {
      latest.set(route, { file, data, mtime });
    }
  }

  return [...latest.values()].sort((a, b) =>
    a.data.requestedUrl.localeCompare(b.data.requestedUrl)
  );
}

function score(category) {
  return category?.score == null ? 'n/a' : Math.round(category.score * 100);
}

function auditStatus(audit) {
  if (!audit || audit.score == null || audit.score === 1) {
    return null;
  }

  const savings = audit.details?.overallSavingsMs
    ? `, savings ${Math.round(audit.details.overallSavingsMs)} ms`
    : '';
  return `${audit.id}: score ${audit.score}${savings}`;
}

function printLighthouseSummary() {
  const lighthouseDir = path.join(resultsRoot, 'lighthouse');
  const reports = listFiles(lighthouseDir, (file) => file.endsWith('.report.json'));

  console.log('Lighthouse');
  if (reports.length === 0) {
    console.log('- No Lighthouse JSON reports found.');
    return;
  }

  for (const { file, data } of latestFilesByRoute(reports)) {
    const categories = data.categories || {};
    console.log(
      `- ${data.requestedUrl || path.basename(file)}: perf ${score(categories.performance)}, a11y ${score(
        categories.accessibility
      )}, best ${score(categories['best-practices'])}, seo ${score(categories.seo)}`
    );

    const notableAudits = [
      data.audits?.['render-blocking-resources'],
      data.audits?.['unused-javascript'],
      data.audits?.['network-dependency-tree-insight'],
      data.audits?.['render-blocking-insight'],
    ]
      .map(auditStatus)
      .filter(Boolean);

    for (const item of notableAudits) {
      console.log(`  - ${item}`);
    }
  }
}

function printPlaywrightSummary() {
  const artifactsDir = path.join(resultsRoot, 'playwright-artifacts');
  const reportHtml = path.join(resultsRoot, 'playwright-report', 'index.html');
  const lastRun = readJson(path.join(artifactsDir, '.last-run.json'));
  const errorContexts = listFiles(
    artifactsDir,
    (file) => path.basename(file) === 'error-context.md'
  );
  const screenshots = listFiles(artifactsDir, (file) => /\.(png|jpg|jpeg)$/i.test(file));

  console.log('\nPlaywright');
  console.log(`- Last run: ${lastRun?.status || 'unknown'}`);
  console.log(
    `- HTML report: ${exists(reportHtml) ? path.relative(repoRoot, reportHtml) : 'not found'}`
  );
  console.log(`- Failure contexts retained: ${errorContexts.length}`);
  console.log(`- Screenshots retained: ${screenshots.length}`);
}

function printRoleSummary() {
  console.log('\nConfigured role credentials');

  for (const role of roles) {
    const prefix = `WEB_QA_${role.toUpperCase()}`;
    const hasEmail = Boolean(process.env[`${prefix}_EMAIL`]);
    const hasPassword = Boolean(process.env[`${prefix}_PASSWORD`]);
    console.log(`- ${role}: ${hasEmail && hasPassword ? 'available' : 'missing'}`);
  }

  console.log(
    `- Strict role requirement: ${
      process.env.WEB_QA_REQUIRE_ALL_ROLES === 'true' || process.env.WEB_QA_REQUIRED_ROLES
        ? 'enabled'
        : 'disabled'
    }`
  );
}

function printRuntimeSummary() {
  const apiBaseUrl =
    process.env.API_BASE_URL ||
    process.env.VITE_API_BASE_URL ||
    (process.env.PLAYWRIGHT_WEB_SERVER_COMMAND
      ? '(custom server command)'
      : 'http://127.0.0.1:3000/api');

  console.log('QA runtime');
  console.log(`- Web URL: ${process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:4173'}`);
  console.log(`- API URL: ${apiBaseUrl}`);
  console.log(
    `- Web server command: ${process.env.PLAYWRIGHT_WEB_SERVER_COMMAND || 'node scripts/start-qa-web-api.cjs'}`
  );
}

printRuntimeSummary();
printPlaywrightSummary();
printLighthouseSummary();
printRoleSummary();
