/**
 * Breadcrumbs -- reactive breadcrumb trail backed by nanostore.
 */
import { For, Show } from 'solid-js';
import type { JSX } from 'solid-js';
import { useStore } from '@nanostores/solid';
import { $breadcrumbs } from '../../stores/explorer';

export default function Breadcrumbs(): JSX.Element {
  const trail = useStore($breadcrumbs);

  return (
    <Show when={trail().length > 1}>
      <nav
        class="flex items-center gap-1.5 text-xs text-slate-500 overflow-x-auto whitespace-nowrap"
        aria-label="Exploration trail"
      >
        <For each={trail()}>
          {(crumb, i) => {
            const isLast = () => i() === trail().length - 1;
            return (
              <>
                <Show when={i() > 0}>
                  <svg
                    class="w-3 h-3 text-slate-600 flex-shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    stroke-width="2"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </Show>
                <Show
                  when={!isLast()}
                  fallback={
                    <span class="rounded px-1.5 py-0.5 font-medium text-slate-300">
                      {crumb.label}
                    </span>
                  }
                >
                  <a
                    href={crumb.url}
                    class="rounded px-1.5 py-0.5 hover:bg-fin-800/60 transition-colors text-slate-400 hover:text-slate-200"
                  >
                    {crumb.label}
                  </a>
                </Show>
              </>
            );
          }}
        </For>
      </nav>
    </Show>
  );
}
