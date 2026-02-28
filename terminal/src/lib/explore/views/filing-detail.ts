/**
 * Filing Detail -- pod-grid view for a single SEC filing.
 */
import {
  podGrid, pod, kpiStrip, miniTable, esc, spinnerHtml, errorHtml, badgeCls,
  type RenderContext,
} from '../layout';
import { apiFetch } from '../../api-client';

interface FilingDoc {
  description: string;
  url: string;
  type: string;
  size?: number;
}

interface FilingData {
  accession_number: string;
  form_type: string;
  filed_at?: string;
  company_name?: string;
  cik?: string;
  period_of_report?: string;
  accepted_at?: string;
  documents?: FilingDoc[];
}

export async function renderFilingDetail(ctx: RenderContext): Promise<void> {
  const accession = ctx.params.get('accession') || '';
  const name = ctx.params.get('name') || '';

  ctx.typeBadge.textContent = 'Filing';
  ctx.typeBadge.className = badgeCls('bg-amber-500/20 text-amber-400');
  ctx.nameEl.textContent = name || accession;
  ctx.subEl.textContent = 'SEC Filing ' + accession;
  ctx.updateBreadcrumbs(name || accession, 'filing');
  ctx.sectionsGrid.innerHTML = spinnerHtml('Loading filing...');

  try {
    const res = await apiFetch<{ items: FilingData[] }>(
      '/api/v1/sec/filings?accession_number=' + encodeURIComponent(accession) + '&limit=1',
    );
    if (!res.ok || !res.data?.items?.length) {
      ctx.sectionsGrid.innerHTML = errorHtml('Filing not found: ' + accession);
      return;
    }

    const filing = res.data.items[0];
    const pods: string[] = [];

    // KPI strip
    const kpis: { label: string; value: string }[] = [
      { label: 'Form', value: filing.form_type },
      { label: 'Filed', value: (filing.filed_at || '').slice(0, 10) || '\u2014' },
      { label: 'Period', value: (filing.period_of_report || '').slice(0, 10) || '\u2014' },
      { label: 'CIK', value: filing.cik || '\u2014' },
    ];
    pods.push(kpiStrip(kpis, { span: 4 }));

    // Filing metadata pod
    let metaHtml = '<div class="space-y-2 text-xs">';
    metaHtml += '<div class="flex justify-between"><span class="text-slate-500">Company</span><span class="text-slate-200">' + esc(filing.company_name || '\u2014') + '</span></div>';
    metaHtml += '<div class="flex justify-between"><span class="text-slate-500">Accession</span><span class="text-slate-200 font-mono">' + esc(filing.accession_number) + '</span></div>';
    metaHtml += '<div class="flex justify-between"><span class="text-slate-500">Accepted</span><span class="text-slate-200">' + esc((filing.accepted_at || '').slice(0, 19) || '\u2014') + '</span></div>';
    metaHtml += '</div>';
    pods.push(pod(metaHtml, { title: 'Filing Details', span: 2 }));

    // Documents pod
    if (filing.documents && filing.documents.length > 0) {
      let docsHtml = '<div class="divide-y divide-fin-800/40">';
      for (const doc of filing.documents.slice(0, 10)) {
        docsHtml += '<div class="flex items-center gap-2 py-1.5">';
        docsHtml += '<span class="text-[9px] rounded px-1.5 py-0.5 bg-fin-800/60 text-slate-400 font-mono">' + esc(doc.type) + '</span>';
        docsHtml += '<a href="' + esc(doc.url) + '" target="_blank" rel="noopener" class="text-xs text-fin-400 hover:text-fin-300 truncate">' + esc(doc.description || doc.url) + '</a>';
        docsHtml += '</div>';
      }
      docsHtml += '</div>';
      pods.push(pod(docsHtml, { title: 'Documents (' + filing.documents.length + ')', span: 2 }));
    }

    // Link back to company
    if (filing.cik) {
      let linkHtml = '<a href="/explore?type=company&cik=' + esc(filing.cik) + '&name=' + encodeURIComponent(filing.company_name || '') + '" class="inline-flex items-center gap-2 rounded-lg bg-fin-800/40 px-3 py-2 text-xs text-slate-300 hover:bg-fin-800/60 transition-colors">';
      linkHtml += '<svg class="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21"/></svg>';
      linkHtml += 'View ' + esc(filing.company_name || 'Company CIK ' + filing.cik) + '</a>';
      pods.push(pod(linkHtml, { span: 4, compact: true }));
    }

    ctx.sectionsGrid.innerHTML = podGrid(pods);
  } catch (err) {
    ctx.sectionsGrid.innerHTML = errorHtml('Failed to load filing', err);
  }
}
