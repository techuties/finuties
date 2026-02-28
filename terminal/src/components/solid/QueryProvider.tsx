/**
 * QueryProvider -- wraps SolidJS islands with TanStack Query context.
 *
 * Usage in .astro:
 *   <QueryProvider client:load>
 *     <SomeDataComponent client:load />
 *   </QueryProvider>
 */
import { QueryClientProvider } from '@tanstack/solid-query';
import { getQueryClient } from '../../lib/query-client';
import type { ParentProps, JSX } from 'solid-js';

export default function QueryProvider(props: ParentProps): JSX.Element {
  const client = getQueryClient();
  return (
    <QueryClientProvider client={client}>
      {props.children}
    </QueryClientProvider>
  );
}
