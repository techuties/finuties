/**
 * Stock Info section -- self-registering.
 * Enhanced: more payload fields, company description, external links, logo.
 */
import {
  registerSection, sectionFetch, normalizeItems, payloadError,
  renderError, renderEmpty, esc, fmtCurrency, fmtCompact, fmtDate,
  type EntityParams, type SectionData,
} from '../explore-sections';

registerSection({
  id: 'stock-info',
  title: 'Stock Information',
  icon: '<path stroke-linecap="round" stroke-linejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75z"/>',
  entityTypes: ['stock', 'company'],
  minSize: { minCols: 1, weight: 'compact' },

  async fetch(p: EntityParams): Promise<SectionData> {
    const qps: string[] = [];
    if (p.symbol) qps.push('symbol=' + encodeURIComponent(p.symbol));
    if (p.cik) qps.push('cik=' + encodeURIComponent(p.cik));
    qps.push('limit=5');
    return sectionFetch('/api/v1/market/stocks?' + qps.join('&'));
  },

  render(container: HTMLElement, data: SectionData): void {
    const err = payloadError(data.payload);
    if (err) { renderError(container, err); return; }
    const items = normalizeItems(data.payload);
    if (items.length === 0) { renderEmpty(container, 'No stock info found.'); return; }

    const stock = items[0] as Record<string, unknown>;
    const symbol = String(stock.symbol ?? stock.ticker ?? '');
    const cik = String(stock.cik ?? '');
    const companyName = String(stock.company_name ?? stock.name ?? stock.shortName ?? '');
    const description = String(stock.description ?? stock.longBusinessSummary ?? '');
    const website = String(stock.website ?? stock.url ?? '');
    const logoUrl = String(stock.logo_url ?? stock.logo ?? '');
    const ipoDate = stock.ipo_date ?? stock.ipoDate ?? null;
    const currency = String(stock.currency ?? 'USD');

    let html = '<div class="space-y-3">';

    html += '<div class="flex items-center gap-3">';
    if (logoUrl && logoUrl !== 'undefined' && logoUrl !== 'null') {
      html += `<img src="${esc(logoUrl)}" alt="${esc(companyName)}" class="w-10 h-10 rounded-lg bg-fin-800 object-contain" onerror="this.style.display='none'" />`;
    }
    html += '<div>';
    if (companyName) html += `<p class="text-sm font-medium text-slate-200">${esc(companyName)}</p>`;
    if (symbol) html += `<p class="text-xs text-slate-500">${esc(symbol)}${stock.exchange ? ' \u00B7 ' + esc(String(stock.exchange)) : ''}</p>`;
    html += '</div></div>';

    if (description && description !== 'undefined' && description !== 'null' && description.length > 10) {
      const truncated = description.length > 300 ? description.slice(0, 300) + '\u2026' : description;
      html += `<p class="text-xs text-slate-400 leading-relaxed">${esc(truncated)}</p>`;
    }

    html += '<div class="grid grid-cols-2 sm:grid-cols-3 gap-3">';
    const fields: [string, string][] = [];
    const mc = Number(stock.market_cap);
    if (!isNaN(mc) && mc > 0) fields.push(['Market Cap', fmtCompact(mc)]);
    if (stock.sector) fields.push(['Sector', String(stock.sector)]);
    if (stock.industry) fields.push(['Industry', String(stock.industry)]);
    if (stock.country) fields.push(['Country', String(stock.country)]);
    if (currency && currency !== 'undefined' && currency !== 'null') fields.push(['Currency', currency]);
    if (stock.exchange) fields.push(['Exchange', String(stock.exchange)]);
    if (ipoDate) fields.push(['IPO Date', fmtDate(String(ipoDate))]);
    if (stock.employees) fields.push(['Employees', fmtCompact(stock.employees as number)]);
    const peVal = Number(stock.pe_ratio ?? stock.peRatio);
    if (!isNaN(peVal) && peVal !== 0) fields.push(['P/E Ratio', peVal.toFixed(2)]);
    const divVal = Number(stock.dividend_yield ?? stock.dividendYield);
    if (!isNaN(divVal) && divVal !== 0) fields.push(['Div Yield', (divVal * 100).toFixed(2) + '%']);
    const w52h = Number(stock.fifty_two_week_high ?? stock.fiftyTwoWeekHigh);
    if (!isNaN(w52h) && w52h !== 0) fields.push(['52W High', fmtCurrency(w52h)]);
    const w52l = Number(stock.fifty_two_week_low ?? stock.fiftyTwoWeekLow);
    if (!isNaN(w52l) && w52l !== 0) fields.push(['52W Low', fmtCurrency(w52l)]);

    for (const [label, value] of fields) {
      const isSector = label === 'Sector' || label === 'Industry';
      const val = isSector && value !== '\u2014'
        ? `<a href="/explore?q=${encodeURIComponent(value)}" class="text-fin-400 hover:underline">${esc(value)}</a>`
        : esc(value);
      html += `<div><p class="text-[10px] uppercase text-slate-500">${esc(label)}</p><p class="text-sm font-medium text-slate-200">${val}</p></div>`;
    }
    html += '</div>';

    const links: string[] = [];
    if (website && website !== 'undefined' && website !== 'null') {
      links.push(`<a href="${esc(website)}" target="_blank" rel="noopener" class="text-fin-400 hover:underline text-xs">Website \u2197</a>`);
    }
    if (cik && cik !== 'undefined' && cik !== 'null') {
      links.push(`<a href="https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${encodeURIComponent(cik)}&type=&dateb=&owner=include&count=40" target="_blank" rel="noopener" class="text-fin-400 hover:underline text-xs">SEC EDGAR \u2197</a>`);
    }
    if (symbol) {
      links.push(`<a href="https://finance.yahoo.com/quote/${encodeURIComponent(symbol)}" target="_blank" rel="noopener" class="text-fin-400 hover:underline text-xs">Yahoo Finance \u2197</a>`);
    }
    if (links.length) {
      html += `<div class="flex flex-wrap gap-3 pt-1 border-t border-fin-800/50">${links.join('')}</div>`;
    }

    html += '</div>';
    container.innerHTML = html;
  },
});
