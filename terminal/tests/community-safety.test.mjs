import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

test('public env defaults keep FinUties API-only mode', async () => {
  const envPath = resolve(process.cwd(), '..', '.env.example');
  const content = await readFile(envPath, 'utf8');

  assert.match(content, /PUBLIC_API_ORIGIN=https:\/\/data\.finuties\.com/);
  assert.match(content, /PUBLIC_ALLOW_NON_FINUTIES_API=false/);
});
