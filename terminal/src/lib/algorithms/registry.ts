export interface StrategyInput {
  series: number[];
}

export interface StrategyOutput {
  values: number[];
  meta?: Record<string, unknown>;
}

export type StrategyImpl = (input: StrategyInput, options?: Record<string, unknown>) => StrategyOutput;

const STRATEGIES = new Map<string, StrategyImpl>();

export function registerStrategy(name: string, impl: StrategyImpl): void {
  if (!name) throw new Error('strategy name is required');
  STRATEGIES.set(name, impl);
}

export function runStrategy(name: string, input: StrategyInput, options?: Record<string, unknown>): StrategyOutput {
  const impl = STRATEGIES.get(name);
  if (!impl) throw new Error(`strategy "${name}" is not registered`);
  return impl(input, options);
}

export function listStrategies(): string[] {
  return Array.from(STRATEGIES.keys());
}
