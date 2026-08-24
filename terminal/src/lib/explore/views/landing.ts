/**
 * Landing View -- smart landing page for the Explorer.
 *
 * Shows a category grid with live availability badges, recent searches,
 * a data health pod, and groups unavailable categories into a compact section.
 */
import {
  podGrid, pod, kpiStrip, emptyGroup, esc, badgeCls,
  type RenderContext,
} from '../layout';
import {
  COMMERCIAL_EXPLORE_CATEGORIES,
  RESEARCH_EXPLORE_CATEGORIES,
  categoryDisplayLabel,
  sourcesForCategory,
  isResearchCategory,
  type CategoryDef,
  type SourceDef,
} from '../../source-registry';
import { fetchSourceAvailability, type SourceAvailability } from '../../global-data-api';

// ─── Shared pod helpers (used by both sync render and async overlay) ────────

function heroSearchPod(): string {
  return pod(
    '<div class="text-center py-4">' +
    '<p class="text-sm text-slate-400 mb-3">Type a company name, ticker, country, or data source in the search bar above</p>' +
    '<div class="flex items-center justify-center gap-3 flex-wrap">' +
    '<a href="/explore?q=AAPL" class="rounded-full bg-fin-800/60 px-3 py-1 text-xs text-slate-300 hover:bg-fin-700/60 transition-colors">AAPL</a>' +
    '<a href="/explore?q=Germany" class="rounded-full bg-fin-800/60 px-3 py-1 text-xs text-slate-300 hover:bg-fin-700/60 transition-colors">Germany</a>' +
    '<a href="/explore?mode=data&source=cftc_legacy_futures-facts" class="rounded-full bg-fin-800/60 px-3 py-1 text-xs text-slate-300 hover:bg-fin-700/60 transition-colors">CFTC positioning</a>' +
    '<a href="/explore?q=Berkshire" class="rounded-full bg-fin-800/60 px-3 py-1 text-xs text-slate-300 hover:bg-fin-700/60 transition-colors">Berkshire Hathaway</a>' +
    '</div>' +
    '<p class="mt-4 text-xs text-slate-500">Filings, ownership, equities, positioning, rates, economics, and calendar carry published freshness budgets. Conflict, climate, sanctions, and maritime catalogues are research only — not a commercial commitment.</p>' +
    '</div>',
    { span: 4 },
  );
}

function recentSearchesPod(): string {
  try {
    const recent: { label: string; url: string; type: string }[] = JSON.parse(localStorage.getItem('explore-recent') || '[]');
    if (recent.length === 0) return '';
    let inner = '<div class="flex items-center gap-2 flex-wrap">';
    for (const r of recent.slice(0, 5)) {
      const color = r.type === 'country' ? 'bg-teal-500/20 text-teal-400' : r.type === 'company' ? 'bg-blue-500/20 text-blue-400' : 'bg-slate-500/20 text-slate-400';
      inner += '<a href="' + esc(r.url) + '" class="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ' + color + ' hover:opacity-80 transition-opacity">' + esc(r.label) + '</a>';
    }
    inner += '</div>';
    return pod(inner, { title: 'Recent', span: 4, compact: true });
  } catch { return ''; }
}

// ─── Main render ────────────────────────────────────────────────────────────

export function renderLanding(ctx: RenderContext): void {
  ctx.typeBadge.textContent = 'Explorer';
  ctx.typeBadge.className = badgeCls('bg-fin-500/20 text-fin-400');
  ctx.nameEl.textContent = 'FinUties Explorer';
  ctx.subEl.textContent = 'Search for companies, countries, or data sources';

  const pods: string[] = [];
  pods.push(heroSearchPod());

  const recentPod = recentSearchesPod();
  if (recentPod) pods.push(recentPod);

  for (const cat of COMMERCIAL_EXPLORE_CATEGORIES) {
    const sources = sourcesForCategory(cat.id);
    pods.push(pod(buildCategoryPod(cat, sources), { span: 1 }));
  }

  if (RESEARCH_EXPLORE_CATEGORIES.length > 0) {
    pods.push(pod(
      '<p class="text-[11px] text-slate-500">Research catalogues — not part of the P0 commercial surface or published freshness budgets.</p>',
      { title: 'Research only', span: 4, compact: true },
    ));
    for (const cat of RESEARCH_EXPLORE_CATEGORIES) {
      const sources = sourcesForCategory(cat.id);
      pods.push(pod(buildCategoryPod(cat, sources, undefined, true), { span: 1 }));
    }
  }

  ctx.sectionsGrid.innerHTML = podGrid(pods);

  overlayAvailability(ctx).catch(() => { /* silent -- initial render is sufficient */ });
}

// ─── Category pod builder ───────────────────────────────────────────────────

