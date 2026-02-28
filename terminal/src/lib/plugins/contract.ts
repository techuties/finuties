import type { CardDefinition } from '../card-registry';

export interface PluginCachePolicy {
  ttlMs: number;
  scope: 'user' | 'global';
  persistent: boolean;
}

export interface PluginCapabilities {
  network?: boolean;
  python?: boolean;
  filesystem?: boolean;
}

export interface PluginComputeContext {
  now: number;
  userId?: string;
}

export interface PluginRenderContext {
  container: HTMLElement;
}

export interface TerminalPlugin {
  id: string;
  name: string;
  version: string;
  description: string;
  dataSources: string[];
  paramsSchema?: Record<string, unknown>;
  cachePolicy: PluginCachePolicy;
  capabilities: PluginCapabilities;
  toCardDefinition: () => CardDefinition;
  compute?: (input: unknown, ctx: PluginComputeContext) => unknown;
  render?: (model: unknown, ctx: PluginRenderContext) => void;
}

export interface PluginValidationResult {
  valid: boolean;
  errors: string[];
}

export function validatePlugin(plugin: TerminalPlugin): PluginValidationResult {
  const errors: string[] = [];
  if (!plugin.id || !/^[a-z0-9-]+$/.test(plugin.id)) {
    errors.push('plugin.id must be lowercase alphanumeric plus dashes');
  }
  if (!plugin.name) errors.push('plugin.name is required');
  if (!plugin.version) errors.push('plugin.version is required');
  if (!Array.isArray(plugin.dataSources)) errors.push('plugin.dataSources must be an array');
  if (!plugin.toCardDefinition) errors.push('plugin.toCardDefinition must be provided');
  if (!plugin.cachePolicy || typeof plugin.cachePolicy.ttlMs !== 'number') {
    errors.push('plugin.cachePolicy.ttlMs must be a number');
  }
  return { valid: errors.length === 0, errors };
}
