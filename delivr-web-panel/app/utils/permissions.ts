/**
 * Simple Permission Utilities
 * 
 * Reuses existing app list data - no duplicate API calls!
 * All functions work with the App type from getAppList.
 * 
 * For use in loaders/actions (server-side), use the async functions that fetch app list.
 * For use in components (client-side), use the hook usePermissions().
 */

import { AppLevelRole, type AppLevelRoleType } from '~/constants/permissions';
import { apiGet } from '~/utils/api-client';

// Local type definition to avoid importing from server-only module
type AppWithRole = {
  id: string;
  role: 'Owner' | 'Editor' | 'Viewer' | 'Collaborator';
};

type AppsResponse = {
  apps?: AppWithRole[];
  organisations?: AppWithRole[]; // Legacy support
};

export interface AppWithRoleType {
  id: string;
  role: AppLevelRole;
}

/**
 * Legacy type alias for backward compatibility
 * @deprecated Use AppWithRoleType instead
 */
export interface OrganizationWithRole extends AppWithRoleType {}

/**
 * Get user's role for an app from existing app list
 */
export function getAppRole(
  apps: AppWithRoleType[],
  appId: string
): AppLevelRoleType {
  const app = apps.find((a) => a.id === appId);
  return app?.role ?? null;
}

/**
 * Check if user is app owner
 */
export function isAppOwner(
  apps: AppWithRoleType[],
  appId: string
): boolean {
  const app = apps.find((a) => a.id === appId);
  return app?.role === AppLevelRole.OWNER;
}

/**
 * Check if user is app editor or owner
 */
export function isAppEditor(
  apps: AppWithRoleType[],
  appId: string
): boolean {
  const app = apps.find((a) => a.id === appId);
  return app?.role === AppLevelRole.EDITOR || app?.role === AppLevelRole.OWNER;
}

/**
 * Legacy functions for backward compatibility
 * @deprecated Use getAppRole, isAppOwner, isAppEditor instead
 */
export function getAppLevelRole(
  apps: AppWithRoleType[],
  appId: string
): AppLevelRoleType {
  return getAppRole(apps, appId);
}

export function isTenantOwner(
  apps: AppWithRoleType[],
  appId: string
): boolean {
  return isAppOwner(apps, appId);
}

export function isTenantEditor(
  apps: AppWithRoleType[],
  appId: string
): boolean {
  return isAppEditor(apps, appId);
}

/**
 * Check if user is release pilot
 * Synchronous - no API call needed
 */
export function isReleasePilot(
  releasePilotAccountId: string | null,
  userId: string
): boolean {
  return releasePilotAccountId === userId;
}

/**
 * Check if user can perform release actions
 * Release actions can be performed by:
 * - Release pilot, OR
 * - App owner
 */
export function canPerformReleaseAction(
  apps: AppWithRoleType[],
  appId: string,
  userId: string,
  releasePilotAccountId: string | null
): boolean {
  // Check release pilot (synchronous)
  if (isReleasePilot(releasePilotAccountId, userId)) {
    return true;
  }

  // Check app owner (from existing app list)
  return isAppOwner(apps, appId);
}

// ============================================================================
// CLIENT-SIDE PERMISSION SERVICE (for use in components)
// ============================================================================

/**
 * Permission Service - Client-side only
 * Uses authenticated API route (works with cookies)
 * 
 * NOTE: For server-side use (loaders/actions), import from '~/utils/permissions.server'
 */
export const PermissionService = {
  /**
   * Get user's role for an app (client-side only - uses API route)
   */
  async getAppRole(appId: string, userId: string): Promise<AppLevelRoleType> {
    try {
      const result = await apiGet<AppsResponse>('/api/v1/apps');
      if (!result.success || !result.data) {
        console.warn('[PermissionService] Failed to fetch apps from API');
        return null;
      }
      
      const apps = result.data.apps || result.data.organisations || [];
      const app = apps.find((a) => a.id === appId);
      if (!app) {
        console.warn(`[PermissionService] App ${appId} not found`);
        return null;
      }
      
      // Map role (handle Collaborator -> Viewer)
      if (app.role === 'Collaborator') return AppLevelRole.VIEWER;
      if (app.role === AppLevelRole.OWNER) return AppLevelRole.OWNER;
      if (app.role === AppLevelRole.EDITOR) return AppLevelRole.EDITOR;
      if (app.role === AppLevelRole.VIEWER) return AppLevelRole.VIEWER;
      return AppLevelRole.VIEWER; // Fallback
    } catch (error) {
      console.error('[PermissionService] Error fetching app role:', error);
      return null;
    }
  },

  /**
   * Check if user is app owner (client-side only)
   */
  async isAppOwner(appId: string, userId: string): Promise<boolean> {
    try {
      const role = await this.getAppRole(appId, userId);
      return role === AppLevelRole.OWNER;
    } catch (error) {
      console.error('[PermissionService] Error checking app owner:', error);
      return false; // Fail closed
    }
  },

  /**
   * Check if user is app editor or owner (client-side only)
   */
  async isAppEditor(appId: string, userId: string): Promise<boolean> {
    try {
      const role = await this.getAppRole(appId, userId);
      return role === AppLevelRole.EDITOR || role === AppLevelRole.OWNER;
    } catch (error) {
      console.error('[PermissionService] Error checking app editor:', error);
      return false; // Fail closed
    }
  },

  /**
   * Legacy methods for backward compatibility
   * @deprecated Use getAppRole, isAppOwner, isAppEditor instead
   */
  async getAppLevelRole(appId: string, userId: string): Promise<AppLevelRoleType> {
    return this.getAppRole(appId, userId);
  },

  async isTenantOwner(appId: string, userId: string): Promise<boolean> {
    return this.isAppOwner(appId, userId);
  },

  async isTenantEditor(appId: string, userId: string): Promise<boolean> {
    return this.isAppEditor(appId, userId);
  },

  /**
   * Check if user is release pilot (synchronous - no API call needed)
   */
  isReleasePilot(releasePilotAccountId: string | null, userId: string): boolean {
    return releasePilotAccountId === userId;
  },

  /**
   * Check if user can perform release actions (client-side only)
   * Release actions can be performed by:
   * - Release pilot, OR
   * - App owner
   */
  async canPerformReleaseAction(
    appId: string,
    userId: string,
    releasePilotAccountId: string | null
  ): Promise<boolean> {
    // Check release pilot (synchronous)
    if (this.isReleasePilot(releasePilotAccountId, userId)) {
      return true;
    }

    // Check app owner (async)
    return await this.isAppOwner(appId, userId);
  },
};

