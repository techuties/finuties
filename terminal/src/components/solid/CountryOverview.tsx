/**
 * CountryOverview -- SolidJS island for the country data dashboard.
 *
 * Replaces the imperative country-overview.ts with a reactive component
 * that uses TanStack Query for data caching and SolidJS for rendering.
 */
import {
  createSignal, createResource, createMemo, For, Show, Switch, Match,
  onMount, onCleanup,
} from 'solid-js';
import type { JSX } from 'solid-js';
import Pod from './Pod';
import PodGrid from './PodGrid';
import Kpi from './Kpi';
import KpiStrip from './KpiStrip';
import Chart from './Chart';
import Skeleton from './Skeleton';
import ErrorBanner from './ErrorBanner';

/* ── Types ──────────────────────────────────────────────────────── */

interface ColumnDef {
  key: string;
  label: string;
  type: 'date' | 'number' | 'string' | 'badge';
  secondary?: boolean;
  unit?: string;
}

interface SourceDef {
  id: string;
  category: string;
  label: string;
  shortLabel: string;
  endpoint: string;
  geoType: 'none' | 'point' | 'centroid' | 'country';
  countryField?: string;
  latField?: string;
  lonField?: string;
  columns: ColumnDef[];
  color: string;
  icon: string;
  defaultDays?: number;
  placeholder?: boolean;
}

interface CategoryDef {
  id: string;
  label: string;
  shortLabel: string;
  color: string;
  icon: string;
}

interface SrcResult {
  src: SourceDef;
  rows: Record<string, unknown>[];
}

/* ── Props ──────────────────────────────────────────────────────── */

export interface CountryOverviewProps {
  /** ISO-3 country code (e.g. "DEU", "USA"). */
  iso3: string;
  /** Display name of the country. */
  displayName: string;
}

/* ── Helpers ─────────────────────────────────────────────────────── */

function countryParams(
  src: SourceDef,
  iso3: string,
  displayName: string,
): Record<string, string | number> {
  const fp: Record<string, string | number> = { limit: 50 };
  if (src.id === 'gdelt') fp.actor1_country = iso3;
  else if (src.id === 'epa') fp.state = displayName;
  else if (src.countryField) fp[src.countryField] = iso3;
  else fp.country = iso3;
  if (src.defaultDays === 0) {
    fp.start_year = new Date().getFullYear() - 1;
    fp.end_year = new Date().getFullYear();
  }
  return fp;
}

function exploreUrl(src: SourceDef, iso3: string): string {
  let url = '/explore?mode=data&source=' + encodeURIComponent(src.id);
  if (src.id === 'gdelt') url += '&actor1_country=' + encodeURIComponent(iso3);
  else if (src.countryField)
    url +=
      '&' +
      encodeURIComponent(src.countryField) +
      '=' +
      encodeURIComponent(iso3);
  else url += '&country=' + encodeURIComponent(iso3);
  return url;
}

function formatCell(col: ColumnDef, val: unknown): string {
  if (val == null || val === '') return '\u2014';
  if (col.type === 'number') {
    const n = Number(val);
    return isNaN(n) ? String(val) : n.toLocaleString(undefined, { maximumFractionDigits: 4 });
  }
  if (col.type === 'date') return String(val).slice(0, 10);
  return String(val);
}

/* ── Sub-components ──────────────────────────────────────────────── */

function PreviewTable(props: { src: SourceDef; rows: Record<string, unknown>[] }): JSX.Element {
  const cols = () => props.src.columns.filter((c) => !c.secondary).slice(0, 5);
  const preview = () => props.rows.slice(0, 5);

  return (
    <div class="overflow-x-auto -mx-1">
      <table class="w-full text-[11px]">
        <thead>
          <tr>
            <For each={cols()}>
              {(col) => (
                <th class="px-2 py-1 text-left text-[9px] uppercase tracking-wider text-slate-600 font-medium whitespace-nowrap">
                  {col.label}
                </th>
              )}
            </For>
          </tr>
        </thead>
        <tbody>
          <For each={preview()}>
            {(row) => (
              <tr class="border-t border-fin-800/30">
                <For each={cols()}>
                  {(col) => {
                    const val = row[col.key];
                    return (
                      <td
                        class={`px-2 py-1 whitespace-nowrap ${
                          col.type === 'number'
                            ? 'text-slate-300 tabular-nums'
                            : 'text-slate-400 truncate max-w-[120px]'
                        }`}
                      >
                        <Show
                          when={col.type === 'badge' && val}
                          fallback={formatCell(col, val)}
                        >
                          <span class="inline-block rounded-full px-1.5 py-0.5 text-[9px] font-medium bg-fin-700/40 text-slate-300">
                            {String(val)}
                          </span>
                        </Show>
                      </td>
                    );
                  }}
                </For>
              </tr>
            )}
          </For>
        </tbody>
      </table>
    </div>
  );
}

