/**
 * News section -- self-registering.
 * Enhanced: news_type badge, improved HTML entity cleaning, grouped by date.
 */
import {
  registerSection, sectionFetch, normalizeItems, payloadError,
  renderError, renderEmpty, esc, fmtDate, stripHtml,
  type EntityParams, type SectionData,
} from '../explore-sections';

const TYPE_BADGES: Record<string, string> = {
  financial_event:   'bg-blue-500/20 text-blue-400',
  material_event:    'bg-amber-500/20 text-amber-400',
  press_release:     'bg-emerald-500/20 text-emerald-400',
  earnings:          'bg-purple-500/20 text-purple-400',
  acquisition:       'bg-rose-500/20 text-rose-400',
  sec_filing:        'bg-cyan-500/20 text-cyan-400',
};

function cleanHtml(raw: string): string {
  if (!raw) return '';
  let text = raw
    .replace(/&#\d+;/g, (m) => {
      const code = parseInt(m.slice(2, -1), 10);
      return String.fromCharCode(code);
    })
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'");
  return stripHtml(text, 150);
}

function humanizeType(t: string): string {
  return t.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

registerSection({
  id: 'news-items',
  title: 'News',
  icon: '<path stroke-linecap="round" stroke-linejoin="round" d="M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5m-7.5 3h7.5m3-9h3.375c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 01-2.25 2.25M16.5 7.5V18a2.25 2.25 0 002.25 2.25M16.5 7.5V4.875c0-.621-.504-1.125-1.125-1.125H4.125C3.504 3.75 3 4.254 3 4.875V18a2.25 2.25 0 002.25 2.25h13.5M6 7.5h3v3H6v-3z"/>',
  entityTypes: ['company', 'stock'],
  minSize: { minCols: 1, weight: 'compact' },

  async fetch(p: EntityParams): Promise<SectionData> {
    const qps: string[] = [];
    if (p.cik) qps.push('cik=' + p.cik);
    if (p.symbol) qps.push('symbol=' + p.symbol);
    qps.push('limit=20');
    return sectionFetch('/api/v1/sec/news-items?' + qps.join('&'));
  },

  render(container: HTMLElement, data: SectionData): void {
    const err = payloadError(data.payload);
    if (err) { renderError(container, err); return; }
    const items = normalizeItems(data.payload) as Record<string, unknown>[];
    if (items.length === 0) { renderEmpty(container, 'No news found.'); return; }

    let html = '<div class="divide-y divide-fin-800/40">';
    for (const row of items.slice(0, 15)) {
      const rawHeadline = String(row.title || row.headline || '');
      const companyName = String(row.company_name || '');
      const title = rawHeadline.startsWith('Item ')
        ? (companyName ? companyName + ' — ' + rawHeadline : rawHeadline)
        : rawHeadline;
      const date = fmtDate((row.filed_at as string) || (row.published_at as string) || (row.date as string));
      const summary = cleanHtml(String(row.summary || row.description || row.content_summary || ''));
      const url = String(row.url || row.link || '');
      const newsType = String(row.news_type || '');

      html += '<div class="py-2.5">';
      html += '<div class="flex items-center gap-2 flex-wrap">';
      if (url) {
        html += '<a href="' + esc(url) + '" target="_blank" rel="noopener" class="text-xs font-medium text-slate-200 hover:text-fin-400 flex-1 min-w-0 truncate">' + esc(title) + '</a>';
      } else {
        html += '<p class="text-xs font-medium text-slate-200 flex-1 min-w-0 truncate">' + esc(title) + '</p>';
      }
      if (newsType) {
        const badgeCls = TYPE_BADGES[newsType] || 'bg-slate-500/20 text-slate-400';
        html += '<span class="flex-shrink-0 rounded-full px-2 py-0.5 text-[9px] font-medium ' + badgeCls + '">' + esc(humanizeType(newsType)) + '</span>';
      }
      html += '</div>';
      html += '<p class="text-[10px] text-slate-500 mt-0.5">' + esc(date);
      if (summary) html += ' \u00B7 ' + esc(summary);
      html += '</p></div>';
    }
    html += '</div>';
    if (items.length > 15) {
      html += '<p class="text-[10px] text-slate-600 text-center mt-2">' + items.length + ' total news items</p>';
    }
    container.innerHTML = html;
  },
});
