/**
 * DataCatalog -- SolidJS island for the data source catalog.
 *
 * Replaces data-catalog.ts. Renders either:
 *   - A single category's source list
 *   - The full all-categories grid
 */
import { createSignal, createMemo, For, Show, onMount } from 'solid-js';
import type { JSX } from 'solid-js';
import Pod from './Pod';
import PodGrid from './PodGrid';

/* ── Types ──────────────────────────────────────────────────────── */

interface ColumnDef {
  key: string;
  label: string;
  type: string;
  secondary?: boolean;
}

interface SourceDef {
  id: string;
  category: string;
  label: string;
  shortLabel: string;
  description: string;
  endpoint: string;
  geoType: string;
  columns: ColumnDef[];
  color: string;
  icon: string;
}

interface CategoryDef {
  id: string;
  label: string;
  shortLabel: string;
  color: string;
  icon: string;
}

/* ── Props ──────────────────────────────────────────────────────── */

export interface DataCatalogProps {
  /** If set, show sources for this category. Otherwise show all categories. */
  categoryId?: string;
}

/* ── Component ──────────────────────────────────────────────────── */

export default function DataCatalog(props: DataCatalogProps): JSX.Element {
  const [allCategories, setAllCategories] = createSignal<CategoryDef[]>([]);
  const [allSources, setAllSources] = createSignal<SourceDef[]>([]);
  const [loaded, setLoaded] = createSignal(false);

  onMount(async () => {
    try {
      const registry = await import('../../lib/source-registry');
      setAllCategories(registry.CATEGORIES);
      setAllSources(registry.SOURCES);
    } catch (err) {
      console.warn('[DataCatalog] registry import failed:', err);
    }
    setLoaded(true);
  });

  const activeCategory = createMemo(() => {
    if (!props.categoryId) return null;
    return allCategories().find((c) => c.id === props.categoryId) || null;
  });

  const sourcesForCategory = (catId: string) =>
    allSources().filter((s) => s.category === catId);

  /* ── Single category view ──────────────────────────────────────── */
  function CategorySourceList(): JSX.Element {
    const cat = activeCategory()!;
    const sources = createMemo(() => sourcesForCategory(cat.id));

    return (
      <PodGrid>
        {/* Category tabs */}
        <Pod span={4} compact>
          <div class="flex gap-1.5 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-fin-700">
            <For each={allCategories()}>
              {(c) => {
                const active = c.id === cat.id;
                return (
                  <a
                    href={`/explore?mode=data&category=${encodeURIComponent(c.id)}`}
                    class={`flex-shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-medium transition-colors ${
                      active
                        ? 'text-white'
                        : 'text-slate-400 hover:text-slate-200 bg-fin-800/40 hover:bg-fin-800/60'
                    }`}
                    style={active ? { background: c.color } : undefined}
                  >
                    {c.shortLabel}
                  </a>
                );
              }}
            </For>
          </div>
        </Pod>

        {/* Source cards */}
        <For each={sources()}>
          {(s) => (
            <Pod span={1} compact>
              <div class="flex items-start gap-2">
                <span
                  class="w-4 h-4 flex-shrink-0 mt-0.5 rounded-full"
                  style={{ background: s.color + '30' }}
                />
                <div class="min-w-0">
                  <a
                    href={`/explore?mode=data&source=${encodeURIComponent(s.id)}`}
                    class="text-xs font-semibold text-slate-200 hover:text-white block"
                  >
                    {s.label}
                  </a>
                  <p class="text-[10px] text-slate-500 mt-0.5 line-clamp-2">
                    {s.description}
                  </p>
                  <div class="flex items-center gap-2 mt-1.5">
                    <Show when={s.geoType !== 'none'}>
                      <span class="text-[9px] rounded-full px-1.5 py-0.5 bg-fin-700/40 text-slate-400">
                        {s.geoType === 'point' ? 'Points' : 'Country'}
                      </span>
                    </Show>
                    <span class="text-[9px] text-slate-600">{s.columns.length} cols</span>
                  </div>
                </div>
              </div>
            </Pod>
          )}
        </For>
      </PodGrid>
    );
  }

  /* ── All categories view ───────────────────────────────────────── */
  function AllCategories(): JSX.Element {
    return (
      <PodGrid>
        <For each={allCategories()}>
          {(cat) => {
            const catSources = () => sourcesForCategory(cat.id);
            return (
              <Pod span={1}>
                <a
                  href={`/explore?mode=data&category=${encodeURIComponent(cat.id)}`}
                  class="block hover:opacity-80 transition-opacity"
                >
                  <div class="flex items-center gap-2 mb-1.5">
                    <span class="w-5 h-5" style={{ color: cat.color }}>
                      <svg
                        class="w-5 h-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        stroke-width="1.5"
                        innerHTML={cat.icon}
                      />
                    </span>
                    <span class="text-sm font-semibold text-slate-200">{cat.label}</span>
                  </div>
                  <p class="text-[10px] text-slate-500">
                    {catSources().length} source{catSources().length !== 1 ? 's' : ''}:{' '}
                    {catSources()
                      .map((s) => s.shortLabel)
                      .join(', ')}
                  </p>
                </a>
              </Pod>
            );
          }}
        </For>
      </PodGrid>
    );
  }

  /* ── Render ────────────────────────────────────────────────────── */
  return (
    <Show
      when={loaded()}
      fallback={
        <div class="space-y-3 animate-pulse py-4">
          <div class="h-48 rounded-lg bg-fin-800/30" />
        </div>
      }
    >
      <Show when={activeCategory()} fallback={<AllCategories />}>
        <CategorySourceList />
      </Show>
    </Show>
  );
}
