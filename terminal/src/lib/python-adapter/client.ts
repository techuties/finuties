import type { PythonAdapterConfig, PythonComputeRequest, PythonComputeResponse } from './contract';

const DEFAULT_ORIGIN = (import.meta.env.PUBLIC_LOCAL_PYTHON_ADAPTER_ORIGIN || 'http://127.0.0.1:8765').trim();
const ENABLED = import.meta.env.PUBLIC_ENABLE_LOCAL_PYTHON_ADAPTER === 'true';
const TIMEOUT_MS = Math.max(500, Number(import.meta.env.PUBLIC_LOCAL_PYTHON_ADAPTER_TIMEOUT_MS || 5000));
const MAX_SERIES_LENGTH = Math.max(50, Number(import.meta.env.PUBLIC_LOCAL_PYTHON_MAX_SERIES || 5000));

function isLocalOrigin(origin: string): boolean {
  try {
    const u = new URL(origin);
    return u.hostname === '127.0.0.1' || u.hostname === 'localhost';
  } catch {
    return false;
  }
}

export function getPythonAdapterConfig(): PythonAdapterConfig {
  return {
    enabled: ENABLED && isLocalOrigin(DEFAULT_ORIGIN),
    origin: DEFAULT_ORIGIN,
    timeoutMs: TIMEOUT_MS,
    maxSeriesLength: MAX_SERIES_LENGTH,
  };
}

export async function runPythonCompute(payload: PythonComputeRequest): Promise<PythonComputeResponse> {
  const cfg = getPythonAdapterConfig();
  if (!cfg.enabled) return { ok: false, error: 'Local python adapter disabled' };
  if (!Array.isArray(payload.series) || payload.series.length > cfg.maxSeriesLength) {
    return { ok: false, error: `Series length exceeds limit (${cfg.maxSeriesLength})` };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), cfg.timeoutMs);
  try {
    const res = await fetch(`${cfg.origin.replace(/\/+$/, '')}/compute/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    const data = await res.json() as PythonComputeResponse;
    return data;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, error: msg };
  } finally {
    clearTimeout(timer);
  }
}
