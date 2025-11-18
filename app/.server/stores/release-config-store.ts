/**
 * In-Memory Release Configuration Store
 * Temporary storage until backend is ready
 * Thread-safe for concurrent requests
 */

import type { ReleaseConfiguration } from '~/types/release-config';

// In-memory store (per-organization)
const configStore = new Map<string, Map<string, ReleaseConfiguration>>();

/**
 * Get all configurations for an organization
 */
export function getAllConfigs(tenantId: string): ReleaseConfiguration[] {
  const orgConfigs = configStore.get(tenantId);
  if (!orgConfigs) return [];
  
  return Array.from(orgConfigs.values()).sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
}

/**
 * Get a specific configuration by ID
 */
export function getConfigById(
  tenantId: string,
  configId: string
): ReleaseConfiguration | null {
  const orgConfigs = configStore.get(tenantId);
  return orgConfigs?.get(configId) || null;
}

/**
 * Get the default configuration for an organization
 */
export function getDefaultConfig(tenantId: string): ReleaseConfiguration | null {
  const configs = getAllConfigs(tenantId);
  return configs.find(c => c.isDefault && c.status === 'ACTIVE') || null;
}

/**
 * Get active configurations for an organization
 */
export function getActiveConfigs(tenantId: string): ReleaseConfiguration[] {
  return getAllConfigs(tenantId).filter(c => c.status === 'ACTIVE');
}

/**
 * Create a new configuration
 */
export function createConfig(
  tenantId: string,
  config: ReleaseConfiguration
): ReleaseConfiguration {
  let orgConfigs = configStore.get(tenantId);
  
  if (!orgConfigs) {
    orgConfigs = new Map();
    configStore.set(tenantId, orgConfigs);
  }
  
  // If this is set as default, unset other defaults
  if (config.isDefault) {
    orgConfigs.forEach((c) => {
      if (c.isDefault) {
        c.isDefault = false;
      }
    });
  }
  
  // Set timestamps
  const now = new Date().toISOString();
  config.createdAt = now;
  config.updatedAt = now;
  
  orgConfigs.set(config.id, config);
  
  console.log(`[ConfigStore] Created config ${config.id} for tenant ${tenantId}`);
  
  return config;
}

/**
 * Update a configuration
 */
export function updateConfig(
  tenantId: string,
  configId: string,
  updates: Partial<ReleaseConfiguration>
): ReleaseConfiguration | null {
  const orgConfigs = configStore.get(tenantId);
  const existing = orgConfigs?.get(configId);
  
  if (!existing) {
    console.warn(`[ConfigStore] Config ${configId} not found for tenant ${tenantId}`);
    return null;
  }
  
  // If setting as default, unset other defaults
  if (updates.isDefault) {
    orgConfigs?.forEach((c) => {
      if (c.id !== configId && c.isDefault) {
        c.isDefault = false;
      }
    });
  }
  
  // Merge updates
  const updated: ReleaseConfiguration = {
    ...existing,
    ...updates,
    id: existing.id, // Never change ID
    createdAt: existing.createdAt, // Never change created date
    updatedAt: new Date().toISOString(),
  };
  
  orgConfigs?.set(configId, updated);
  
  console.log(`[ConfigStore] Updated config ${configId} for tenant ${tenantId}`);
  
  return updated;
}

/**
 * Delete a configuration
 */
export function deleteConfig(tenantId: string, configId: string): boolean {
  const orgConfigs = configStore.get(tenantId);
  const deleted = orgConfigs?.delete(configId) || false;
  
  if (deleted) {
    console.log(`[ConfigStore] Deleted config ${configId} for tenant ${tenantId}`);
  } else {
    console.warn(`[ConfigStore] Config ${configId} not found for tenant ${tenantId}`);
  }
  
  return deleted;
}

/**
 * Archive a configuration (soft delete)
 */
export function archiveConfig(tenantId: string, configId: string): ReleaseConfiguration | null {
  return updateConfig(tenantId, configId, {
    status: 'ARCHIVED',
    updatedAt: new Date().toISOString(),
  });
}

/**
 * Duplicate a configuration
 */
export function duplicateConfig(
  tenantId: string,
  configId: string,
  newName: string
): ReleaseConfiguration | null {
  const original = getConfigById(tenantId, configId);
  
  if (!original) {
    return null;
  }
  
  const duplicate: ReleaseConfiguration = {
    ...original,
    id: `config_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    name: newName,
    isDefault: false, // Duplicate is never default
    status: 'DRAFT',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  
  return createConfig(tenantId, duplicate);
}

/**
 * Get configuration statistics
 */
export function getConfigStats(tenantId: string) {
  const configs = getAllConfigs(tenantId);
  
  return {
    total: configs.length,
    active: configs.filter(c => c.status === 'ACTIVE').length,
    draft: configs.filter(c => c.status === 'DRAFT').length,
    archived: configs.filter(c => c.status === 'ARCHIVED').length,
    hasDefault: configs.some(c => c.isDefault && c.status === 'ACTIVE'),
  };
}

/**
 * Clear all configurations for a tenant (for testing)
 */
export function clearTenantConfigs(tenantId: string): void {
  configStore.delete(tenantId);
  console.log(`[ConfigStore] Cleared all configs for tenant ${tenantId}`);
}

/**
 * Get store statistics (for debugging)
 */
export function getStoreStats() {
  return {
    tenants: configStore.size,
    totalConfigs: Array.from(configStore.values()).reduce(
      (sum, orgConfigs) => sum + orgConfigs.size,
      0
    ),
  };
}

