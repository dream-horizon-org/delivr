/**
 * Configuration Cache Utility
 * Client-side caching for release configurations
 */

import type { ReleaseConfiguration } from '~/types/release-config';

const CACHE_KEY_PREFIX = 'delivr_config_cache';
const CACHE_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes

interface CacheEntry {
  data: ReleaseConfiguration[];
  timestamp: number;
}

/**
 * Save configurations to cache
 */
export function cacheConfigurations(
  organizationId: string,
  configurations: ReleaseConfiguration[]
): void {
  if (typeof window === 'undefined') return;
  
  try {
    const cacheEntry: CacheEntry = {
      data: configurations,
      timestamp: Date.now(),
    };
    
    const key = `${CACHE_KEY_PREFIX}_${organizationId}`;
    localStorage.setItem(key, JSON.stringify(cacheEntry));
    console.log(`[Cache] Saved ${configurations.length} configurations`);
  } catch (error) {
    console.error('[Cache] Failed to save:', error);
  }
}

/**
 * Load configurations from cache
 * Returns null if cache is expired or doesn't exist
 */
export function loadCachedConfigurations(
  organizationId: string
): ReleaseConfiguration[] | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const key = `${CACHE_KEY_PREFIX}_${organizationId}`;
    const cached = localStorage.getItem(key);
    
    if (!cached) return null;
    
    const cacheEntry: CacheEntry = JSON.parse(cached);
    const age = Date.now() - cacheEntry.timestamp;
    
    // Check if cache is expired
    if (age > CACHE_EXPIRY_MS) {
      console.log('[Cache] Expired, removing');
      localStorage.removeItem(key);
      return null;
    }
    
    console.log(`[Cache] Loaded ${cacheEntry.data.length} configurations (age: ${Math.round(age / 1000)}s)`);
    return cacheEntry.data;
  } catch (error) {
    console.error('[Cache] Failed to load:', error);
    return null;
  }
}

/**
 * Add a single configuration to cache
 */
export function addConfigToCache(
  organizationId: string,
  config: ReleaseConfiguration
): void {
  const cached = loadCachedConfigurations(organizationId);
  if (!cached) {
    // If no cache, just save this one
    cacheConfigurations(organizationId, [config]);
  } else {
    // Add or update in cache
    const index = cached.findIndex(c => c.id === config.id);
    if (index >= 0) {
      cached[index] = config;
    } else {
      cached.push(config);
    }
    cacheConfigurations(organizationId, cached);
  }
}

/**
 * Update a configuration in cache
 */
export function updateConfigInCache(
  organizationId: string,
  configId: string,
  updates: Partial<ReleaseConfiguration>
): void {
  const cached = loadCachedConfigurations(organizationId);
  if (!cached) return;
  
  const index = cached.findIndex(c => c.id === configId);
  if (index >= 0) {
    cached[index] = { ...cached[index], ...updates };
    cacheConfigurations(organizationId, cached);
  }
}

/**
 * Remove a configuration from cache
 */
export function removeConfigFromCache(
  organizationId: string,
  configId: string
): void {
  const cached = loadCachedConfigurations(organizationId);
  if (!cached) return;
  
  const filtered = cached.filter(c => c.id !== configId);
  cacheConfigurations(organizationId, filtered);
}

/**
 * Clear all configuration cache
 */
export function clearConfigCache(organizationId: string): void {
  if (typeof window === 'undefined') return;
  
  try {
    const key = `${CACHE_KEY_PREFIX}_${organizationId}`;
    localStorage.removeItem(key);
    console.log('[Cache] Cleared');
  } catch (error) {
    console.error('[Cache] Failed to clear:', error);
  }
}

/**
 * Invalidate cache (force refresh on next load)
 */
export function invalidateConfigCache(organizationId: string): void {
  clearConfigCache(organizationId);
}

