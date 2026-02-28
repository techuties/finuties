/**
 * Session-level API call cost tracker.
 * Tracks how many API calls were made during the current browser session
 * and estimates cost in credits / USD.
 */

const SESSION_KEY = 'finuties-analysis-cost';
const CREDITS_PER_CALL = 1;
const USD_PER_CREDIT = 0.001;

export interface SessionCost {
  calls: number;
  credits: number;
  estimatedUsd: number;
}

function load(): { calls: number } {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return { calls: 0 };
    return JSON.parse(raw);
  } catch {
    return { calls: 0 };
  }
}

function save(data: { calls: number }): void {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(data));
}

/** Return the current session cost summary. */
export function getSessionCost(): SessionCost {
  const { calls } = load();
  const credits = calls * CREDITS_PER_CALL;
  return { calls, credits, estimatedUsd: credits * USD_PER_CREDIT };
}

/** Add N API calls to the session counter. */
export function addCalls(n: number): void {
  const data = load();
  data.calls += n;
  save(data);
}

/** Reset the session cost counter. */
export function resetSession(): void {
  sessionStorage.removeItem(SESSION_KEY);
}
