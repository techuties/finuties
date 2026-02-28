/**
 * ZoomControl -- CSS zoom slider for the pod grid.
 *
 * Replaces the imperative zoomControl() / initZoom() functions
 * with a reactive SolidJS component backed by a nanostore.
 */
import { createEffect } from 'solid-js';
import type { JSX } from 'solid-js';
import { useStore } from '@nanostores/solid';
import { $zoom } from '../../stores/explorer';

export default function ZoomControl(): JSX.Element {
  const zoom = useStore($zoom);

  createEffect(() => {
    const content = document.getElementById('explore-content');
    if (content) {
      (content.style as Record<string, string>).zoom = String(zoom());
    }
  });

  return (
    <div class="flex items-center gap-2">
      <button
        type="button"
        class="text-slate-500 hover:text-slate-300 transition-colors text-xs"
        title="Zoom out"
        onClick={() => $zoom.set(Math.max(0.7, zoom() - 0.05))}
      >
        -
      </button>
      <input
        type="range"
        min="0.7"
        max="1.3"
        step="0.05"
        value={zoom()}
        onInput={(e) => $zoom.set(Number(e.currentTarget.value))}
        class="w-16 accent-fin-500"
        title={`Zoom: ${Math.round(zoom() * 100)}%`}
      />
      <button
        type="button"
        class="text-slate-500 hover:text-slate-300 transition-colors text-xs"
        title="Zoom in"
        onClick={() => $zoom.set(Math.min(1.3, zoom() + 0.05))}
      >
        +
      </button>
      <span class="text-[9px] text-slate-600 tabular-nums w-6 text-center">
        {Math.round(zoom() * 100)}
      </span>
    </div>
  );
}
