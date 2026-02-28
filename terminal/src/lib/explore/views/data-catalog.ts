/**
 * Data Catalog -- pod-grid view module
 *
 * Handles two sub-modes:
 *   1. Category source list (mode=data&category=X)
 *   2. All-categories catalog  (mode=data, no source/country)
 */
import {
  podGrid, pod, esc, badgeCls, type RenderContext,
} from '../layout';
import {
  CATEGORIES as REG_CATEGORIES, SOURCES as REG_SOURCES,
  CATEGORY_MAP, sourcesForCategory,
  type CategoryId,
} from '../../source-registry';

/** Render a single category's source list. */
export function renderCategorySourceList(ctx: RenderContext): void {
  const dataCatParam = ctx.params.get('category') as CategoryId | null;
  if (!dataCatParam || !CATEGORY_MAP.has(dataCatParam)) return;

  const cat = CATEGORY_MAP.get(dataCatParam)!;
  const sources = sourcesForCategory(cat.id);

  ctx.typeBadge.textContent = 'Data';
  ctx.typeBadge.className = badgeCls('bg-pink-500/20 text-pink-400');
  ctx.nameEl.textContent = cat.label;
  ctx.subEl.textContent = sources.length + ' data sources';

  // Category tabs
  let tabsHtml = '<div class="flex gap-1.5 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-fin-700 pod-span-4">';
  for (const c of REG_CATEGORIES) {
    const active = c.id === cat.id;
    tabsHtml += '<a href="/explore?mode=data&category=' + esc(c.id) + '" class="flex-shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-medium transition-colors ' +
      (active ? 'text-white' : 'text-slate-400 hover:text-slate-200 bg-fin-800/40 hover:bg-fin-800/60') + '"' +
      (active ? ' style="background:' + c.color + '"' : '') + '>' + esc(c.shortLabel) + '</a>';
  }
  tabsHtml += '</div>';

  // Source cards as pods
  const pods: string[] = [];
  pods.push(pod(tabsHtml, { span: 4, compact: true }));

  for (const s of sources) {
    let inner = '<div class="flex items-start gap-2">';
    inner += '<svg class="w-4 h-4 flex-shrink-0 mt-0.5" style="color:' + s.color + '" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">' + s.icon + '</svg>';
    inner += '<div class="min-w-0">';
    inner += '<a href="/explore?mode=data&source=' + esc(s.id) + '" class="text-xs font-semibold text-slate-200 hover:text-white block">' + esc(s.label) + '</a>';
    inner += '<p class="text-[10px] text-slate-500 mt-0.5 line-clamp-2">' + esc(s.description) + '</p>';
    inner += '<div class="flex items-center gap-2 mt-1.5">';
    if (s.geoType !== 'none') inner += '<span class="text-[9px] rounded-full px-1.5 py-0.5 bg-fin-700/40 text-slate-400">' + (s.geoType === 'point' ? 'Points' : 'Country') + '</span>';
    inner += '<span class="text-[9px] text-slate-600">' + s.columns.length + ' cols</span>';
    inner += '</div></div></div>';
    pods.push(pod(inner, { span: 1, compact: true }));
  }

  ctx.sectionsGrid.innerHTML = podGrid(pods);
}

/** Render the full category catalog (all categories). */
export function renderAllCategories(ctx: RenderContext): void {
  ctx.typeBadge.textContent = 'Data';
  ctx.typeBadge.className = badgeCls('bg-pink-500/20 text-pink-400');
  ctx.nameEl.textContent = 'Global Data Sources';
  ctx.subEl.textContent = REG_SOURCES.length + ' datasets across ' + REG_CATEGORIES.length + ' categories';

  const pods: string[] = [];
  for (const cat of REG_CATEGORIES) {
    const sources = sourcesForCategory(cat.id);
    let inner = '<div class="flex items-center gap-2 mb-1.5">';
    inner += '<svg class="w-5 h-5" style="color:' + cat.color + '" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">' + cat.icon + '</svg>';
    inner += '<span class="text-sm font-semibold text-slate-200">' + esc(cat.label) + '</span>';
    inner += '</div>';
    inner += '<p class="text-[10px] text-slate-500">' + sources.length + ' source' + (sources.length !== 1 ? 's' : '') + ': ' + sources.map(s => s.shortLabel).join(', ') + '</p>';
    pods.push(pod('<a href="/explore?mode=data&category=' + esc(cat.id) + '" class="block hover:opacity-80 transition-opacity">' + inner + '</a>', { span: 1 }));
  }

  ctx.sectionsGrid.innerHTML = podGrid(pods);
}
