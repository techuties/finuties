import { registerCard, type CardDefinition } from '../card-registry';
import { type TerminalPlugin, validatePlugin } from './contract';

const PLUGINS = new Map<string, TerminalPlugin>();

export function registerPlugin(plugin: TerminalPlugin): void {
  const check = validatePlugin(plugin);
  if (!check.valid) {
    throw new Error(`[plugin-registry] invalid plugin ${plugin.id}: ${check.errors.join(', ')}`);
  }
  if (PLUGINS.has(plugin.id)) {
    console.warn(`[plugin-registry] duplicate plugin "${plugin.id}" overwritten`);
  }
  PLUGINS.set(plugin.id, plugin);
  const cardDef: CardDefinition = plugin.toCardDefinition();
  registerCard(cardDef);
}

export function unregisterPlugin(pluginId: string): boolean {
  return PLUGINS.delete(pluginId);
}

export function getPlugin(pluginId: string): TerminalPlugin | undefined {
  return PLUGINS.get(pluginId);
}

export function allPlugins(): TerminalPlugin[] {
  return Array.from(PLUGINS.values());
}
