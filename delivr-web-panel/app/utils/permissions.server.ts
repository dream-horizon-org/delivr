/**
 * Server-Side Permission Utilities
 * 
 * This file is server-only (Remix automatically excludes .server.ts files from client bundle)
 * Uses CodepushService directly - no API calls needed
 */

import { TenantRole, type TenantRoleType } from '~/constants/permissions';
import { CodepushService } from '~/.server/services/Codepush';
import type { TenantsResponse } from '~/.server/services/Codepush/types';

/**
 * Permission Service - Server-side only
 * Uses CodepushService directly (no API call, no network error)
 */
export const PermissionService = {
  /**
   * Get user's role for a tenant (server-side only)
   */
  async getTenantRole(tenantId: string, userId: string): Promise<TenantRoleType> {
    try {
      const response = await CodepushService.getTenants(userId);
      if (!response.data) {
        console.warn('[PermissionService] Failed to fetch tenants from service');
        return null;
      }
      
      const org = response.data.organisations.find((o) => o.id === tenantId);
      if (!org) {
        console.warn(`[PermissionService] Organization ${tenantId} not found`);
        return null;
      }
      
      // Map role (handle Collaborator -> Viewer)
      if (org.role === 'Collaborator') return TenantRole.VIEWER;
      if (org.role === TenantRole.OWNER) return TenantRole.OWNER;
      if (org.role === TenantRole.EDITOR) return TenantRole.EDITOR;
      if (org.role === TenantRole.VIEWER) return TenantRole.VIEWER;
      return TenantRole.VIEWER; // Fallback
    } catch (error) {
      console.error('[PermissionService] Error fetching tenant role:', error);
      return null;
    }
  },

  /**
   * Check if user is tenant owner (server-side only)
   */
  async isTenantOwner(tenantId: string, userId: string): Promise<boolean> {
    try {
      const role = await this.getTenantRole(tenantId, userId);
      return role === TenantRole.OWNER;
    } catch (error) {
      console.error('[PermissionService] Error checking tenant owner:', error);
      return false; // Fail closed
    }
  },

  /**
   * Check if user is tenant editor or owner (server-side only)
   */
  async isTenantEditor(tenantId: string, userId: string): Promise<boolean> {
    try {
      const role = await this.getTenantRole(tenantId, userId);
      return role === TenantRole.EDITOR || role === TenantRole.OWNER;
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
    tenantId: string,
    userId: string,
    releasePilotAccountId: string | null
  ): Promise<boolean> {
    // Check release pilot (synchronous)
    if (this.isReleasePilot(releasePilotAccountId, userId)) {
      return true;
    }

    // Check tenant owner (async)
    return await this.isTenantOwner(tenantId, userId);
  },
};

