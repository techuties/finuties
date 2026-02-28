import type { StrategyImpl } from './registry';

export const rollingZScore: StrategyImpl = (input, options) => {
  const windowSize = Math.max(2, Number(options?.window ?? 26));
  const out: number[] = [];
  for (let i = 0; i < input.series.length; i++) {
    const start = Math.max(0, i - windowSize + 1);
    const window = input.series.slice(start, i + 1).filter((n) => Number.isFinite(n));
    if (window.length < 2) {
      out.push(0);
      continue;
    }
    const mean = window.reduce((a, b) => a + b, 0) / window.length;
    const variance = window.reduce((acc, n) => acc + ((n - mean) ** 2), 0) / (window.length - 1);
    const stdev = Math.sqrt(Math.max(variance, 0));
    const z = stdev > 0 ? (input.series[i] - mean) / stdev : 0;
    out.push(Number.isFinite(z) ? z : 0);
  }
  return { values: out, meta: { window: windowSize } };
};
