/**
 * In-Memory Release Store
 * Temporary storage until backend is ready
 * Mimics the structure expected from delivr-server-ota
 */

export interface Release {
  id: string;
  tenantId: string;
  configId?: string; // Reference to configuration used
  
  // Basic details
  version: string;
  releaseType: 'PLANNED' | 'HOTFIX' | 'EMERGENCY';
  baseVersion?: string;
  
  // Dates
  kickoffDate: string;
  releaseDate: string;
  
  // Status
  status: 'DRAFT' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'FAILED';
  
  // Platforms
  platforms: {
    web: boolean;
    playStore: boolean;
    appStore: boolean;
  };
  
  // Configuration snapshot (at time of creation)
  configSnapshot?: any;
  
  // Customizations applied
  customizations?: {
    buildPipelines?: {
      enablePreRegression: boolean;
      enabledPipelineIds: string[];
    };
    testManagement?: {
      enabled: boolean;
      createTestRuns?: boolean;
    };
    communication?: {
      enableSlack: boolean;
      enableEmail: boolean;
    };
  };
  
  // Metadata
  description?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  
  // Progress tracking
  progress?: {
    buildsPending: number;
    buildsCompleted: number;
    testsPending: number;
    testsCompleted: number;
    overallProgress: number; // 0-100
  };
}

// In-memory store
const releaseStore = new Map<string, Map<string, Release>>();

/**
 * Get all releases for an organization
 */
