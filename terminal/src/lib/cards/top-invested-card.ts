/**
 * Top Invested Companies card — most invested-in companies across all
 * institutional investors, with expandable investor rows and a network graph
 * showing company relationships via shared investors.
 */
import { registerCard, type CardData, type ViewType } from '../card-registry';
import { apiFetch } from '../api-client';

/* ── helpers ─────────────────────────────────────────────────────────────── */

const _E: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' };
function e(s: string): string {
  return String(s ?? '').replace(/[&<>"]/g, (c) => _E[c]);
}

function fmtCompact(n: number | null | undefined): string {
  if (n == null) return '—';
  const abs = Math.abs(n);
  if (abs >= 1e12) return (n / 1e12).toFixed(1) + 'T';
  if (abs >= 1e9) return (n / 1e9).toFixed(1) + 'B';
  if (abs >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  if (abs >= 1e3) return (n / 1e3).toFixed(1) + 'K';
  return n.toLocaleString();
}

function fmtCurrency(n: number | null | undefined): string {
  if (n == null) return '—';
  return '$' + fmtCompact(n);
}

/* ── types ───────────────────────────────────────────────────────────────── */

interface Investor {
  cik: string;
  name: string | null;
  type: string | null;
  value: number | null;
  shares: number | null;
}

interface Company {
  stock_symbol: string;
  company_name: string | null;
  sector: string | null;
  industry: string | null;
  total_value: number | null;
  total_shares: number | null;
  investor_count: number;
  latest_filing: string | null;
  top_investors: Investor[];
}

/* ── sector colour map ───────────────────────────────────────────────────── */

const SECTOR_COLORS: Record<string, string> = {
  Technology: '#3b82f6',
  Healthcare: '#10b981',
  'Financial Services': '#f59e0b',
  Financials: '#f59e0b',
  'Consumer Cyclical': '#ef4444',
  'Consumer Defensive': '#8b5cf6',
  Energy: '#f97316',
  Industrials: '#06b6d4',
  'Communication Services': '#ec4899',
  'Real Estate': '#84cc16',
  Utilities: '#14b8a6',
  'Basic Materials': '#a3e635',
};
function sectorColor(s: string | null): string {
  if (!s) return '#64748b';
  return SECTOR_COLORS[s] ?? '#64748b';
}

/* ── sorting state ───────────────────────────────────────────────────────── */

type SortKey = 'stock_symbol' | 'company_name' | 'sector' | 'total_value' | 'total_shares' | 'investor_count' | 'latest_filing';

function compare(a: Company, b: Company, key: SortKey, asc: boolean): number {
  let va: string | number | null = null;
  let vb: string | number | null = null;
  switch (key) {
    case 'stock_symbol': va = a.stock_symbol; vb = b.stock_symbol; break;
    case 'company_name': va = a.company_name; vb = b.company_name; break;
    case 'sector': va = a.sector; vb = b.sector; break;
    case 'total_value': va = a.total_value; vb = b.total_value; break;
    case 'total_shares': va = a.total_shares; vb = b.total_shares; break;
    case 'investor_count': va = a.investor_count; vb = b.investor_count; break;
    case 'latest_filing': va = a.latest_filing; vb = b.latest_filing; break;
  }
  if (va == null && vb == null) return 0;
  if (va == null) return 1;
  if (vb == null) return -1;
  const cmp = typeof va === 'number' && typeof vb === 'number'
    ? va - vb
    : String(va).localeCompare(String(vb));
  return asc ? cmp : -cmp;
}

/* ── table view ──────────────────────────────────────────────────────────── */

function renderTableView(container: HTMLElement, companies: Company[]): void {
  let sortKey: SortKey = 'total_value';
  let sortAsc = false;
  const expanded = new Set<string>();

  function render() {
    const sorted = [...companies].sort((a, b) => compare(a, b, sortKey, sortAsc));

    const arrow = (key: SortKey) =>
      sortKey === key ? (sortAsc ? ' ▲' : ' ▼') : '';

    const thClass = 'px-2 py-1.5 font-medium cursor-pointer select-none hover:text-slate-200 transition-colors';

    let html = `<div class="overflow-x-auto">
      <table class="w-full text-xs">
        <thead class="border-b border-fin-700/50">
          <tr class="text-left text-slate-500 uppercase tracking-wider text-[10px]">
            <th class="${thClass}" data-sort="stock_symbol">Symbol${arrow('stock_symbol')}</th>
            <th class="${thClass}" data-sort="company_name">Company${arrow('company_name')}</th>
            <th class="${thClass}" data-sort="sector">Sector${arrow('sector')}</th>
            <th class="${thClass} text-right" data-sort="total_value">Value${arrow('total_value')}</th>
            <th class="${thClass} text-right" data-sort="total_shares">Shares${arrow('total_shares')}</th>
            <th class="${thClass} text-right" data-sort="investor_count">Investors${arrow('investor_count')}</th>
            <th class="${thClass}" data-sort="latest_filing">Filed${arrow('latest_filing')}</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-fin-800/50">`;

    for (const c of sorted) {
      const isOpen = expanded.has(c.stock_symbol);
      const chevron = isOpen ? '▾' : '▸';
      const hasInvestors = c.top_investors && c.top_investors.length > 0;

      html += `
          <tr class="hover:bg-fin-800/30 transition-colors cursor-pointer" data-symbol="${e(c.stock_symbol)}">
            <td class="px-2 py-1.5">
              <span class="text-slate-500 mr-1 text-[10px]">${hasInvestors ? chevron : '·'}</span>
              <a href="/explore?mode=data&source=sec_filings&symbol=${encodeURIComponent(c.stock_symbol)}" class="text-fin-400 hover:underline font-medium">${e(c.stock_symbol)}</a>
            </td>
            <td class="px-2 py-1.5 text-slate-200 truncate max-w-[160px]">${e(c.company_name ?? '—')}</td>
            <td class="px-2 py-1.5">
              <span class="inline-block w-2 h-2 rounded-full mr-1" style="background:${sectorColor(c.sector)}"></span>
              <span class="text-slate-300">${e(c.sector ?? '—')}</span>
            </td>
            <td class="px-2 py-1.5 text-right tabular-nums text-slate-200">${fmtCurrency(c.total_value)}</td>
            <td class="px-2 py-1.5 text-right tabular-nums text-slate-300">${fmtCompact(c.total_shares)}</td>
            <td class="px-2 py-1.5 text-right tabular-nums text-slate-300">${c.investor_count.toLocaleString()}</td>
            <td class="px-2 py-1.5 text-slate-400">${e((c.latest_filing ?? '').slice(0, 10))}</td>
          </tr>`;

      if (isOpen && hasInvestors) {
        html += `
          <tr class="bg-fin-900/50">
            <td colspan="7" class="px-2 py-2 border-l-2 border-fin-600/50">
              <div class="text-[10px] uppercase text-slate-500 mb-1 font-medium tracking-wider">Top Investors</div>
              <table class="w-full text-xs">
                <thead>
                  <tr class="text-left text-slate-600 text-[10px]">
                    <th class="px-2 py-0.5 font-medium">Investor</th>
                    <th class="px-2 py-0.5 font-medium">Type</th>
                    <th class="px-2 py-0.5 font-medium text-right">Value</th>
                    <th class="px-2 py-0.5 font-medium text-right">Shares</th>
                  </tr>
                </thead>
                <tbody>`;

        for (const inv of c.top_investors) {
          html += `
                  <tr class="hover:bg-fin-800/20">
                    <td class="px-2 py-0.5">
                      <a href="/explore?type=investor&cik=${encodeURIComponent(inv.cik)}" class="text-fin-400 hover:underline">${e(inv.name ?? inv.cik)}</a>
                    </td>
                    <td class="px-2 py-0.5 text-slate-500">${e(inv.type ?? '—')}</td>
                    <td class="px-2 py-0.5 text-right tabular-nums text-slate-300">${fmtCurrency(inv.value)}</td>
                    <td class="px-2 py-0.5 text-right tabular-nums text-slate-400">${fmtCompact(inv.shares)}</td>
                  </tr>`;
        }

        html += `
                </tbody>
              </table>
            </td>
          </tr>`;
      }
    }

    html += `
        </tbody>
      </table>
    </div>`;

    container.innerHTML = html;

    // sort header clicks
    container.querySelectorAll<HTMLElement>('th[data-sort]').forEach((th) => {
      th.addEventListener('click', () => {
        const key = th.dataset.sort as SortKey;
        if (sortKey === key) {
          sortAsc = !sortAsc;
        } else {
          sortKey = key;
          sortAsc = key === 'stock_symbol' || key === 'company_name' || key === 'sector' || key === 'latest_filing';
        }
        render();
      });
    });

    // row expand/collapse clicks
    container.querySelectorAll<HTMLElement>('tr[data-symbol]').forEach((tr) => {
      tr.addEventListener('click', (ev) => {
        if ((ev.target as HTMLElement).closest('a')) return;
        const sym = tr.dataset.symbol!;
        if (expanded.has(sym)) expanded.delete(sym);
        else expanded.add(sym);
        render();
      });
    });
  }

  render();
}

/* ── chart view ──────────────────────────────────────────────────────────── */

function renderChartView(container: HTMLElement, companies: Company[]): (() => void) | void {
  const chartId = 'top-invested-chart-' + Date.now();
  container.innerHTML = `
    <div class="p-4 rounded-lg bg-fin-800 border border-fin-700/50 text-slate-200">
      <div id="${chartId}" class="w-full h-[340px] min-h-[260px]"></div>
    </div>
  `;

  let cleanup: (() => void) | null = null;

  requestAnimationFrame(() => {
    import('echarts').then((echarts) => {
      const el = document.getElementById(chartId);
      if (!el) return;

      const chart = echarts.init(el);
      const top15 = companies.slice(0, 15).reverse();

      chart.setOption({
        backgroundColor: 'transparent',
        textStyle: { color: '#94a3b8', fontSize: 11 },
        tooltip: {
          trigger: 'axis',
          axisPointer: { type: 'shadow' },
          formatter: (params: unknown) => {
            const p = (Array.isArray(params) ? params[0] : params) as {
              name: string; value: number; dataIndex: number;
            };
            const c = top15[p.dataIndex];
            return `<strong>${e(c.stock_symbol)}</strong> — ${e(c.company_name ?? '')}<br/>
              Value: ${fmtCurrency(p.value)}<br/>
              Shares: ${fmtCompact(c.total_shares)}<br/>
              Investors: ${c.investor_count.toLocaleString()}`;
          },
        },
        grid: { left: 100, right: 30, top: 10, bottom: 30 },
        xAxis: {
          type: 'value',
          axisLine: { lineStyle: { color: '#475569' } },
          splitLine: { lineStyle: { color: '#334155' } },
          axisLabel: {
            formatter: (v: number) => fmtCurrency(v),
            color: '#94a3b8',
          },
        },
        yAxis: {
          type: 'category',
          data: top15.map((c) => c.stock_symbol),
          axisLine: { lineStyle: { color: '#475569' } },
          axisLabel: { color: '#cbd5e1', fontSize: 11 },
        },
        series: [{
          type: 'bar',
          data: top15.map((c) => ({
            value: c.total_value ?? 0,
            itemStyle: { color: sectorColor(c.sector) },
          })),
          barMaxWidth: 18,
          label: {
            show: true,
            position: 'right',
            formatter: (p: { value: number }) => fmtCurrency(p.value),
            color: '#94a3b8',
            fontSize: 10,
          },
        }],
      });

      const onResize = () => chart.resize();
      window.addEventListener('resize', onResize);
      cleanup = () => {
        window.removeEventListener('resize', onResize);
        chart.dispose();
      };
    });
  });

  return () => cleanup?.();
}

/* ── network view ────────────────────────────────────────────────────────── */

interface NetworkEdge {
  source: string;
  target: string;
  shared: number;
  names: string[];
}

function computeEdges(companies: Company[], minShared: number): NetworkEdge[] {
  const investorMap = new Map<string, Set<string>>();
  const investorNames = new Map<string, string>();

  for (const c of companies) {
    const ciks = new Set<string>();
    for (const inv of c.top_investors) {
      ciks.add(inv.cik);
      if (inv.name) investorNames.set(inv.cik, inv.name);
    }
    investorMap.set(c.stock_symbol, ciks);
  }

  const edges: NetworkEdge[] = [];
  const symbols = companies.map((c) => c.stock_symbol);

  for (let i = 0; i < symbols.length; i++) {
    for (let j = i + 1; j < symbols.length; j++) {
      const setA = investorMap.get(symbols[i])!;
      const setB = investorMap.get(symbols[j])!;
      const shared: string[] = [];
      for (const cik of setA) {
        if (setB.has(cik)) shared.push(cik);
      }
      if (shared.length >= minShared) {
        edges.push({
          source: symbols[i],
          target: symbols[j],
          shared: shared.length,
          names: shared.map((cik) => investorNames.get(cik) ?? cik),
        });
      }
    }
  }

  return edges.sort((a, b) => b.shared - a.shared);
}

function renderNetworkView(container: HTMLElement, companies: Company[]): (() => void) | void {
  const chartId = 'top-invested-network-' + Date.now();
  container.innerHTML = `
    <div class="p-4 rounded-lg bg-fin-800 border border-fin-700/50 text-slate-200">
      <div class="flex items-center justify-between mb-2">
        <span class="text-xs text-slate-400">Companies linked by shared institutional investors</span>
        <span class="text-[10px] text-slate-500">edge = 2+ shared top investors</span>
      </div>
      <div id="${chartId}" class="w-full h-[400px] min-h-[320px]"></div>
    </div>
  `;

  let cleanup: (() => void) | null = null;

  requestAnimationFrame(() => {
    import('echarts').then((echarts) => {
      const el = document.getElementById(chartId);
      if (!el) return;

      const chart = echarts.init(el);
      const edges = computeEdges(companies, 2);

      const connectedSymbols = new Set<string>();
      for (const ed of edges) {
        connectedSymbols.add(ed.source);
        connectedSymbols.add(ed.target);
      }

      const maxVal = Math.max(...companies.map((c) => c.total_value ?? 0), 1);
      const nodes = companies
        .filter((c) => connectedSymbols.has(c.stock_symbol))
        .map((c) => ({
          name: c.stock_symbol,
          symbolSize: 15 + 35 * Math.log10((c.total_value ?? 1) / maxVal * 100 + 1) / 2,
          itemStyle: { color: sectorColor(c.sector) },
          label: { show: true, color: '#e2e8f0', fontSize: 10 },
          tooltip: {
            formatter: () =>
              `<strong>${e(c.stock_symbol)}</strong><br/>` +
              `${e(c.company_name ?? '')}<br/>` +
              `Sector: ${e(c.sector ?? '—')}<br/>` +
              `Value: ${fmtCurrency(c.total_value)}<br/>` +
              `Investors: ${c.investor_count.toLocaleString()}`,
          },
        }));

      const maxShared = Math.max(...edges.map((ed) => ed.shared), 1);
      const links = edges.map((ed) => ({
        source: ed.source,
        target: ed.target,
        lineStyle: {
          width: 1 + 4 * (ed.shared / maxShared),
          color: 'rgba(148,163,184,0.3)',
          curveness: 0.1,
        },
        tooltip: {
          formatter: () =>
            `<strong>${e(ed.source)} — ${e(ed.target)}</strong><br/>` +
            `${ed.shared} shared investors:<br/>` +
            ed.names.slice(0, 5).map((n) => `· ${e(n)}`).join('<br/>') +
            (ed.names.length > 5 ? `<br/>… and ${ed.names.length - 5} more` : ''),
        },
      }));

      if (nodes.length === 0) {
        el.innerHTML = '<p class="text-sm text-slate-500 text-center py-12">No shared investor connections found among top companies.</p>';
        return;
      }

      chart.setOption({
        backgroundColor: 'transparent',
        tooltip: { trigger: 'item', confine: true },
        series: [{
          type: 'graph',
          layout: 'force',
          roam: true,
          draggable: true,
          force: {
            repulsion: 220,
            gravity: 0.12,
            edgeLength: [80, 200],
            friction: 0.6,
          },
          nodes,
          links,
          emphasis: {
            focus: 'adjacency',
            lineStyle: { width: 3, color: 'rgba(148,163,184,0.7)' },
          },
          label: { position: 'right' },
        }],
      });

      chart.on('click', (params: { dataType?: string; name?: string }) => {
        if (params.dataType === 'node' && params.name) {
          window.location.href = `/explore?mode=data&source=sec_filings&symbol=${encodeURIComponent(params.name)}`;
        }
      });

      const onResize = () => chart.resize();
      window.addEventListener('resize', onResize);
      cleanup = () => {
        window.removeEventListener('resize', onResize);
        chart.dispose();
      };
    });
  });

  return () => cleanup?.();
}

/* ── card registration ───────────────────────────────────────────────────── */

registerCard({
  type: 'top-invested',
  title: 'Most Invested Companies',
  description: 'Top companies by aggregate institutional investment value',
  icon: '<path stroke-linecap="round" stroke-linejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />',
  defaultSize: 'lg',
  views: ['table', 'chart', 'detail'],
  cacheTtl: 300_000,
  exploreUrl: '/explore?mode=data&source=sec_holdings',

  async fetch(): Promise<CardData> {
    const res = await apiFetch<Company[]>('/api/v1/holdings/top-companies?limit=30', { timeout: 45_000 });
    return {
      payload: res.data,
      tokenCost: res.tokenCost,
      creditsRemaining: res.creditsRemaining,
    };
  },

  render(container: HTMLElement, data: CardData, activeView?: ViewType): (() => void) | void {
    const view = activeView ?? 'table';
    const raw = data.payload;

    const companies: Company[] = Array.isArray(raw) ? raw : [];

    if (companies.length === 0) {
      container.innerHTML = '<p class="text-sm text-slate-400 p-4">No data available.</p>';
      return;
    }

    container.className = 'p-3 bg-fin-900 rounded-xl border border-fin-800';

    if (view === 'table') {
      renderTableView(container, companies);
      return;
    }

    if (view === 'chart') {
      return renderChartView(container, companies);
    }

    if (view === 'detail') {
      return renderNetworkView(container, companies);
    }

    renderTableView(container, companies);
  },
});
