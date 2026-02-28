/**
 * SearchBar -- reactive typeahead search for the Explorer header.
 *
 * Replaces the imperative header-search event wiring in index.astro
 * with a self-contained SolidJS component.
 */
import { createSignal, For, Show, onCleanup, onMount } from 'solid-js';
import type { JSX } from 'solid-js';

interface SearchMatch {
  type: string;
  label: string;
  description: string;
  href: string;
  color: string;
  score: number;
}

export interface SearchBarProps {
  /** Placeholder text. */
  placeholder?: string;
  /** Additional CSS class for the input. */
  class?: string;
}

export default function SearchBar(props: SearchBarProps): JSX.Element {
  const [query, setQuery] = createSignal('');
  const [matches, setMatches] = createSignal<SearchMatch[]>([]);
  const [open, setOpen] = createSignal(false);
  const [selectedIdx, setSelectedIdx] = createSignal(-1);
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  let inputRef!: HTMLInputElement;

  onCleanup(() => {
    if (debounceTimer) clearTimeout(debounceTimer);
  });

  async function doSearch(val: string) {
    if (val.length < 2) {
      setMatches([]);
      setOpen(false);
      return;
    }
    try {
      const resolver = await import('../../lib/explore/smart-resolver');
      const results = resolver.resolveSearchLocal(val);
      setMatches(
        results.slice(0, 6).map((m) => ({
          type: m.type,
          label: m.label,
          description: m.description,
          href: m.href,
          color: m.color,
          score: m.score,
        })),
      );
      setOpen(results.length > 0);
      setSelectedIdx(-1);
    } catch {
      setMatches([]);
      setOpen(false);
    }
  }

  function handleInput(e: InputEvent) {
    const val = (e.target as HTMLInputElement).value;
    setQuery(val);
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => doSearch(val.trim()), 180);
  }

  function handleKeyDown(e: KeyboardEvent) {
    const items = matches();
    if (e.key === 'ArrowDown' && items.length > 0) {
      e.preventDefault();
      setSelectedIdx(Math.min(selectedIdx() + 1, items.length - 1));
    } else if (e.key === 'ArrowUp' && items.length > 0) {
      e.preventDefault();
      setSelectedIdx(Math.max(selectedIdx() - 1, 0));
    } else if (e.key === 'Enter') {
      if (selectedIdx() >= 0 && items[selectedIdx()]) {
        e.preventDefault();
        window.location.href = items[selectedIdx()].href;
      } else if (query().trim()) {
        window.location.href = '/explore?q=' + encodeURIComponent(query().trim());
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
      setSelectedIdx(-1);
    }
  }

  return (
    <div class="relative">
      <input
        ref={inputRef}
        type="text"
        value={query()}
        placeholder={props.placeholder || 'Search...'}
        aria-label="Quick search"
        class={`w-40 lg:w-56 rounded-lg bg-fin-800/60 border border-fin-700/50 px-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:border-fin-500 focus:outline-none focus:ring-1 focus:ring-fin-500/50 ${props.class || ''}`}
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        onBlur={() => setTimeout(() => setOpen(false), 200)}
        onFocus={() => {
          if (query().trim().length >= 2) doSearch(query().trim());
        }}
      />
      <Show when={open() && matches().length > 0}>
        <div
          class="absolute right-0 top-full mt-1 w-72 rounded-xl border border-fin-800 bg-fin-900/95 backdrop-blur shadow-xl z-50 overflow-hidden"
          role="listbox"
        >
          <For each={matches()}>
            {(m, i) => (
              <a
                href={m.href}
                role="option"
                class={`flex items-center gap-2 px-3 py-2 hover:bg-fin-800/60 transition-colors cursor-pointer ${
                  i() > 0 ? 'border-t border-fin-800/40' : ''
                }`}
                style={{
                  background: i() === selectedIdx() ? 'rgba(30,41,59,0.8)' : undefined,
                }}
              >
                <div class="flex-1 min-w-0">
                  <p class="text-xs font-medium text-slate-200 truncate">{m.label}</p>
                  <p class="text-[9px] text-slate-500 truncate">{m.description}</p>
                </div>
                <span
                  class={`flex-shrink-0 text-[9px] rounded-full px-1.5 py-0.5 font-medium ${m.color}`}
                >
                  {m.type}
                </span>
              </a>
            )}
          </For>
        </div>
      </Show>
    </div>
  );
}
