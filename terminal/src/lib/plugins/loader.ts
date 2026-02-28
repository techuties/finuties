import { registerPlugin } from './registry';
import { moneyFlowPlugin } from './builtin/money-flow-plugin';

let loaded = false;

export function loadBuiltinPlugins(): void {
  if (loaded) return;
  registerPlugin(moneyFlowPlugin);
  loaded = true;
}
