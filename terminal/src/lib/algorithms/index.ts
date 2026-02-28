import { registerStrategy } from './registry';
import { rollingZScore } from './rolling-zscore';
import { ewmaTrend } from './ewma-trend';
import { olsBaseline } from './ols-baseline';

let initialized = false;

export function initBuiltInStrategies(): void {
  if (initialized) return;
  registerStrategy('rolling-zscore', rollingZScore);
  registerStrategy('ewma-trend', ewmaTrend);
  registerStrategy('ols-baseline', olsBaseline);
  initialized = true;
}
