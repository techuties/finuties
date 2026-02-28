/**
 * Universal search bar with autocomplete suggestions.
 * Renders into a container element, fetches suggestions via
 * GET /api/v1/search/suggest, and supports keyboard navigation.
 *
 * The suggest endpoint returns unified entities -- a single "Apple Inc."
 * entry with types: ["stock", "company"] instead of separate duplicates.
 */

import { apiFetch } from './api-client';

// ─── Types ───────────────────────────────────────────────────────────────────

interface UnifiedEntity {
  name: string;
  types: string[];
  symbol?: string | null;
  cik?: string | null;
  exchange?: string | null;
  investor_type?: string | null;
}

interface SuggestResponse {
  q: string;
  suggestions: UnifiedEntity[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function esc(s: unknown): string {
  const str = String(s ?? '');
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function debounce<T extends (...args: unknown[]) => void>(fn: T, ms: number): T {
  let id: ReturnType<typeof setTimeout> | null = null;
  return ((...args: unknown[]) => {
    if (id) clearTimeout(id);
    id = setTimeout(() => fn(...args), ms);
  }) as unknown as T;
}

function hrefForEntity(e: UnifiedEntity): string {
  if (e.cik && e.types.includes('company')) {
    let url = '/explore?type=company&cik=' + encodeURIComponent(e.cik);
    if (e.name) url += '&name=' + encodeURIComponent(e.name);
    if (e.symbol) url += '&symbol=' + encodeURIComponent(e.symbol);
    return url;
  }
  if (e.symbol && e.types.includes('stock')) {
    let url = '/explore?type=stock&symbol=' + encodeURIComponent(e.symbol);
    if (e.name) url += '&name=' + encodeURIComponent(e.name);
    return url;
  }
  if (e.cik && e.types.includes('investor')) {
    let url = '/explore?type=investor&cik=' + encodeURIComponent(e.cik);
    if (e.name) url += '&name=' + encodeURIComponent(e.name);
    return url;
  }
  return '/explore?q=' + encodeURIComponent(e.name);
}

// ─── Icons (inline SVG) ─────────────────────────────────────────────────────

const ICONS: Record<string, string> = {
  search: '<svg class="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"/></svg>',
  entity: '<svg class="w-4 h-4 text-fin-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"/></svg>',
  investor: '<svg class="w-4 h-4 text-purple-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0"/></svg>',
};

const TYPE_BADGE: Record<string, { cls: string; label: string }> = {
  stock: { cls: 'bg-emerald-500/20 text-emerald-400', label: 'Stock' },
  company: { cls: 'bg-blue-500/20 text-blue-400', label: 'Filings' },
  investor: { cls: 'bg-purple-500/20 text-purple-400', label: 'Investor' },
};

// ─── Component ───────────────────────────────────────────────────────────────

export function initSearchBar(container: HTMLElement): void {
  container.innerHTML = `
    <div class="search-bar-wrapper relative w-full" role="combobox" aria-expanded="false" aria-haspopup="listbox">
      <div class="flex items-center gap-2 rounded-lg border border-fin-800 bg-fin-950/80 px-3 py-1.5 focus-within:border-fin-600 focus-within:ring-1 focus-within:ring-fin-600/40 transition-all">
        ${ICONS.search}
        <input
          type="text"
          class="search-input flex-1 bg-transparent text-sm text-slate-200 placeholder-slate-500 outline-none min-w-0"
          placeholder="Search stocks, companies, investors\u2026"
          autocomplete="off"
          spellcheck="false"
          aria-label="Search entities"
          aria-autocomplete="list"
          aria-controls="search-suggestions"
        />
        <kbd class="hidden sm:inline-flex items-center gap-0.5 rounded border border-fin-800 bg-fin-900 px-1.5 py-0.5 text-[10px] text-slate-500 font-mono">/</kbd>
      </div>
      <div id="search-suggestions" role="listbox" class="search-dropdown absolute left-0 right-0 top-full mt-1 rounded-lg border border-fin-700 bg-fin-950 shadow-2xl z-[60] hidden overflow-hidden max-h-[420px] overflow-y-auto"></div>
    </div>
  `;

  const input = container.querySelector('.search-input') as HTMLInputElement;
  const dropdown = container.querySelector('.search-dropdown') as HTMLElement;
  const wrapper = container.querySelector('.search-bar-wrapper') as HTMLElement;

  let suggestions: UnifiedEntity[] = [];
  let activeIdx = -1;
  let abortCtrl: AbortController | null = null;

  const fetchSuggestions = debounce(async () => {
    const q = input.value.trim();
    if (q.length < 2) { closeSuggestions(); return; }

    if (abortCtrl) abortCtrl.abort();
    abortCtrl = new AbortController();

    const res = await apiFetch<SuggestResponse>(
      '/api/v1/search/suggest?q=' + encodeURIComponent(q) + '&limit=10',
      { signal: abortCtrl.signal },
    );

    if (!res.ok || !res.data?.suggestions) { closeSuggestions(); return; }

    suggestions = res.data.suggestions;
    activeIdx = -1;
    renderDropdown();
  }, 250);

  function renderDropdown(): void {
    if (suggestions.length === 0) {
      dropdown.innerHTML = '<div class="px-4 py-3 text-sm text-slate-500">No results found</div>';
      showDropdown();
      return;
    }

    let html = '';
    for (let i = 0; i < suggestions.length; i++) {
      const e = suggestions[i];
      const isActive = i === activeIdx;
      const isInvestor = e.types.length === 1 && e.types[0] === 'investor';
      const icon = isInvestor ? ICONS.investor : ICONS.entity;

      let primary = '';
      if (e.symbol && !/^CUSIP_/i.test(e.symbol)) {
        primary = '<span class="font-semibold text-slate-100">' + esc(e.symbol) + '</span> <span class="text-slate-300">' + esc(e.name) + '</span>';
      } else {
        primary = '<span class="text-slate-200">' + esc(e.name) + '</span>';
      }

      const meta: string[] = [];
      if (e.exchange) meta.push(esc(e.exchange));
      if (e.cik) meta.push('CIK ' + esc(e.cik));
      if (isInvestor && e.investor_type) meta.push(esc(e.investor_type));
      const secondary = meta.length > 0
        ? '<div class="mt-0.5 text-[10px] text-slate-500 truncate">' + meta.join(' \u00b7 ') + '</div>'
        : '';

      let badges = '';
      for (const t of e.types) {
        const b = TYPE_BADGE[t];
        if (b) {
          badges += '<span class="rounded-full px-2 py-0.5 text-[10px] font-semibold ' + b.cls + '">' + b.label + '</span>';
        }
      }

      html += `<div
        role="option"
        aria-selected="${isActive}"
        data-idx="${i}"
        class="search-option flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors ${isActive ? 'bg-fin-800' : 'hover:bg-fin-900/80'}"
      >
        ${icon}
        <div class="flex-1 min-w-0">
          <div class="text-sm truncate">${primary}</div>
          ${secondary}
        </div>
        <div class="flex items-center gap-1.5 flex-shrink-0">${badges}</div>
      </div>`;
    }

    html += `<div class="px-4 py-2 border-t border-fin-800 text-[10px] text-slate-500 flex items-center justify-between">
      <span>Press <kbd class="rounded border border-fin-800 px-1 py-0.5 font-mono">Enter</kbd> for full results</span>
      <span>${suggestions.length} entities</span>
    </div>`;

    dropdown.innerHTML = html;
    showDropdown();

    dropdown.querySelectorAll('.search-option').forEach((el) => {
      el.addEventListener('mousedown', (ev) => {
        ev.preventDefault();
        const idx = parseInt((el as HTMLElement).dataset.idx || '0', 10);
        navigateToSuggestion(idx);
      });
    });
  }

  function showDropdown(): void {
    dropdown.classList.remove('hidden');
    wrapper.setAttribute('aria-expanded', 'true');
  }

  function closeSuggestions(): void {
    dropdown.classList.add('hidden');
    wrapper.setAttribute('aria-expanded', 'false');
    suggestions = [];
    activeIdx = -1;
  }

  function navigateToSuggestion(idx: number): void {
    const e = suggestions[idx];
    if (!e) return;
    window.location.href = hrefForEntity(e);
  }

  function navigateToFullSearch(): void {
    const q = input.value.trim();
    if (!q) return;
    window.location.href = '/explore?q=' + encodeURIComponent(q);
  }

  function updateActive(newIdx: number): void {
    activeIdx = newIdx;
    const items = dropdown.querySelectorAll('.search-option');
    items.forEach((el, i) => {
      const isActive = i === activeIdx;
      el.setAttribute('aria-selected', String(isActive));
      (el as HTMLElement).className = `search-option flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors ${isActive ? 'bg-fin-800' : 'hover:bg-fin-900/80'}`;
      if (isActive) el.scrollIntoView({ block: 'nearest' });
    });
  }

  input.addEventListener('input', () => { fetchSuggestions(); });

  input.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'Escape') { closeSuggestions(); input.blur(); return; }
    if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIdx >= 0 && activeIdx < suggestions.length) navigateToSuggestion(activeIdx);
      else navigateToFullSearch();
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (suggestions.length === 0) return;
      updateActive(activeIdx < suggestions.length - 1 ? activeIdx + 1 : 0);
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (suggestions.length === 0) return;
      updateActive(activeIdx > 0 ? activeIdx - 1 : suggestions.length - 1);
      return;
    }
  });

  input.addEventListener('focus', () => { if (suggestions.length > 0) showDropdown(); });
  input.addEventListener('blur', () => { setTimeout(closeSuggestions, 150); });

  document.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === '/' && document.activeElement !== input) {
      const tag = (document.activeElement as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if ((document.activeElement as HTMLElement)?.isContentEditable) return;
      e.preventDefault();
      input.focus();
    }
  });

  const urlParams = new URLSearchParams(window.location.search);
  const existingQ = urlParams.get('q');
  if (existingQ) { input.value = existingQ; }
}
