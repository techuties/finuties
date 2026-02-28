/**
 * Financial Statements section -- self-registering.
 * Parses SEC XBRL data_json (facts structure) into usable financial data.
 * Shows KPI strip, trend chart, and sortable table.
 */
import {
  registerSection, sectionFetch, normalizeItems, payloadError,
  renderError, renderEmpty, esc, fmtCurrency, fmtDate, fmtCompact, loadECharts,
  type EntityParams, type SectionData,
} from '../explore-sections';
import { mountSortableTable, type ColDef } from './sortable-table';

type StmtFilter = 'all' | 'income' | 'balance' | 'cashflow';

const CHIP_LABELS: Record<StmtFilter, string> = {
  all: 'All',
  income: 'Income Statement',
  balance: 'Balance Sheet',
  cashflow: 'Cash Flow',
};

const INCOME_KEYS = new Set([
  'Revenues', 'RevenueFromContractWithCustomerExcludingAssessedTax', 'SalesRevenueNet',
  'CostOfRevenue', 'CostOfGoodsAndServicesSold', 'GrossProfit',
  'OperatingIncomeLoss', 'OperatingExpenses', 'NetIncomeLoss', 'ProfitLoss',
  'EarningsPerShareBasic', 'EarningsPerShareDiluted',
  'ResearchAndDevelopmentExpense', 'SellingGeneralAndAdministrativeExpense',
]);

const BALANCE_KEYS = new Set([
  'Assets', 'AssetsCurrent', 'Liabilities', 'LiabilitiesCurrent',
  'StockholdersEquity', 'CashAndCashEquivalentsAtCarryingValue',
  'Goodwill', 'PropertyPlantAndEquipmentNet',
  'LongTermDebt', 'ShortTermBorrowings', 'RetainedEarningsAccumulatedDeficit',
]);

const CASHFLOW_KEYS = new Set([
  'NetCashProvidedByUsedInOperatingActivities',
  'NetCashProvidedByUsedInInvestingActivities',
  'NetCashProvidedByUsedInFinancingActivities',
  'PaymentsToAcquirePropertyPlantAndEquipment',
  'DepreciationDepletionAndAmortization',
]);

const KPI_TARGETS = [
  { keys: ['Revenues', 'RevenueFromContractWithCustomerExcludingAssessedTax', 'SalesRevenueNet'], label: 'Revenue' },
  { keys: ['NetIncomeLoss', 'ProfitLoss'], label: 'Net Income' },
  { keys: ['Assets'], label: 'Total Assets' },
  { keys: ['Liabilities'], label: 'Total Liabilities' },
  { keys: ['NetCashProvidedByUsedInOperatingActivities'], label: 'Cash from Ops' },
];

const CHART_TARGETS = [
  { keys: ['Revenues', 'RevenueFromContractWithCustomerExcludingAssessedTax', 'SalesRevenueNet'], label: 'Revenue', color: '#3b82f6' },
  { keys: ['NetIncomeLoss', 'ProfitLoss'], label: 'Net Income', color: '#22c55e' },
  { keys: ['Assets'], label: 'Total Assets', color: '#f59e0b' },
];

interface FlatRow {
  concept: string;
  label: string;
  period: string;
  value: number;
  fy: number;
  fp: string;
  form: string;
  category: 'income' | 'balance' | 'cashflow' | 'other';
}

function classifyConcept(key: string): 'income' | 'balance' | 'cashflow' | 'other' {
  if (INCOME_KEYS.has(key)) return 'income';
  if (BALANCE_KEYS.has(key)) return 'balance';
  if (CASHFLOW_KEYS.has(key)) return 'cashflow';
  return 'other';
}

function humanize(key: string): string {
  return key.replace(/([A-Z])/g, ' $1').replace(/^ /, '').replace(/\s+/g, ' ');
}

