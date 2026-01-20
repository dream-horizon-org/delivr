/**
 * Permission Constants
 * 
 * Centralized constants for tenant/user permissions.
 * Matches backend permission values from collaborators.permission field.
 */

/**
 * Tenant Role Enum
 * Represents user's permission level in a tenant/organization
 */
export enum TenantRole {
  OWNER = 'Owner',
  EDITOR = 'Editor',
  VIEWER = 'Viewer',
}

/**
 * Permission constants (for backward compatibility and convenience)
 */
export const PERMISSIONS = {
  OWNER: TenantRole.OWNER,
  EDITOR: TenantRole.EDITOR,
  VIEWER: TenantRole.VIEWER,
} as const;

/**
 * Type for tenant role values
 */
export type TenantRoleType = TenantRole | null;