export function getAllReleases(tenantId: string): Release[] {
  const orgReleases = releaseStore.get(tenantId);
  if (!orgReleases) return [];
  
  return Array.from(orgReleases.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

/**
 * Get a specific release by ID
 */
export function getReleaseById(
  tenantId: string,
  releaseId: string
): Release | null {
  const orgReleases = releaseStore.get(tenantId);
  return orgReleases?.get(releaseId) || null;
}

/**
 * Get releases by status
 */
export function getReleasesByStatus(
  tenantId: string,
  status: Release['status']
): Release[] {
  return getAllReleases(tenantId).filter(r => r.status === status);
}

/**
 * Get active releases (in progress)
 */
export function getActiveReleases(tenantId: string): Release[] {
  return getAllReleases(tenantId).filter(r => r.status === 'IN_PROGRESS');
}

/**
 * Get recent releases (last N)
 */
export function getRecentReleases(tenantId: string, limit: number = 10): Release[] {
  return getAllReleases(tenantId).slice(0, limit);
}

/**
 * Create a new release
 */
export function createRelease(
  tenantId: string,
  release: Omit<Release, 'id' | 'createdAt' | 'updatedAt' | 'status' | 'progress'>
): Release {
  let orgReleases = releaseStore.get(tenantId);
  
  if (!orgReleases) {
    orgReleases = new Map();
    releaseStore.set(tenantId, orgReleases);
  }
  
  const now = new Date().toISOString();
  const newRelease: Release = {
    ...release,
    id: `release_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    status: 'DRAFT',
    createdAt: now,
    updatedAt: now,
    progress: {
      buildsPending: 0,
      buildsCompleted: 0,
      testsPending: 0,
      testsCompleted: 0,
      overallProgress: 0,
    },
  };
  
  orgReleases.set(newRelease.id, newRelease);
  
  console.log(`[ReleaseStore] Created release ${newRelease.id} for tenant ${tenantId}`);
  
  return newRelease;
}

/**
 * Update a release
 */
export function updateRelease(
  tenantId: string,
  releaseId: string,
  updates: Partial<Release>
): Release | null {
  const orgReleases = releaseStore.get(tenantId);
  const existing = orgReleases?.get(releaseId);
  
  if (!existing) {
    console.warn(`[ReleaseStore] Release ${releaseId} not found for tenant ${tenantId}`);
    return null;
  }
  
  const updated: Release = {
    ...existing,
    ...updates,
    id: existing.id,
    createdAt: existing.createdAt,
    updatedAt: new Date().toISOString(),
  };
  
  orgReleases?.set(releaseId, updated);
  
  console.log(`[ReleaseStore] Updated release ${releaseId} for tenant ${tenantId}`);
  
  return updated;
}

/**
 * Delete a release
 */
export function deleteRelease(tenantId: string, releaseId: string): boolean {
  const orgReleases = releaseStore.get(tenantId);
  const deleted = orgReleases?.delete(releaseId) || false;
  
  if (deleted) {
    console.log(`[ReleaseStore] Deleted release ${releaseId} for tenant ${tenantId}`);
  } else {
    console.warn(`[ReleaseStore] Release ${releaseId} not found for tenant ${tenantId}`);
  }
  
  return deleted;
}

/**
 * Start a release (change status to IN_PROGRESS)
 */
export function startRelease(tenantId: string, releaseId: string): Release | null {
  return updateRelease(tenantId, releaseId, {
    status: 'IN_PROGRESS',
    updatedAt: new Date().toISOString(),
  });
}

/**
 * Complete a release
 */
export function completeRelease(tenantId: string, releaseId: string): Release | null {
  return updateRelease(tenantId, releaseId, {
    status: 'COMPLETED',
    updatedAt: new Date().toISOString(),
    progress: {
      buildsPending: 0,
      buildsCompleted: 100,
      testsPending: 0,
      testsCompleted: 100,
      overallProgress: 100,
    },
  });
}

/**
 * Cancel a release
 */
export function cancelRelease(tenantId: string, releaseId: string): Release | null {
  return updateRelease(tenantId, releaseId, {
    status: 'CANCELLED',
    updatedAt: new Date().toISOString(),
  });
}

/**
 * Update release progress
 */
export function updateReleaseProgress(
  tenantId: string,
  releaseId: string,
  progress: Partial<Release['progress']>
): Release | null {
  const existing = getReleaseById(tenantId, releaseId);
  if (!existing) return null;
  
  return updateRelease(tenantId, releaseId, {
    progress: {
      ...existing.progress!,
      ...progress,
    },
  });
}

/**
 * Get release statistics
 */
export function getReleaseStats(tenantId: string) {
  const releases = getAllReleases(tenantId);
  
  return {
    total: releases.length,
    inProgress: releases.filter(r => r.status === 'IN_PROGRESS').length,
    completed: releases.filter(r => r.status === 'COMPLETED').length,
    draft: releases.filter(r => r.status === 'DRAFT').length,
    cancelled: releases.filter(r => r.status === 'CANCELLED').length,
    failed: releases.filter(r => r.status === 'FAILED').length,
  };
}

/**
 * Get release analytics
 */
export function getReleaseAnalytics(tenantId: string) {
  const releases = getAllReleases(tenantId);
  const completed = releases.filter(r => r.status === 'COMPLETED');
  
  // Calculate success rate
  const total = releases.filter(
    r => r.status === 'COMPLETED' || r.status === 'FAILED' || r.status === 'CANCELLED'
  ).length;
  const successful = completed.length;
  const successRate = total > 0 ? Math.round((successful / total) * 100) : 0;
  
  // Platform distribution
  const platformCount = {
    web: releases.filter(r => r.platforms.web).length,
    playStore: releases.filter(r => r.platforms.playStore).length,
    appStore: releases.filter(r => r.platforms.appStore).length,
  };
  
  return {
    totalReleases: releases.length,
    activeReleases: releases.filter(r => r.status === 'IN_PROGRESS').length,
    completedReleases: completed.length,
    successRate,
    platformDistribution: platformCount,
    avgCycleTime: '3.2 days', // Mock for now
  };
}

/**
 * Clear all releases for a tenant (for testing)
 */
export function clearTenantReleases(tenantId: string): void {
  releaseStore.delete(tenantId);
  console.log(`[ReleaseStore] Cleared all releases for tenant ${tenantId}`);
}

/**
 * Get store statistics (for debugging)
 */
export function getStoreStats() {
  return {
    tenants: releaseStore.size,
    totalReleases: Array.from(releaseStore.values()).reduce(
      (sum, orgReleases) => sum + orgReleases.size,
      0
    ),
  };
}