function SourceCard(props: {
  src: SourceDef;
  rows: Record<string, unknown>[];
  iso3: string;
}): JSX.Element {
  const numCol = () => props.src.columns.find((c) => c.type === 'number' && !c.secondary);
  const dateCol = () => props.src.columns.find((c) => c.type === 'date');

  const avg = createMemo(() => {
    const nc = numCol();
    if (!nc) return null;
    const vals = props.rows.map((r) => Number(r[nc.key])).filter((v) => !isNaN(v) && v !== 0);
    if (vals.length === 0) return null;
    return vals.reduce((a, b) => a + b, 0) / vals.length;
  });

  const dateRange = createMemo(() => {
    const dc = dateCol();
    if (!dc || props.rows.length < 2) return null;
    const dates = props.rows
      .map((r) => String(r[dc.key] || ''))
      .filter(Boolean)
      .sort();
    if (dates.length < 2) return null;
    return { from: dates[0].slice(0, 10), to: dates[dates.length - 1].slice(0, 10) };
  });

  const sparkOption = createMemo(() => {
    const dc = dateCol();
    const nc = numCol();
    if (!dc || !nc || props.rows.length < 3) return null;
    const sorted = [...props.rows].sort((a, b) =>
      String(a[dc.key]).localeCompare(String(b[dc.key])),
    );
    const catColor = props.src.color;
    return {
      grid: { left: 4, right: 4, top: 4, bottom: 4 },
      tooltip: { trigger: 'axis', textStyle: { fontSize: 10 } },
      xAxis: {
        type: 'category',
        data: sorted.map((r) => String(r[dc.key]).slice(0, 10)),
        show: false,
      },
      yAxis: { type: 'value', show: false },
      series: [
        {
          type: 'line',
          data: sorted.map((r) => Number(r[nc.key]) || 0),
          smooth: true,
          symbol: 'none',
          lineStyle: { color: catColor, width: 1.5 },
          areaStyle: { color: catColor + '15' },
        },
      ],
    };
  });

  return (
    <div class="px-4 py-3">
      <div class="flex items-center gap-2 mb-2">
        <span
          class="w-4 h-4 flex-shrink-0 rounded-full"
          style={{ background: props.src.color + '30' }}
        />
        <span class="text-xs font-semibold text-slate-300">{props.src.label}</span>
        <span class="text-[10px] text-slate-600">{props.rows.length} rows</span>
        <a
          href={exploreUrl(props.src, props.iso3)}
          class="ml-auto text-[10px] text-fin-400 hover:text-fin-300 transition-colors whitespace-nowrap"
        >
          Explore full data &rarr;
        </a>
      </div>
      <div class="flex gap-3 mb-2 flex-wrap">
        <Show when={avg() != null}>
          <span class="text-[10px] text-slate-400">
            Avg {numCol()!.label}:{' '}
            <span class="text-slate-200 font-medium">
              {avg()!.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              {numCol()!.unit ? ` ${numCol()!.unit}` : ''}
            </span>
          </span>
        </Show>
        <Show when={dateRange()}>
          <span class="text-[10px] text-slate-500">
            {dateRange()!.from} &rarr; {dateRange()!.to}
          </span>
        </Show>
      </div>
      <PreviewTable src={props.src} rows={props.rows} />
      <Show when={sparkOption()}>
        <Chart option={sparkOption()!} height="60px" class="mt-2" />
      </Show>
    </div>
  );
}

function CategoryCard(props: {
  category: CategoryDef;
  results: SrcResult[];
  iso3: string;
  displayName: string;
}): JSX.Element {
  const hasData = () => props.results.some((r) => r.rows.length > 0);
  const totalRows = () => props.results.reduce((s, r) => s + r.rows.length, 0);

  return (
    <Pod span={2}>
      <div class="px-4 py-3 border-b border-fin-800 flex items-center gap-3 -mx-4 -mt-3">
        <span class="w-5 h-5 flex-shrink-0" style={{ color: props.category.color }}>
          <svg
            class="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="1.5"
            innerHTML={props.category.icon}
          />
        </span>
        <span class="text-sm font-semibold text-slate-200">{props.category.label}</span>
        <span
          class="ml-auto text-[10px] rounded-full px-2 py-0.5 font-medium"
          style={{
            background: props.category.color + '20',
            color: props.category.color,
          }}
        >
          {totalRows()} rows
        </span>
      </div>
      <Show
        when={hasData()}
        fallback={
          <div class="px-4 py-6 text-center text-sm text-slate-600">
            No data available for {props.displayName}
          </div>
        }
      >
        <div class="divide-y divide-fin-800/50 -mx-4">
          <For each={props.results.filter((r) => r.rows.length > 0)}>
            {(sr) => <SourceCard src={sr.src} rows={sr.rows} iso3={props.iso3} />}
          </For>
        </div>
      </Show>
    </Pod>
  );
}

/* ── Main component ──────────────────────────────────────────────── */

export default function CountryOverview(props: CountryOverviewProps): JSX.Element {
  const [sources, setSources] = createSignal<SourceDef[]>([]);
  const [categories, setCategories] = createSignal<CategoryDef[]>([]);

  const [data, { refetch }] = createResource(
    () => ({ iso3: props.iso3, displayName: props.displayName }),
    async ({ iso3, displayName }) => {
      try {
        const registry = await import('../../lib/source-registry');
        const api = await import('../../lib/global-data-api');

        setSources(registry.SOURCES);
        setCategories(registry.CATEGORIES);

        const geoSources = registry.SOURCES.filter(
          (s: SourceDef) => s.geoType !== 'none' && !s.placeholder,
        );

        const results = await Promise.allSettled(
          geoSources.map((src: SourceDef) =>
            api
              .fetchSource<Record<string, unknown>>(
                src.endpoint,
                countryParams(src, iso3, displayName),
                20_000,
              )
              .then((r: { data: Record<string, unknown>[] | null }) => ({
                src,
                rows: r.data || [],
              }))
              .catch(() => ({ src, rows: [] as Record<string, unknown>[] })),
          ),
        );

        return results
          .filter(
            (r): r is PromiseFulfilledResult<SrcResult> => r.status === 'fulfilled',
          )
          .map((r) => r.value);
      } catch (err) {
        console.warn('[CountryOverview] data fetch failed:', err);
        throw err;
      }
    },
  );

  /* Derived KPIs */
  const totalRows = createMemo(() =>
    (data() || []).reduce((s, r) => s + r.rows.length, 0),
  );
  const withData = createMemo(() => (data() || []).filter((r) => r.rows.length > 0));
  const catsWithData = createMemo(
    () => new Set(withData().map((r) => r.src.category)),
  );

  const population = createMemo(() => {
    const sr = (data() || []).find((r) => r.src.id === 'un_population' && r.rows.length > 0);
    if (!sr) return null;
    const row = sr.rows[0] as Record<string, unknown>;
    const pop = Number(row.value || row.population);
    return pop > 0 ? pop : null;
  });

  const hdi = createMemo(() => {
    const sr = (data() || []).find((r) => r.src.id === 'undp_hdi' && r.rows.length > 0);
    if (!sr) return null;
    const row = sr.rows[0] as Record<string, unknown>;
    const val = Number(row.value || row.hdi);
    return val > 0 ? val : null;
  });

  /* Group results by category */
  const groupedByCategory = createMemo(() => {
    const results = data() || [];
    const map = new Map<string, SrcResult[]>();
    for (const sr of results) {
      const list = map.get(sr.src.category) || [];
      list.push(sr);
      map.set(sr.src.category, list);
    }
    return map;
  });

  return (
    <div>
      {/* Header card */}
      <Pod span={4} class="mb-4">
        <div class="flex items-center gap-4">
          <div class="w-12 h-12 rounded-full bg-sky-500/10 flex items-center justify-center text-sky-400">
            <svg
              class="w-6 h-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              stroke-width="1.5"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3"
              />
            </svg>
          </div>
          <div class="min-w-0 flex-1">
            <h2 class="text-lg font-bold text-slate-100">{props.displayName}</h2>
            <p class="text-xs text-slate-500">
              {props.iso3} -- Aggregated data from all available sources
            </p>
          </div>
          <a
            href="/global"
            class="text-xs text-fin-400 hover:text-fin-300 transition-colors whitespace-nowrap flex items-center gap-1"
          >
            <svg
              class="w-3.5 h-3.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              stroke-width="2"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            Back to Map
          </a>
        </div>
      </Pod>

      {/* Loading / Error / Content */}
      <Switch>
        <Match when={data.loading}>
          <PodGrid>
            <Pod span={4}>
              <Skeleton rows={4} chart kpis={4} label="Loading country data..." />
            </Pod>
          </PodGrid>
        </Match>
        <Match when={data.error}>
          <Pod span={4}>
            <ErrorBanner title="Failed to load country data" error={data.error} />
          </Pod>
        </Match>
        <Match when={data()}>
          {/* KPI strip */}
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            <Kpi label="Data Points" value={totalRows().toLocaleString()} color="#38bdf8" />
            <Kpi
              label="Active Sources"
              value={`${withData().length} / ${sources().filter((s) => s.geoType !== 'none' && !s.placeholder).length}`}
            />
            <Kpi label="Categories" value={String(catsWithData().size)} />
            <Show when={population()}>
              <Kpi
                label="Population"
                value={
                  population()! >= 1e6
                    ? `${(population()! / 1e6).toFixed(1)}M`
                    : population()!.toLocaleString()
                }
                color="#a855f7"
              />
            </Show>
            <Show when={!population() && hdi()}>
              <Kpi label="HDI" value={hdi()!.toFixed(3)} color="#14b8a6" />
            </Show>
          </div>

          {/* Category cards */}
          <PodGrid>
            <For each={categories().filter((cat) => groupedByCategory().has(cat.id))}>
              {(cat) => (
                <CategoryCard
                  category={cat}
                  results={groupedByCategory().get(cat.id)!}
                  iso3={props.iso3}
                  displayName={props.displayName}
                />
              )}
            </For>
          </PodGrid>

          <Show when={totalRows() === 0}>
            <div class="text-center text-sm text-slate-500 py-8">
              No data available for {props.displayName} from any source.
            </div>
          </Show>
        </Match>
      </Switch>
    </div>
  );
}