function buildCategoryPod(
  cat: CategoryDef,
  sources: SourceDef[],
  availMap?: Record<string, SourceAvailability>,
  research = false,
): string {
  let availCount = 0;
  let totalRows = 0;
  let hasAvailData = false;

  if (availMap) {
    hasAvailData = true;
    for (const src of sources) {
      const key = src.id.replace(/-/g, '_');
      const info = availMap[key];
      if (info?.available) {
        availCount++;
        totalRows += info.count;
      }
    }
  }

  let inner = '<a href="/explore?mode=data&category=' + esc(cat.id) + '" class="block hover:opacity-80 transition-opacity">';
  inner += '<div class="flex items-center gap-2 mb-1.5">';
  inner += '<svg class="w-5 h-5" style="color:' + cat.color + '" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">' + cat.icon + '</svg>';
  inner += '<span class="text-sm font-semibold text-slate-200">' + esc(categoryDisplayLabel(cat)) + '</span>';
  if (research) {
    inner += '<span class="text-[9px] rounded-full px-1.5 py-0.5 font-medium bg-amber-500/20 text-amber-400">research</span>';
  }

  if (hasAvailData) {
    if (availCount > 0) {
      inner += '<span class="ml-auto text-[9px] rounded-full px-1.5 py-0.5 font-medium bg-emerald-500/20 text-emerald-400">' + availCount + '/' + sources.length + ' live</span>';
    } else {
      inner += '<span class="ml-auto text-[9px] rounded-full px-1.5 py-0.5 font-medium bg-slate-500/20 text-slate-500">awaiting data</span>';
    }
  }

  inner += '</div>';
  inner += '<p class="text-[10px] text-slate-500">' + sources.length + ' source' + (sources.length !== 1 ? 's' : '');
  if (hasAvailData && totalRows > 0) {
    inner += ' · ' + totalRows.toLocaleString() + ' rows';
  }
  inner += ': ' + sources.map((s) => s.shortLabel).join(', ') + '</p>';
  inner += '</a>';
  return inner;
}

// ─── Async availability overlay ─────────────────────────────────────────────

async function overlayAvailability(ctx: RenderContext): Promise<void> {
  const availMap = await fetchSourceAvailability();
  if (!availMap || Object.keys(availMap).length === 0) return;

  const pods: string[] = [];

  // Data Health summary pod
  let totalSources = 0;
  let availableSources = 0;
  let totalRows = 0;
  for (const [, info] of Object.entries(availMap)) {
    totalSources++;
    if (info.available) { availableSources++; totalRows += info.count; }
  }

  pods.push(kpiStrip([
    { label: 'Total Sources', value: totalSources },
    { label: 'Available', value: availableSources, color: 'text-emerald-400' },
    { label: 'Total Rows', value: totalRows.toLocaleString() },
    { label: 'Coverage', value: Math.round(availableSources / totalSources * 100) + '%' },
  ], { span: 4 }));

  pods.push(heroSearchPod());

  const recentPod = recentSearchesPod();
  if (recentPod) pods.push(recentPod);

  const appendCategoryPods = (cats: CategoryDef[], avail?: Record<string, SourceAvailability>): void => {
    for (const cat of cats) {
      const sources = sourcesForCategory(cat.id);
      if (avail) {
        let catHasData = false;
        for (const src of sources) {
          const key = src.id.replace(/-/g, '_');
          if (avail[key]?.available) { catHasData = true; break; }
        }
        if (!catHasData) continue;
      }
      pods.push(pod(buildCategoryPod(cat, sources, avail, isResearchCategory(cat.id)), { span: 1 }));
    }
  };

  appendCategoryPods(COMMERCIAL_EXPLORE_CATEGORIES, availMap);

  const researchUnavailable = RESEARCH_EXPLORE_CATEGORIES
    .filter((cat) => {
      const sources = sourcesForCategory(cat.id);
      return !sources.some((src) => {
        const key = src.id.replace(/-/g, '_');
        return availMap[key]?.available;
      });
    })
    .map((cat) => categoryDisplayLabel(cat));

  if (RESEARCH_EXPLORE_CATEGORIES.some((cat) => {
    const sources = sourcesForCategory(cat.id);
    return sources.some((src) => availMap[src.id.replace(/-/g, '_')]?.available);
  })) {
    pods.push(pod(
      '<p class="text-[11px] text-slate-500">Research catalogues — not part of the P0 commercial surface or published freshness budgets.</p>',
      { title: 'Research only', span: 4, compact: true },
    ));
    appendCategoryPods(RESEARCH_EXPLORE_CATEGORIES, availMap);
  }

  if (researchUnavailable.length > 0) {
    pods.push(emptyGroup(researchUnavailable, { title: 'Research catalogues awaiting data', span: 4 }));
  }

  const commercialUnavailable = COMMERCIAL_EXPLORE_CATEGORIES
    .filter((cat) => {
      const sources = sourcesForCategory(cat.id);
      return !sources.some((src) => availMap[src.id.replace(/-/g, '_')]?.available);
    })
    .map((cat) => cat.label);

  if (commercialUnavailable.length > 0) {
    pods.push(emptyGroup(commercialUnavailable, { title: 'Awaiting data ingestion', span: 4 }));
  }

  ctx.sectionsGrid.innerHTML = podGrid(pods);
}
