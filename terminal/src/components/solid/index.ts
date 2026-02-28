/**
 * Barrel export for all shared SolidJS components.
 *
 * Usage:
 *   import { Pod, PodGrid, Kpi, Chart, Skeleton } from '@/components/solid';
 */

/* Layout primitives */
export { default as Pod } from './Pod';
export type { PodProps } from './Pod';

export { default as PodGrid } from './PodGrid';
export type { PodGridProps } from './PodGrid';

/* Data display */
export { default as Kpi } from './Kpi';
export type { KpiProps } from './Kpi';

export { default as KpiStrip } from './KpiStrip';
export type { KpiItem, KpiStripProps } from './KpiStrip';

export { default as Chart } from './Chart';
export type { ChartProps } from './Chart';

export { default as MiniTable } from './MiniTable';
export type { MiniTableColumn, MiniTableProps } from './MiniTable';

/* Feedback */
export { default as Skeleton } from './Skeleton';
export type { SkeletonProps } from './Skeleton';

export { default as ErrorBanner } from './ErrorBanner';
export type { ErrorBannerProps } from './ErrorBanner';

/* Infrastructure */
export { default as QueryProvider } from './QueryProvider';

/* Navigation / UI */
export { default as SearchBar } from './SearchBar';
export type { SearchBarProps } from './SearchBar';

export { default as ZoomControl } from './ZoomControl';
export { default as Breadcrumbs } from './Breadcrumbs';

/* Views (Astro islands) */
export { default as CountryOverview } from './CountryOverview';
export type { CountryOverviewProps } from './CountryOverview';

export { default as DataCatalog } from './DataCatalog';
export type { DataCatalogProps } from './DataCatalog';

export { default as SourceDetail } from './SourceDetail';
export type { SourceDetailProps } from './SourceDetail';

export { default as VirtualDataTable } from './VirtualDataTable';
export type { VirtualColumnDef, VirtualDataTableProps } from './VirtualDataTable';
