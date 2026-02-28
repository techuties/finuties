import type { StrategyImpl } from './registry';

export const olsBaseline: StrategyImpl = (input) => {
  const n = input.series.length;
  if (n === 0) return { values: [], meta: { slope: 0, intercept: 0 } };
  const xMean = (n - 1) / 2;
  const yMean = input.series.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    const dx = i - xMean;
    num += dx * (input.series[i] - yMean);
    den += dx * dx;
  }
  const slope = den === 0 ? 0 : num / den;
  const intercept = yMean - slope * xMean;
  const fitted = input.series.map((_, i) => intercept + slope * i);
  return { values: fitted, meta: { slope, intercept } };
};
