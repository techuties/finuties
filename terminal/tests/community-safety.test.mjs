import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

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
