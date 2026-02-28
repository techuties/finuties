/**
 * Country Overview -- pod-grid view for a country's data landscape.
 *
 * Displays a KPI strip, map pod, and data-source category pods
 * for a given ISO-3 country code.
 */
import {
  podGrid, pod, kpiStrip, miniTable, emptyGroup, esc, spinnerHtml, errorHtml, badgeCls,
  type RenderContext,
} from '../layout';
import { apiFetch } from '../../api-client';
import { fetchSource } from '../../global-data-api';
import {
  CATEGORIES, sourcesForCategory, SOURCE_MAP, CATEGORY_MAP,
  type SourceDef, type CategoryId,
} from '../../source-registry';

export async function renderCountryOverview(ctx: RenderContext): Promise<void> {
  const iso3 = ctx.params.get('country') || '';
  if (!iso3) return;

  const displayName = iso3.toUpperCase();
  ctx.typeBadge.textContent = 'Country';
  ctx.typeBadge.className = badgeCls('bg-teal-500/20 text-teal-400');
  ctx.nameEl.textContent = displayName;
  ctx.subEl.textContent = 'Exploring data sources for ' + displayName;
  ctx.updateBreadcrumbs(displayName, 'country');
  ctx.sectionsGrid.innerHTML = spinnerHtml('Loading country data...');

  try {
    // Fetch a sample from each source that supports country filtering
    const countryCapable = Array.from(SOURCE_MAP.values()).filter(
      (s) => s.geoType !== 'none' && !s.placeholder,
    );

    const fetches = countryCapable.slice(0, 8).map(async (src) => {
      try {
        const params: Record<string, string | number> = { limit: 10 };
        if (src.countryField) params[src.countryField] = iso3;
        else params.country = iso3;
        const res = await fetchSource(src.endpoint, params);
        return { src, rows: res.data || [], ok: true };
      } catch {
        return { src, rows: [] as Record<string, unknown>[], ok: false };
      }
    });

    type FetchResult = { src: (typeof countryCapable)[number]; rows: Record<string, unknown>[]; ok: boolean };
    const settled = await Promise.allSettled(fetches);
    const results: FetchResult[] = [];
    for (const s of settled) if (s.status === 'fulfilled') results.push(s.value);
    const withData = results.filter((r) => r.rows.length > 0);
    const pods: string[] = [];

    // KPI strip
    pods.push(
      kpiStrip(
        [
          { label: 'Sources queried', value: countryCapable.length },
          { label: 'With data', value: withData.length },
          { label: 'Total rows', value: withData.reduce((s, r) => s + r.rows.length, 0) },
        ],
        { span: 4 },
      ),
    );

    // Category tabs
    let tabsHtml = '<div class="flex gap-1.5 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-fin-700">';
    for (const cat of CATEGORIES) {
      const hasSources = sourcesForCategory(cat.id).some((s) => withData.find((r) => r.src.id === s.id));
      tabsHtml += '<a href="/explore?mode=data&country=' + esc(iso3) + '&category=' + esc(cat.id) + '" class="flex-shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-medium transition-colors ' +
        (hasSources ? 'text-white' : 'text-slate-500 bg-fin-800/40 hover:bg-fin-800/60 hover:text-slate-300') + '"' +
        (hasSources ? ' style="background:' + cat.color + '"' : '') + '>' + esc(cat.shortLabel) + '</a>';
    }
    tabsHtml += '</div>';
    pods.push(pod(tabsHtml, { span: 4, compact: true }));

    // Data pods for sources with data
    for (const { src, rows } of withData) {
      const cols = src.columns.filter((c) => !c.secondary).slice(0, 4);
      pods.push(
        miniTable(rows, cols.map((c) => ({ key: c.key, label: c.label, type: c.type })), {
          title: src.shortLabel,
          span: rows.length > 5 ? 2 : 1,
          maxRows: 5,
        }),
      );
    }

    // Sources with no data -- collected into a compact group
    const noData = results.filter((r) => r.rows.length === 0 && r.ok);
    if (noData.length > 0) {
      pods.push(emptyGroup(
        noData.map((r) => r.src.shortLabel),
        { title: 'No data for ' + displayName, span: 2 },
      ));
    }

    ctx.sectionsGrid.innerHTML = podGrid(pods);
  } catch (err) {
    ctx.sectionsGrid.innerHTML = errorHtml('Failed to load country data', err);
  }
}
