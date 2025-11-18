/**
 * Check Release Configuration Utility
 * Helper to check if organization has release configuration
 */

import { loadConfigList } from './release-config-storage';

/**
 * Check if organization has at least one active release configuration
 */
export function hasReleaseConfiguration(organizationId: string): boolean {
  if (typeof window === 'undefined') return true; // SSR - assume configured
  
  const configs = loadConfigList(organizationId);
  return configs.some(c => c.status === 'ACTIVE');
}

/**
 * Get default configuration for organization
 */
export function getDefaultConfiguration(organizationId: string) {
  if (typeof window === 'undefined') return null;
  
  const configs = loadConfigList(organizationId);
  return configs.find(c => c.isDefault && c.status === 'ACTIVE') || null;
}

/**
 * Get all active configurations for organization
 */
export function getActiveConfigurations(organizationId: string) {
  if (typeof window === 'undefined') return [];
  
  const configs = loadConfigList(organizationId);
  return configs.filter(c => c.status === 'ACTIVE');
}

