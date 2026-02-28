/**
 * PodGrid — responsive grid container for Pod components.
 *
 * Uses the .pod-grid CSS class (defined in global.css) for the
 * responsive 1/2/3/4-column layout.
 */
import type { JSX, ParentProps } from 'solid-js';
import { splitProps } from 'solid-js';

export interface PodGridProps {
  /** DOM id for imperative references. */
  id?: string;
  /** Additional CSS classes. */
  class?: string;
}

export default function PodGrid(props: ParentProps<PodGridProps>): JSX.Element {
  const [local] = splitProps(props, ['id', 'class', 'children']);

  return (
    <div id={local.id} class={`pod-grid ${local.class || ''}`}>
      {local.children}
    </div>
  );
}
