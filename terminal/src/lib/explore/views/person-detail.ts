/**
 * Person Detail -- pod-grid view for a person (insider/officer).
 */
import {
  podGrid, pod, kpiStrip, miniTable, esc, spinnerHtml, errorHtml, badgeCls,
  type RenderContext,
} from '../layout';
import { apiFetch } from '../../api-client';
import { exploreLink } from '../../explore-sections';

interface InsiderTx {
  company_name?: string;
  company_cik?: string;
  issuer_name?: string;
  issuer_cik?: string;
  transaction_date?: string;
  form_type?: string;
  shares?: number;
  price?: number;
  transaction_code?: string;
  ownership_nature?: string;
  acquired_disposed?: string;
  security_title?: string;
  reporting_owner_name?: string;
}

export async function renderPersonDetail(ctx: RenderContext): Promise<void> {
  const cik = ctx.params.get('cik') || '';
  const name = ctx.params.get('name') || 'Person CIK ' + cik;

  ctx.typeBadge.textContent = 'Person';
  ctx.typeBadge.className = badgeCls('bg-rose-500/20 text-rose-400');
  ctx.nameEl.textContent = name;
  ctx.subEl.textContent = 'CIK: ' + cik;
  ctx.updateBreadcrumbs(name, 'person');
  ctx.sectionsGrid.innerHTML = spinnerHtml('Loading person data...');

  try {
    const res = await apiFetch<{ items: InsiderTx[] }>(
      '/api/v1/sec/insider-transactions?reporting_owner_cik=' + encodeURIComponent(cik) + '&limit=50',
    );
    const items = res.ok && res.data?.items ? res.data.items : [];
    const pods: string[] = [];

    // KPIs
    const companies = new Set(items.map((t) => t.company_name).filter(Boolean));
    const totalShares = items.reduce((s, t) => s + (t.shares || 0), 0);
    const kpis = [
      { label: 'Transactions', value: items.length },
      { label: 'Companies', value: companies.size },
      { label: 'Total Shares', value: totalShares.toLocaleString() },
    ];
    pods.push(kpiStrip(kpis, { span: 4 }));

    // Transactions table
    if (items.length > 0) {
      const tableItems = items.map((t) => ({
        ...t,
        company_name: t.company_name || t.issuer_name || '',
        company_cik: t.company_cik || t.issuer_cik || '',
      }));
      pods.push(miniTable(
        tableItems as Record<string, unknown>[],
        [
          { key: 'transaction_date', label: 'Date' },
          { key: 'company_name', label: 'Company' },
          { key: 'transaction_code', label: 'Type' },
          { key: 'acquired_disposed', label: 'A/D' },
          { key: 'shares', label: 'Shares', type: 'number' },
          { key: 'price', label: 'Price', type: 'number' },
        ],
        { title: 'Insider Transactions', span: 4, maxRows: 20 },
      ));
    }

    // Related companies
    const companyLinks: { name: string; cik: string }[] = [];
    const seenCik = new Set<string>();
    for (const tx of items) {
      const cCik = tx.company_cik || tx.issuer_cik;
      const cName = tx.company_name || tx.issuer_name;
      if (cCik && cName && !seenCik.has(cCik)) {
        seenCik.add(cCik);
        companyLinks.push({ name: cName, cik: cCik });
      }
    }
    if (companyLinks.length > 0) {
      let linksHtml = '<div class="flex flex-wrap gap-2">';
      for (const c of companyLinks.slice(0, 6)) {
        linksHtml += '<a href="' + esc(exploreLink({ type: 'company', cik: c.cik, name: c.name })) + '" class="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium bg-blue-500/20 text-blue-400 hover:opacity-80 transition-opacity">' + esc(c.name) + '</a>';
      }
      linksHtml += '</div>';
      pods.push(pod(linksHtml, { title: 'Related Companies', span: 4, compact: true }));
    }

    if (items.length === 0) {
      pods.push(pod('<p class="text-sm text-slate-500 text-center py-4">No insider transactions found for this person.</p>', { span: 4 }));
    }

    ctx.sectionsGrid.innerHTML = podGrid(pods);
  } catch (err) {
    ctx.sectionsGrid.innerHTML = errorHtml('Failed to load person data', err);
  }
}