function parseXbrlToRows(items: Record<string, unknown>[]): FlatRow[] {
  const rows: FlatRow[] = [];
  for (const item of items) {
    let dj = item.data_json;
    if (typeof dj === 'string') {
      try { dj = JSON.parse(dj); } catch { continue; }
    }
    if (!dj || typeof dj !== 'object') continue;
    const facts = (dj as Record<string, unknown>).facts;
    if (!facts || typeof facts !== 'object') continue;

    for (const [_taxonomy, concepts] of Object.entries(facts as Record<string, unknown>)) {
      if (!concepts || typeof concepts !== 'object') continue;
      for (const [conceptKey, conceptData] of Object.entries(concepts as Record<string, unknown>)) {
        if (!conceptData || typeof conceptData !== 'object') continue;
        const cd = conceptData as Record<string, unknown>;
        const units = cd.units;
        if (!units || typeof units !== 'object') continue;

        const category = classifyConcept(conceptKey);
        const label = (cd.label as string) || humanize(conceptKey);

        for (const [_unit, entries] of Object.entries(units as Record<string, unknown>)) {
          if (!Array.isArray(entries)) continue;
          for (const entry of entries) {
            if (!entry || typeof entry !== 'object') continue;
            const e = entry as Record<string, unknown>;
            if (e.start) continue; // duration-based entries (quarterly breakdowns) — skip for annual
            const val = Number(e.val);
            if (isNaN(val)) continue;
            const fy = Number(e.fy) || 0;
            const fp = String(e.fp || '');
            if (fp !== 'FY' && !fp.startsWith('Q')) continue; // skip non-standard periods

            rows.push({
              concept: conceptKey,
              label,
              period: String(e.end || '').slice(0, 10),
              value: val,
              fy,
              fp,
              form: String(e.form || ''),
              category,
            });
          }
        }
      }
    }
  }
  return rows;
}

function latestAnnual(rows: FlatRow[]): FlatRow[] {
  return rows.filter(r => r.fp === 'FY');
}

const COLUMNS: ColDef[] = [
  { key: 'period',  label: 'Period',    align: 'left',  sortType: 'date',   format: (v) => fmtDate(v as string) },
  { key: 'label',   label: 'Item',      align: 'left',  sortType: 'string', format: (v) => String(v ?? '') },
  { key: 'value',   label: 'Value',     align: 'right', sortType: 'number', format: (v) => fmtCurrency(v as number) },
  { key: 'fp',      label: 'Period Type', align: 'left', sortType: 'string', format: (v) => String(v ?? '') },
  { key: 'form',    label: 'Form',      align: 'left',  sortType: 'string', format: (v) => String(v ?? '') },
];

