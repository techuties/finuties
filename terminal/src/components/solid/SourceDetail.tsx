/**
 * SourceDetail -- SolidJS island for a single data source view.
 *
 * Shows KPIs, chart, and data table for a specific source,
 * optionally filtered by country.
 */
import {
  createSignal, createMemo, createResource, For, Show, Switch, Match,
  onMount,
} from 'solid-js';
import type { JSX } from 'solid-js';
import Pod from './Pod';
import PodGrid from './PodGrid';
import Kpi from './Kpi';
import KpiStrip from './KpiStrip';
import Chart from './Chart';
import MiniTable from './MiniTable';
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
  description: string;
  endpoint: string;
  columns: ColumnDef[];
  color: string;
  icon: string;
  defaultLimit?: number;
  defaultDays?: number;
  countryField?: string;
}

/* ── Props ──────────────────────────────────────────────────────── */

export interface SourceDetailProps {
  /** Source ID from the registry. */
  sourceId: string;
  /** Optional country filter. */
  country?: string;
  /** URL params to forward as API filters. */
  extraParams?: Record<string, string>;
}

/* ── Component ──────────────────────────────────────────────────── */

export default function SourceDetail(props: SourceDetailProps): JSX.Element {
  const [sourceDef, setSourceDef] = createSignal<SourceDef | null>(null);
  const [relatedSources, setRelatedSources] = createSignal<SourceDef[]>([]);

  const [data, { refetch }] = createResource(
    () => props.sourceId,
    async (srcId) => {
      try {
        const registry = await import('../../lib/source-registry');
        const api = await import('../../lib/global-data-api');

        const src = registry.SOURCE_MAP.get(srcId);
        if (!src) throw new Error(`Unknown source: ${srcId}`);
        setSourceDef(src as SourceDef);

        const related = registry
          .sourcesForCategory(src.category)
          .filter((s: SourceDef) => s.id !== src.id)
          .slice(0, 6);
        setRelatedSources(related as SourceDef[]);

        const params: Record<string, string | number> = {
          limit: src.defaultLimit || 100,
          ...props.extraParams,
        };
        if (props.country) {
          if (src.countryField) params[src.countryField] = props.country;
          else params.country = props.country;
        }

        const res = await api.fetchSource<Record<string, unknown>>(
          src.endpoint,
          params,
          30_000,
        );
        if (!res.ok || !res.data) throw new Error(res.error || 'No data');
        return res.data;
      } catch (err) {
        console.warn('[SourceDetail] fetch failed:', err);
        throw err;
      }
    },
  );

  /* Derived values */
  const src = () => sourceDef();
  const rows = () => data() || [];
  const columns = createMemo(() => (src()?.columns || []).filter((c) => !c.secondary));

  const dateCol = createMemo(() => src()?.columns.find((c) => c.type === 'date'));
  const numCol = createMemo(() =>
    src()?.columns.find((c) => c.type === 'number' && !c.secondary),
  );

  const kpis = createMemo(() => {
    const items: { label: string; value: string; color?: string }[] = [];
    const r = rows();
    const nc = numCol();
    if (nc && r.length > 0) {
      const vals = r.map((row) => Number(row[nc.key])).filter((v) => !isNaN(v));
      if (vals.length > 0) {
        const latest = vals[0];
        const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
        const min = Math.min(...vals);
        const max = Math.max(...vals);
        items.push({ label: 'Latest', value: latest.toLocaleString(undefined, { maximumFractionDigits: 2 }), color: src()?.color });
        items.push({ label: 'Average', value: avg.toLocaleString(undefined, { maximumFractionDigits: 2 }) });
        items.push({ label: 'Min', value: min.toLocaleString(undefined, { maximumFractionDigits: 2 }) });
        items.push({ label: 'Max', value: max.toLocaleString(undefined, { maximumFractionDigits: 2 }) });
      }
    }
    items.push({ label: 'Records', value: r.length.toLocaleString() });
    return items;
  });

  const chartOption = createMemo(() => {
    const dc = dateCol();
    const nc = numCol();
    const r = rows();
    if (!dc || !nc || r.length < 2) return null;
    const sorted = [...r].sort((a, b) =>
      String(a[dc.key]).localeCompare(String(b[dc.key])),
    );
    const color = src()?.color || '#3b82f6';
    return {
      backgroundColor: 'transparent',
      grid: { left: 50, right: 20, top: 20, bottom: 40 },
      tooltip: { trigger: 'axis', textStyle: { fontSize: 11 } },
      xAxis: {
        type: 'category',
        data: sorted.map((row) => String(row[dc.key]).slice(0, 10)),
        axisLabel: { fontSize: 10, color: '#64748b' },
      },
      yAxis: {
        type: 'value',
        axisLabel: { fontSize: 10, color: '#64748b' },
        splitLine: { lineStyle: { color: '#1e293b' } },
      },
      series: [
        {
          type: 'line',
          data: sorted.map((row) => Number(row[nc.key]) || 0),
          smooth: true,
          symbol: 'none',
          lineStyle: { color, width: 2 },
          areaStyle: { color: color + '20' },
        },
      ],
    };
  });

  return (
    <Switch>
      <Match when={data.loading}>
        <PodGrid>
          <Pod span={4}>
            <Skeleton rows={5} chart kpis={4} label={`Loading ${props.sourceId}...`} />
          </Pod>
        </PodGrid>
      </Match>
      <Match when={data.error}>
        <Pod span={4}>
          <ErrorBanner title="Failed to load data" error={data.error} />
        </Pod>
      </Match>
      <Match when={data()}>
        <PodGrid>
          {/* Chart */}
          <Show when={chartOption()}>
            <Pod span={3} title={src()?.label || 'Chart'}>
              <Chart option={chartOption()!} height="280px" />
            </Pod>
          </Show>

          {/* KPI strip */}
          <KpiStrip items={kpis()} span={chartOption() ? 1 : 4} title="Summary" />

          {/* Data table */}
          <Pod span={4} title={`Data (${rows().length} rows)`}>
            <MiniTable
              columns={columns() as { key: string; label: string; type: 'date' | 'number' | 'string' | 'badge' }[]}
              rows={rows()}
              maxRows={100}
              loadMore
            />
          </Pod>

          {/* Related sources */}
          <Show when={relatedSources().length > 0}>
            <Pod span={4} title="See Also" compact>
              <div class="flex gap-2 flex-wrap">
                <For each={relatedSources()}>
                  {(rs) => (
                    <a
                      href={`/explore?mode=data&source=${encodeURIComponent(rs.id)}`}
                      class="text-[10px] rounded-full px-2 py-0.5 bg-fin-800/60 text-slate-400 hover:text-slate-200 transition-colors"
                    >
                      {rs.shortLabel}
                    </a>
                  )}
                </For>
              </div>
            </Pod>
          </Show>
        </PodGrid>
      </Match>
    </Switch>
  );
}
