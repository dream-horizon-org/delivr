/**
 * Simple Permission Utilities
 * 
 * Reuses existing org list data - no duplicate API calls!
 * All functions work with the Organization type from getOrgList.
 * 
 * For use in loaders/actions (server-side), use the async functions that fetch org list.
 * For use in components (client-side), use the hook usePermissions().
 */

import { TenantRole, type TenantRoleType } from '~/constants/permissions';
import { apiGet } from '~/utils/api-client';
import { route } from 'routes-gen';
import type { TenantsResponse } from '~/.server/services/Codepush/types';

export interface OrganizationWithRole {
  id: string;
  role: TenantRole;
}

/**
 * Get user's role for a tenant from existing org list
 */
export function getTenantRole(
  orgs: OrganizationWithRole[],
  tenantId: string
): TenantRoleType {
  const org = orgs.find((o) => o.id === tenantId);
  return org?.role ?? null;
}

/**
 * Check if user is tenant owner
 */
export function isTenantOwner(
  orgs: OrganizationWithRole[],
  tenantId: string
): boolean {
  const org = orgs.find((o) => o.id === tenantId);
  return org?.role === TenantRole.OWNER;
}

/**
 * Check if user is tenant editor or owner
 */
export function isTenantEditor(
  orgs: OrganizationWithRole[],
  tenantId: string
): boolean {
  const org = orgs.find((o) => o.id === tenantId);
  return org?.role === TenantRole.EDITOR || org?.role === TenantRole.OWNER;
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
 * - Tenant owner
 */
export function canPerformReleaseAction(
  orgs: OrganizationWithRole[],
  tenantId: string,
  userId: string,
  releasePilotAccountId: string | null
): boolean {
  // Check release pilot (synchronous)
  if (isReleasePilot(releasePilotAccountId, userId)) {
    return true;
  }

  // Check tenant owner (from existing org list)
  return isTenantOwner(orgs, tenantId);
}

// ============================================================================
// ASYNC FUNCTIONS FOR SERVER-SIDE USE (Loaders/Actions)
// ============================================================================

/**
 * Permission Service - Async functions for server-side use
 * These functions fetch org list from API and check permissions
 */
export const PermissionService = {
  /**
   * Get user's role for a tenant (async - fetches from API)
   */
  async getTenantRole(tenantId: string, userId: string): Promise<TenantRoleType> {
    try {
      const result = await apiGet<TenantsResponse>(route('/api/v1/tenants'));
      if (!result.success || !result.data) {
        return null;
      }
      const org = result.data.organisations.find((o) => o.id === tenantId);
      if (!org) return null;
      
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
   * Check if user is tenant owner (async)
   */
  async isTenantOwner(tenantId: string, userId: string): Promise<boolean> {
    const role = await this.getTenantRole(tenantId, userId);
    return role === TenantRole.OWNER;
  },

  /**
   * Check if user is tenant editor or owner (async)
   */
  async isTenantEditor(tenantId: string, userId: string): Promise<boolean> {
    const role = await this.getTenantRole(tenantId, userId);
    return role === TenantRole.EDITOR || role === TenantRole.OWNER;
  },

  /**
   * Check if user is release pilot (synchronous - no API call needed)
   */
  isReleasePilot(releasePilotAccountId: string | null, userId: string): boolean {
    return releasePilotAccountId === userId;
  },

  /**
   * Check if user can perform release actions (async)
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

