/**
 * App Distribution Integration Storage
 * Local storage for app distribution integrations (until backend is ready)
 */

import type { AppDistributionIntegration } from '~/types/app-distribution';

const STORAGE_KEY = 'delivr_app_distributions';

// In-memory storage map: tenantId -> integrations[]
const distributionStore = new Map<string, AppDistributionIntegration[]>();

/**
 * Initialize storage from localStorage
 */
function initStorage() {
  if (typeof window === 'undefined') return;
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const data = JSON.parse(stored);
      Object.entries(data).forEach(([tenantId, integrations]) => {
        distributionStore.set(tenantId, integrations as AppDistributionIntegration[]);
      });
    }
  } catch (error) {
    console.error('[AppDistributionStorage] Failed to load from localStorage:', error);
  }
}

/**
 * Persist storage to localStorage
 */
function persistStorage() {
  if (typeof window === 'undefined') return;
  
  try {
    const data: Record<string, AppDistributionIntegration[]> = {};
    distributionStore.forEach((integrations, tenantId) => {
      data[tenantId] = integrations;
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('[AppDistributionStorage] Failed to save to localStorage:', error);
  }
}

/**
 * Generate unique ID
 */
export function generateDistributionId(): string {
  return `dist_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Get all distributions for a tenant
 */
export function getDistributionsForTenant(tenantId: string): AppDistributionIntegration[] {
  initStorage();
  return distributionStore.get(tenantId) || [];
}

/**
 * Get distribution by ID
 */
export function getDistributionById(tenantId: string, id: string): AppDistributionIntegration | undefined {
  const distributions = getDistributionsForTenant(tenantId);
  return distributions.find(d => d.id === id);
}

/**
 * Create new distribution
 */
export function createDistribution(distribution: AppDistributionIntegration): AppDistributionIntegration {
  initStorage();
  
  const distributions = getDistributionsForTenant(distribution.tenantId);
  distributions.push(distribution);
  distributionStore.set(distribution.tenantId, distributions);
  
  persistStorage();
  return distribution;
}

/**
 * Update distribution
 */
export function updateDistribution(
  tenantId: string,
  id: string,
  updates: Partial<AppDistributionIntegration>
): AppDistributionIntegration | undefined {
  initStorage();
  
  const distributions = getDistributionsForTenant(tenantId);
  const index = distributions.findIndex(d => d.id === id);
  
  if (index === -1) return undefined;
  
  distributions[index] = {
    ...distributions[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  
  distributionStore.set(tenantId, distributions);
  persistStorage();
  
  return distributions[index];
}

/**
 * Delete distribution
 */
export function deleteDistribution(tenantId: string, id: string): boolean {
  initStorage();
  
  const distributions = getDistributionsForTenant(tenantId);
  const filtered = distributions.filter(d => d.id !== id);
  
  if (filtered.length === distributions.length) return false;
  
  distributionStore.set(tenantId, filtered);
  persistStorage();
  
  return true;
}

/**
 * Get distributions grouped by platform
 */
export function getDistributionsByPlatform(tenantId: string): Record<string, AppDistributionIntegration[]> {
  const distributions = getDistributionsForTenant(tenantId);
  const grouped: Record<string, AppDistributionIntegration[]> = {
    ANDROID: [],
    IOS: [],
  };
  
  distributions.forEach(dist => {
    dist.platforms.forEach(platform => {
      if (!grouped[platform]) grouped[platform] = [];
      grouped[platform].push(dist);
    });
  });
  
  return grouped;
}

/**
 * Clear all distributions for a tenant (for testing)
 */
export function clearDistributionsForTenant(tenantId: string): void {
  distributionStore.delete(tenantId);
  persistStorage();
}

