import type { StrategyImpl } from './registry';

export const ewmaTrend: StrategyImpl = (input, options) => {
  const alpha = Math.min(1, Math.max(0.01, Number(options?.alpha ?? 0.2)));
  const out: number[] = [];
  let prev = Number(input.series[0] ?? 0);
  for (const point of input.series) {
    const x = Number(point);
    const next = alpha * x + (1 - alpha) * prev;
    out.push(Number.isFinite(next) ? next : 0);
    prev = next;
  }
  return { values: out, meta: { alpha } };
};
