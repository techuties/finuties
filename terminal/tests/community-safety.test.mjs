import test from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

async function walk(dir) {
  const out = [];
  for (const ent of await readdir(dir, { withFileTypes: true })) {
    const p = resolve(dir, ent.name);
    if (ent.isDirectory()) out.push(...await walk(p));
    else if (/\.(ts|tsx|astro|mjs|js)$/.test(ent.name)) out.push(p);
  }
  return out;
}

test('api client defaults keep FinUties API-only mode', async () => {
  const apiClientPath = resolve(process.cwd(), 'src/lib/api-client.ts');
  const content = await readFile(apiClientPath, 'utf8');

  assert.match(content, /const DEFAULT_BASE = \(import\.meta\.env\.PUBLIC_API_ORIGIN \|\| 'https:\/\/data\.finuties\.com'\)\.trim\(\);/);
  assert.match(content, /const ALLOW_NON_FINUTIES_API = import\.meta\.env\.PUBLIC_ALLOW_NON_FINUTIES_API === 'true';/);
});

test('auth bootstrap only trusts API keys in local storage', async () => {
  const bootstrapPath = resolve(process.cwd(), 'src/lib/auth/bootstrap.ts');
  const content = await readFile(bootstrapPath, 'utf8');

  assert.doesNotMatch(content, /fin_session/);
  assert.doesNotMatch(content, /getSessionCookieToken/);
  assert.doesNotMatch(content, /cookieToken/);
  assert.match(content, /if \(localToken && !isApiKeyToken\(localToken\)\)/);
});

test('login page communicates API-key-only authentication', async () => {
  const loginPagePath = resolve(process.cwd(), 'src/pages/index.astro');
  const content = await readFile(loginPagePath, 'utf8');

  assert.match(content, /Connect with API Key/);
  assert.match(content, /only supports API key authentication/i);
});

test('explore demotes conflict, climate, sanctions, maritime to labeled research', async () => {
  const landingPath = resolve(process.cwd(), 'src/lib/explore/views/landing.ts');
  const registryPath = resolve(process.cwd(), 'src/lib/source-registry.ts');
  const landing = await readFile(landingPath, 'utf8');
  const registry = await readFile(registryPath, 'utf8');

  assert.doesNotMatch(landing, /source=ucdp/);
  assert.match(landing, /research only/);
  assert.match(registry, /RESEARCH_CATEGORY_IDS/);
  assert.match(registry, /'politics'/);
  assert.match(registry, /'maritime'/);
  assert.match(registry, /'climate'/);
  assert.match(registry, /'sanctions'/);
  assert.match(registry, /categoryDisplayLabel/);
});

test('community default routes omit paid and data-ops chrome', async () => {
  const pagesRoot = resolve(process.cwd(), 'src/pages');
  const pageDirs = await readdir(pagesRoot);
  assert.ok(!pageDirs.includes('admin'), 'community client must not ship /admin');
  assert.ok(!pageDirs.includes('analyze'), 'community client must not ship /analyze');

  const files = await walk(resolve(process.cwd(), 'src'));
  const joined = (await Promise.all(files.map((p) => readFile(p, 'utf8')))).join('\n');
  assert.doesNotMatch(joined, /href=["']\/admin["']/);
  assert.doesNotMatch(joined, /href=["']\/analyze["']/);
  assert.doesNotMatch(joined, /trade_decision/);
  assert.doesNotMatch(joined, /from ['"][^'"]*\/(api|ingest|analytics|trading|growth)\//);
  assert.doesNotMatch(joined, /PUBLIC_ANALYTICS_DECISION_SURFACES/);
});

test('default home tiles omit research cards; registerCard stays public', async () => {
  const registryPath = resolve(process.cwd(), 'src/lib/card-registry.ts');
  const content = await readFile(registryPath, 'utf8');
  const defaultFn = content.slice(
    content.indexOf('export function defaultLayout'),
    content.indexOf('if (found.length === 0)'),
  );

  assert.match(content, /export function registerCard/);
  assert.match(content, /RESEARCH_HOME_CARD_TYPES/);
  assert.doesNotMatch(defaultFn, /geopolitical-risk/);
  assert.doesNotMatch(defaultFn, /sanctions/);
  assert.doesNotMatch(defaultFn, /climate-monitor/);
  assert.doesNotMatch(defaultFn, /trade-maritime/);
});

test('public GitHub URL points at techuties/finuties', async () => {
  const loginPagePath = resolve(process.cwd(), 'src/pages/index.astro');
  const packagePath = resolve(process.cwd(), 'package.json');
  const login = await readFile(loginPagePath, 'utf8');
  const pkg = await readFile(packagePath, 'utf8');

  assert.match(login, /https:\/\/github\.com\/techuties\/finuties/);
  assert.doesNotMatch(login, /finuties-terminal/);
  assert.match(pkg, /https:\/\/github\.com\/techuties\/finuties\.git/);
  assert.doesNotMatch(pkg, /finuites/);
});
