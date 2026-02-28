/**
 * ErrorBanner -- displays an error message with consistent styling.
 */
import type { JSX } from 'solid-js';
import { splitProps } from 'solid-js';

export interface ErrorBannerProps {
  /** Short heading (e.g. "Failed to load"). */
  title: string;
  /** Error object or message string. */
  error?: unknown;
}

function formatError(err: unknown): string {
  if (!err) return '';
  if (err instanceof Error) return err.message;
  return String(err);
}

export default function ErrorBanner(props: ErrorBannerProps): JSX.Element {
  const [local] = splitProps(props, ['title', 'error']);

  return (
    <p class="text-amber-400 text-sm py-8 text-center">
      {local.title}
      {local.error ? `: ${formatError(local.error)}` : ''}
    </p>
  );
}
