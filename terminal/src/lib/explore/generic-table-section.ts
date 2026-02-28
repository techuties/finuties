/**
 * Generic Table Section -- renders any discovered API resource
 * as a collapsible table panel in the Explorer.
 *
 * Used for resources that don't have a dedicated custom section.
 */

import { apiFetch } from '../api-client';
import { humanizeResourceTitle, esc, normalizeItems } from '../explore-sections';
import { PANEL_CLS, spinnerHtml, errorHtml } from './layout';

// ─── Types ─────────────────────────────────────────────────────────────────

export interface DiscoveredResource {
  view_key: string;
  domain: string;
  resource: string;
  filter_key: string;
  filter_value: string;
  api_path: string;
}

// ─── Generic Table Renderer ────────────────────────────────────────────────

export function renderGenericTablePanel(target: HTMLElement, res: DiscoveredResource): void {
  const title = humanizeResourceTitle(res.view_key);

  const panel = document.createElement('div');
  panel.className = PANEL_CLS;
  panel.innerHTML =
    '<button type="button" class="gen-toggle w-full flex items-center justify-between gap-3 px-4 py-3 sm:px-5 hover:bg-fin-800/60 transition-colors" aria-expanded="true" aria-label="Toggle ' + esc(title) + '">' +
      '<div class="flex items-center gap-3">' +
        '<svg class="w-5 h-5 text-slate-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 0 1-1.125-1.125M3.375 19.5h7.5c.621 0 1.125-.504 1.125-1.125m-9.75 0V5.625m0 12.75v-12.75A1.125 1.125 0 0 1 3.375 4.5h17.25c.621 0 1.125.504 1.125 1.125v12.75m-21 0h7.5c.621 0 1.125-.504 1.125-1.125"/></svg>' +
        '<span class="text-sm font-semibold text-slate-200">' + esc(title) + '</span>' +
        '<span class="gen-count text-[10px] font-mono text-slate-500 rounded-full bg-fin-800/60 px-2 py-0.5 hidden">0</span>' +
      '</div>' +
      '<svg class="gen-chevron w-4 h-4 text-slate-500 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"/></svg>' +
    '</button>' +
    '<div class="gen-body border-t border-fin-800">' +
      '<div class="gen-content px-4 py-4 sm:px-5">' + spinnerHtml() + '</div>' +
    '</div>';

  target.appendChild(panel);

  // Toggle
  const toggle = panel.querySelector('.gen-toggle')!;
  const body = panel.querySelector('.gen-body') as HTMLElement;
  const chevron = panel.querySelector('.gen-chevron') as HTMLElement;
  toggle.addEventListener('click', () => {
    const expanded = toggle.getAttribute('aria-expanded') === 'true';
    toggle.setAttribute('aria-expanded', String(!expanded));
    body.style.display = expanded ? 'none' : '';
    chevron.style.transform = expanded ? 'rotate(-90deg)' : '';
  });

  const content = panel.querySelector('.gen-content') as HTMLElement;
  const countBadge = panel.querySelector('.gen-count') as HTMLElement;

  // Fetch data
  apiFetch<unknown>(res.api_path).then((apiRes) => {
    if (!apiRes.ok) {
      content.innerHTML = errorHtml('Failed to load', apiRes.error);
      return;
    }

    const items = normalizeItems(apiRes.data);
    if (items.length === 0) {
      content.innerHTML = '<p class="text-sm text-slate-500">No records found.</p>';
      return;
    }

    countBadge.textContent = String(items.length);
    countBadge.classList.remove('hidden');

    // Auto-detect columns from first row
    const firstRow = items[0] as Record<string, unknown>;
    const keys = Object.keys(firstRow).filter((k) => !k.startsWith('_') && k !== 'id');
    const INITIAL_COLS = 6;
    const INITIAL_ROWS = 15;
    let showAllCols = false;
    let showAllRows = false;

    function renderTable(): void {
      const visibleKeys = showAllCols ? keys : keys.slice(0, INITIAL_COLS);
      const visibleRows = showAllRows ? items : items.slice(0, INITIAL_ROWS);

      let table = '<div class="overflow-x-auto"><table class="w-full text-left text-xs">';
      table += '<thead><tr class="border-b border-fin-800">';
      for (const key of visibleKeys) {
        const label = key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
        table += '<th class="px-2 py-1.5 text-[10px] uppercase tracking-wider text-slate-500 font-medium whitespace-nowrap">' + esc(label) + '</th>';
      }
      table += '</tr></thead><tbody>';

      for (const row of visibleRows as Record<string, unknown>[]) {
        table += '<tr class="border-b border-fin-800/40 hover:bg-fin-800/30">';
        for (const key of visibleKeys) {
          const val = row[key];
          const display = val == null ? '\u2014' : String(val);
          const isNum = typeof val === 'number';
          table += '<td class="px-2 py-1.5 text-slate-300 truncate max-w-[200px]' + (isNum ? ' text-right font-mono' : '') + '">' + esc(display) + '</td>';
        }
        table += '</tr>';
      }
      table += '</tbody></table></div>';

      const controls: string[] = [];
      if (keys.length > INITIAL_COLS) {
        controls.push('<button type="button" class="gen-toggle-cols text-[10px] text-fin-400 hover:underline">' + (showAllCols ? 'Show fewer columns' : 'Show all ' + keys.length + ' columns') + '</button>');
      }
      if (items.length > INITIAL_ROWS) {
        controls.push('<button type="button" class="gen-toggle-rows text-[10px] text-fin-400 hover:underline">' + (showAllRows ? 'Show fewer rows' : 'Show all ' + items.length + ' rows') + '</button>');
      }
      if (!showAllRows && items.length > INITIAL_ROWS) {
        controls.push('<span class="text-[10px] text-slate-600">' + items.length + ' total rows</span>');
      }
      if (controls.length) table += '<div class="flex items-center justify-center gap-4 mt-2">' + controls.join('') + '</div>';

      content.innerHTML = table;

      const toggleCols = content.querySelector('.gen-toggle-cols');
      if (toggleCols) toggleCols.addEventListener('click', () => { showAllCols = !showAllCols; renderTable(); });
      const toggleRows = content.querySelector('.gen-toggle-rows');
      if (toggleRows) toggleRows.addEventListener('click', () => { showAllRows = !showAllRows; renderTable(); });
    }

    renderTable();
  }).catch((err: unknown) => {
    content.innerHTML = errorHtml('Failed to load', err);
  });
}
