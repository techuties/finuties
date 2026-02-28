/**
 * Terminal Key -- ensures a "Terminal" API key exists for the user.
 *
 * Used to track per-session token usage on the dashboard.
 */

import { apiFetch } from './api-client';

interface KeyResult {
  status: 'exists' | 'created' | 'error';
  key?: string;
  error?: string;
}

export async function ensureTerminalKey(): Promise<KeyResult> {
  try {
    // Check if key already exists on server.
    // Listing does not return secret key value, only metadata.
    const listRes = await apiFetch<{ keys?: Array<{ id: string; name: string }> }>('/api/v1/auth/api-keys');
    if (listRes.ok && listRes.data?.keys) {
      const existing = listRes.data.keys.find((k) => (k.name || '').toLowerCase() === 'terminal');
      if (existing) return { status: 'exists' };
    }

    // Create new terminal key and return secret once.
    const createRes = await apiFetch<{ key?: string }>('/api/v1/auth/api-keys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Terminal' }),
    });

    if (createRes.ok && createRes.data?.key) {
      return { status: 'created', key: createRes.data.key };
    }

    return { status: 'error', error: createRes.error || 'Failed to create key' };
  } catch (err) {
    return { status: 'error', error: err instanceof Error ? err.message : String(err) };
  }
}
