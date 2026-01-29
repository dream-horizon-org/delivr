/**
 * Server-Side Permission Utilities
 * 
 * This file is server-only (Remix automatically excludes .server.ts files from client bundle)
 * Uses CodepushService directly - no API calls needed
 */

import { AppLevelRole, type AppLevelRoleType } from '~/constants/permissions';
import { CodepushService } from '~/.server/services/Codepush';

/**
 * Permission Service - Server-side only
 * Uses CodepushService directly (no API call, no network error)
 */
export const PermissionService = {
  /**
   * Get user's role for a tenant (server-side only)
   */
  async getAppLevelRole(appId: string, userId: string): Promise<AppLevelRoleType> {
    try {
      const response = await CodepushService.getApps(userId);
      const body = response?.data as Record<string, unknown> | null | undefined;
      if (!body) {
        console.warn('[PermissionService] Failed to fetch tenants from service');
        return null;
      }

      // Backend may return { data: { apps, organisations } } or { organisations }
      const payload = (body.data ?? body) as Record<string, unknown>;
      const apps = Array.isArray(payload?.apps) ? payload.apps : [];
      const orgs = Array.isArray(payload?.organisations) ? payload.organisations : [];
      const list = [...apps, ...orgs];

      const app = list.find((o: { id: string }) => o.id === appId);
      if (!app) {
        console.warn(`[PermissionService] Organization ${appId} not found`);
        return null;
      }
      
      // Map role (handle Collaborator -> Viewer)
      if (app.role === 'Collaborator') return AppLevelRole.VIEWER;
      if (app.role === AppLevelRole.OWNER) return AppLevelRole.OWNER;
      if (app.role === AppLevelRole.EDITOR) return AppLevelRole.EDITOR;
      if (app.role === AppLevelRole.VIEWER) return AppLevelRole.VIEWER;
      return AppLevelRole.VIEWER; // Fallback
    } catch (error) {
      console.error('[PermissionService] Error fetching tenant role:', error);
      return null;
    }
  },

  /**
   * Check if user is tenant owner (server-side only)
   */
  async isAppOwner(appId: string, userId: string): Promise<boolean> {
    try {
      const role = await this.getAppLevelRole(appId, userId);
      return role === AppLevelRole.OWNER;
    } catch (error) {
      console.error('[PermissionService] Error checking tenant owner:', error);
      return false; // Fail closed
    }
  },

  /**
   * Check if user is tenant editor or owner (server-side only)
   */
  async isAppEditor(appId: string, userId: string): Promise<boolean> {
    try {
      const role = await this.getAppLevelRole(appId, userId);
      return role === AppLevelRole.EDITOR || role === AppLevelRole.OWNER;
    } catch (error) {
      console.error('[PermissionService] Error checking tenant editor:', error);
      return false; // Fail closed
    }
  },

  /**
   * Check if user is release pilot (synchronous - no API call needed)
   */
  isReleasePilot(releasePilotAccountId: string | null, userId: string): boolean {
    return releasePilotAccountId === userId;
  },

  /**
   * Check if user can perform release actions (server-side only)
   * Release actions can be performed by:
   * - Release pilot, OR
   * - Tenant owner
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

    // Check tenant owner (async)
    return await this.isAppOwner(appId, userId);
  },
};

