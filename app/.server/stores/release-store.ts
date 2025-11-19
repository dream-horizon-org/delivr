/**
 * Release Store (Server-side)
 * In-memory storage for releases until real database is integrated
 * Matches old UI data structure
 */

import type { Release, CreateReleaseInput, UpdateReleaseInput, ReleaseFilters } from '~/types/release';

// In-memory store
const releases = new Map<string, Release>();

// Counter for release keys
let releaseCounter = 1;

/**
 * Generate unique release ID
 */
function generateReleaseId(): string {
  return `rel_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Generate release key (e.g., R-2024-01)
 */
function generateReleaseKey(): string {
  const year = new Date().getFullYear();
  const number = String(releaseCounter++).padStart(2, '0');
  return `R-${year}-${number}`;
}

/**
 * Get all releases for a tenant
 */
export function getAllReleases(
  tenantId: string,
  filters?: ReleaseFilters
): Release[] {
  let results = Array.from(releases.values())
    .filter(r => r.tenantId === tenantId);
  
  // Apply filters
  if (filters) {
    if (filters.status && filters.status.length > 0) {
      results = results.filter(r => filters.status!.includes(r.status));
    }
    
    if (filters.releaseType && filters.releaseType.length > 0) {
      results = results.filter(r => filters.releaseType!.includes(r.releaseType));
    }
    
    if (filters.fromDate) {
      results = results.filter(r => 
        new Date(r.releaseDate) >= new Date(filters.fromDate!)
      );
    }
    
    if (filters.toDate) {
      results = results.filter(r => 
        new Date(r.releaseDate) <= new Date(filters.toDate!)
      );
    }
    
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      results = results.filter(r => 
        r.releaseKey.toLowerCase().includes(query) ||
        r.version.toLowerCase().includes(query) ||
        r.description?.toLowerCase().includes(query)
      );
    }
  }
  
  // Sort by releaseDate descending (newest first)
  results.sort((a, b) => 
    new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime()
  );
  
  return results;
}

/**
 * Get single release by ID
 */
export function getRelease(releaseId: string): Release | null {
  return releases.get(releaseId) || null;
}

/**
 * Create new release from old UI format
 */
export function createRelease(input: CreateReleaseInput): Release {
  const now = new Date().toISOString();
  
  // Create user object from createdBy string
  const createdByUser = {
    id: input.createdBy || 'system',
    name: 'Current User', // TODO: Get from auth context
    email: 'user@example.com', // TODO: Get from auth context
  };
  
  const release: Release = {
    id: generateReleaseId(),
    tenantId: input.tenantId,
    releaseKey: generateReleaseKey(),
    version: input.version,
    releaseType: input.releaseType,
    description: input.description,
    baseVersion: input.baseVersion,
    configId: input.configId,
    customizations: input.customizations,
    platforms: input.platforms,
    kickoffDate: input.kickoffDate,
    releaseDate: input.releaseDate,
    plannedDate: input.releaseDate, // Use releaseDate as plannedDate
    status: 'KICKOFF_PENDING',
    createdBy: createdByUser,
    lastUpdatedBy: createdByUser,
    createdAt: now,
    updatedAt: now,
    userAdoption: {
      ios: 0,
      android: 0,
      web: 0,
    },
  };
  
  releases.set(release.id, release);
  console.log(`[ReleaseStore] Created release: ${release.id} - ${release.releaseKey} v${release.version}`);
  
  return release;
}

/**
 * Update existing release
 */
export function updateRelease(input: UpdateReleaseInput): Release | null {
  const existing = releases.get(input.id);
  
  if (!existing) {
    console.error(`[ReleaseStore] Release not found: ${input.id}`);
    return null;
  }
  
  const updated: Release = {
    ...existing,
    ...input,
    updatedAt: new Date().toISOString(),
  };
  
  releases.set(updated.id, updated);
  console.log(`[ReleaseStore] Updated release: ${updated.id}`);
  
  return updated;
}

/**
 * Delete release
 */
export function deleteRelease(releaseId: string): boolean {
  const existed = releases.delete(releaseId);
  
  if (existed) {
    console.log(`[ReleaseStore] Deleted release: ${releaseId}`);
  } else {
    console.error(`[ReleaseStore] Release not found for deletion: ${releaseId}`);
  }
  
  return existed;
}

/**
 * Get release statistics for tenant
 */
export function getReleaseStats(tenantId: string) {
  const tenantReleases = Array.from(releases.values())
    .filter(r => r.tenantId === tenantId);
  
  return {
    total: tenantReleases.length,
    byStatus: {
      kickoffPending: tenantReleases.filter(r => r.status === 'KICKOFF_PENDING').length,
      pending: tenantReleases.filter(r => r.status === 'PENDING').length,
      started: tenantReleases.filter(r => r.status === 'STARTED').length,
      regressionInProgress: tenantReleases.filter(r => r.status === 'REGRESSION_IN_PROGRESS').length,
      buildSubmitted: tenantReleases.filter(r => r.status === 'BUILD_SUBMITTED').length,
      released: tenantReleases.filter(r => r.status === 'RELEASED').length,
      cancelled: tenantReleases.filter(r => r.status === 'CANCELLED').length,
      archived: tenantReleases.filter(r => r.status === 'ARCHIVED').length,
    },
    byType: {
      planned: tenantReleases.filter(r => r.releaseType === 'PLANNED').length,
      hotfix: tenantReleases.filter(r => r.releaseType === 'HOTFIX').length,
      major: tenantReleases.filter(r => r.releaseType === 'MAJOR').length,
    },
  };
}

/**
 * Get upcoming releases (not released yet)
 */
export function getUpcomingReleases(tenantId: string): Release[] {
  const now = new Date();
  
  return Array.from(releases.values())
    .filter(r => 
      r.tenantId === tenantId &&
      r.status !== 'RELEASED' &&
      r.status !== 'CANCELLED' &&
      r.status !== 'ARCHIVED' &&
      new Date(r.releaseDate) >= now
    )
    .sort((a, b) => 
      new Date(a.releaseDate).getTime() - new Date(b.releaseDate).getTime()
    );
}

/**
 * Get analytics for dashboard
 */
export function getReleaseAnalytics(tenantId: string) {
  const tenantReleases = Array.from(releases.values())
    .filter(r => r.tenantId === tenantId);
  
  const activeReleases = tenantReleases.filter(r => 
    r.status === 'STARTED' || 
    r.status === 'REGRESSION_IN_PROGRESS' ||
    r.status === 'KICKOFF_PENDING'
  );
  
  const completedReleases = tenantReleases.filter(r => r.status === 'RELEASED');
  const upcomingReleases = getUpcomingReleases(tenantId);
  
  // Calculate success rate
  const totalFinished = tenantReleases.filter(r => 
    r.status === 'RELEASED' || r.status === 'CANCELLED'
  ).length;
  const successRate = totalFinished > 0 
    ? Math.round((completedReleases.length / totalFinished) * 100)
    : 0;
  
  return {
    totalReleases: tenantReleases.length,
    activeReleases: activeReleases.length,
    completedReleases: completedReleases.length,
    upcomingReleases: upcomingReleases.length,
    successRate,
    avgCycleTime: '14 days', // Mock for now - TODO: Calculate actual
  };
}

/**
 * Clear all releases (for testing)
 */
export function clearAllReleases(): void {
  releases.clear();
  releaseCounter = 1;
  console.log('[ReleaseStore] Cleared all releases');
}

/**
 * Seed mock data for development
 */
export function seedMockReleases(tenantId: string): void {
  const mockData: CreateReleaseInput[] = [
    {
      tenantId,
      version: '2.5.0',
      releaseType: 'PLANNED',
      kickoffDate: new Date('2024-01-15').toISOString(),
      releaseDate: new Date('2024-01-30').toISOString(),
      description: 'Q1 2024 Feature Release',
      platforms: { web: true, playStore: true, appStore: true },
      createdBy: 'system',
    },
    {
      tenantId,
      version: '2.4.2',
      releaseType: 'HOTFIX',
      kickoffDate: new Date('2024-01-05').toISOString(),
      releaseDate: new Date('2024-01-08').toISOString(),
      description: 'Critical bug fixes',
      platforms: { web: true, playStore: true, appStore: false },
      createdBy: 'system',
    },
  ];
  
  mockData.forEach(data => {
    const release = createRelease(data);
    // Update status for variety
    if (release.version === '2.4.2') {
      updateRelease({ id: release.id, status: 'RELEASED' });
    } else {
      updateRelease({ id: release.id, status: 'STARTED' });
    }
  });
  
  console.log(`[ReleaseStore] Seeded ${mockData.length} mock releases for ${tenantId}`);
}
