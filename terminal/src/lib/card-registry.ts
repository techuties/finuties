/**
 * Card Registry -- manages card definitions for the dashboard.
 *
 * Each card type has a definition with fetch/render functions.
 * Layout instances reference card types by string ID.
 *
 * Community extension contract:
 * - Register new cards through `registerCard(...)` from dedicated card modules.
 * - Keep `type` stable once published (avoid breaking persisted user layouts).
 * - Return API-backed data via shared `apiFetch` in card implementations.
 */

// ─── Types ─────────────────────────────────────────────────────────────────

export type CardSize = 'sm' | 'md' | 'lg' | 'full';
export type ViewType = 'list' | 'chart' | 'map' | 'table' | 'grid' | 'detail';

export interface CardData {
  payload: unknown;
  tokenCost: number;
  creditsRemaining: number | null;
}

export interface CardDefinition {
  type: string;
  title: string;
  description: string;
  icon: string;
  defaultSize: CardSize;
  views?: ViewType[];
  cacheTtl?: number;
  /** URL to the corresponding Explorer view for this card's data. */
  exploreUrl?: string;
  fetch: () => Promise<CardData>;
  render: (container: HTMLElement, data: CardData, activeView?: ViewType) => (() => void) | void;
}

export interface CardInstance {
  id: string;
  type: string;
  position: number;
  size: CardSize;
  activeView?: string;
}

// ─── Registry ──────────────────────────────────────────────────────────────

const _defs = new Map<string, CardDefinition>();

export function registerCard(def: CardDefinition): void {
  if (_defs.has(def.type)) {
    console.warn('[card-registry] duplicate type "' + def.type + '" — overwriting previous registration');
  }
  _defs.set(def.type, def);
}

export function getCardDef(type: string): CardDefinition | undefined {
  return _defs.get(type);
}

export function allCardDefs(): CardDefinition[] {
  return Array.from(_defs.values());
}

// ─── Layout persistence ────────────────────────────────────────────────────

const LAYOUT_KEY = 'dashboard-layout-v4';

export function loadLayout(): CardInstance[] | null {
  try {
    const raw = localStorage.getItem(LAYOUT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveLayout(layout: CardInstance[]): void {
  try {
    localStorage.setItem(LAYOUT_KEY, JSON.stringify(layout));
  } catch {}
}

export function defaultLayout(): CardInstance[] {
  const preferred = [
    'alerts',
    'world-events',
    'econ-calendar',
    'macro-pulse',
    'energy',
    'fx-rates',
    'crypto-prices',
    'treasury-yields',
    'fed-rates',
    'food-prices',
    'cot-sentiment',
    'geopolitical-risk',
    'sanctions',
    'insider-transactions',
    'sec-filings',
    'top-invested',
  ];
  const defs = allCardDefs();
  const found = preferred
    .map(type => defs.find(d => d.type === type))
    .filter((d): d is CardDefinition => d != null);
  if (found.length === 0) {
    return defs.slice(0, 6).map((def, i) => ({
      id: newCardId(),
      type: def.type,
      position: i,
      size: def.defaultSize,
    }));
  }
  return found.map((def, i) => ({
    id: newCardId(),
    type: def.type,
    position: i,
    size: def.defaultSize,
  }));
}

// ─── ID generator ──────────────────────────────────────────────────────────

let _idCounter = Date.now();
export function newCardId(): string {
  return 'c' + (++_idCounter).toString(36);
}