registerSection({
  id: 'financial-statements',
  title: 'Financial Statements',
  icon: '<path stroke-linecap="round" stroke-linejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"/>',
  entityTypes: ['company'],
  minSize: { minCols: 2, weight: 'wide' },

  async fetch(p: EntityParams): Promise<SectionData> {
    const qps: string[] = [];
    if (p.cik) qps.push('cik=' + encodeURIComponent(p.cik));
    qps.push('limit=5');
    return sectionFetch('/api/v1/sec/financial-statements?' + qps.join('&'));
  },

  render(container: HTMLElement, data: SectionData): void {
    const err = payloadError(data.payload);
    if (err) { renderError(container, err); return; }
    const rawItems = normalizeItems(data.payload) as Record<string, unknown>[];
    if (rawItems.length === 0) { renderEmpty(container, 'No financial statements found.'); return; }

    const allRows = parseXbrlToRows(rawItems);
    if (allRows.length === 0) { renderEmpty(container, 'Financial data could not be parsed.'); return; }

    const annualRows = latestAnnual(allRows);
    const displayRows = annualRows.length > 10 ? annualRows : allRows;

    let activeFilter: StmtFilter = 'all';
    const root = document.createElement('div');
    root.className = 'space-y-3';

    // KPI strip
    const kpiRow = document.createElement('div');
    kpiRow.className = 'flex flex-wrap gap-3 mb-1';
    for (const target of KPI_TARGETS) {
      const matching = annualRows
        .filter(r => target.keys.includes(r.concept))
        .sort((a, b) => b.period.localeCompare(a.period));
      const latest = matching[0];
      if (!latest) continue;
      const el = document.createElement('div');
      el.className = 'bg-fin-800/60 border border-fin-700/40 rounded-lg px-3 py-2 min-w-[120px]';
      el.innerHTML = `<p class="text-[10px] text-slate-500 uppercase">${esc(target.label)}</p>` +
        `<p class="text-sm font-medium text-slate-200">${fmtCompact(latest.value)}</p>` +
        `<p class="text-[9px] text-slate-600">${esc(latest.period)}</p>`;
      kpiRow.appendChild(el);
    }
    root.appendChild(kpiRow);

    // Filter chips
    const chipBar = document.createElement('div');
    chipBar.className = 'flex gap-1.5 flex-wrap';
    for (const [type, label] of Object.entries(CHIP_LABELS) as [StmtFilter, string][]) {
      const chip = document.createElement('button');
      chip.className = 'px-2.5 py-1 text-[11px] rounded-full border transition-colors';
      chip.textContent = label;
      chip.dataset.filter = type;
      chipBar.appendChild(chip);
    }
    root.appendChild(chipBar);

    // Chart
    const chartWrap = document.createElement('div');
    chartWrap.style.cssText = 'width:100%;height:200px;';
    root.appendChild(chartWrap);

    // Table
    const tableWrap = document.createElement('div');
    root.appendChild(tableWrap);

    function updateChips(): void {
      chipBar.querySelectorAll('button').forEach(btn => {
        const f = (btn as HTMLButtonElement).dataset.filter;
        const isActive = f === activeFilter;
        (btn as HTMLElement).className = `px-2.5 py-1 text-[11px] rounded-full border transition-colors ${isActive ? 'border-fin-400 bg-fin-400/10 text-fin-400' : 'border-fin-700 text-slate-400 hover:border-fin-500'}`;
      });
    }

    function getFiltered(): FlatRow[] {
      const base = displayRows;
      if (activeFilter === 'all') return base;
      return base.filter(r => r.category === activeFilter);
    }

    function renderTable(): void {
      const items = getFiltered();
      if (items.length === 0) {
        tableWrap.innerHTML = '<p class="text-sm text-slate-500 text-center py-4">No items for this filter.</p>';
        return;
      }
      const uniqueRows = deduplicateLatest(items);
      mountSortableTable(tableWrap, {
        columns: COLUMNS,
        items: uniqueRows as unknown as Record<string, unknown>[],
        defaultSortKey: 'period',
        defaultSortDir: -1,
      });
    }

    function deduplicateLatest(rows: FlatRow[]): FlatRow[] {
      const byKey = new Map<string, FlatRow>();
      for (const r of rows) {
        const key = r.concept + '|' + r.period;
        const existing = byKey.get(key);
        if (!existing || r.fy > existing.fy) byKey.set(key, r);
      }
      return [...byKey.values()].sort((a, b) => b.period.localeCompare(a.period) || a.label.localeCompare(b.label));
    }

    function renderChart(): void {
      const seriesData: { name: string; color: string; data: Map<string, number> }[] = [];
      for (const target of CHART_TARGETS) {
        const matching = annualRows.filter(r => target.keys.includes(r.concept));
        if (matching.length < 2) continue;
        const periodMap = new Map<string, number>();
        for (const r of matching) {
          const existing = periodMap.get(r.period);
          if (!existing || Math.abs(r.value) > Math.abs(existing)) periodMap.set(r.period, r.value);
        }
        seriesData.push({ name: target.label, color: target.color, data: periodMap });
      }

      if (seriesData.length === 0) { chartWrap.style.display = 'none'; return; }

      const allPeriods = new Set<string>();
      seriesData.forEach(s => s.data.forEach((_, p) => allPeriods.add(p)));
      const periods = [...allPeriods].sort();
      if (periods.length < 2) { chartWrap.style.display = 'none'; return; }

      loadECharts().then(echarts => {
        const chart = echarts.init(chartWrap);
        chart.setOption({
          backgroundColor: 'transparent',
          tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
          legend: { top: 0, textStyle: { color: '#94a3b8', fontSize: 10 } },
          grid: { left: 60, right: 10, top: 30, bottom: 25 },
          xAxis: { type: 'category', data: periods, axisLabel: { color: '#64748b', fontSize: 9 } },
          yAxis: { type: 'value', axisLabel: { color: '#64748b', fontSize: 9, formatter: (v: number) => fmtCompact(v) }, splitLine: { lineStyle: { color: '#1e293b' } } },
          series: seriesData.map(s => ({
            name: s.name, type: 'line', smooth: true,
            data: periods.map(p => s.data.get(p) ?? null),
            lineStyle: { width: 2, color: s.color },
            itemStyle: { color: s.color },
            areaStyle: { opacity: 0.08 },
            connectNulls: true,
          })),
        });
        const onResize = () => { if (chartWrap.isConnected) chart.resize(); else window.removeEventListener('resize', onResize); };
        window.addEventListener('resize', onResize);
      }).catch(() => { chartWrap.style.display = 'none'; });
    }

    chipBar.addEventListener('click', (ev) => {
      const btn = (ev.target as HTMLElement).closest('button[data-filter]') as HTMLButtonElement | null;
      if (!btn) return;
      activeFilter = btn.dataset.filter as StmtFilter;
      updateChips();
      renderTable();
    });

    updateChips();
    renderChart();
    renderTable();
    container.innerHTML = '';
    container.appendChild(root);
  },
});
